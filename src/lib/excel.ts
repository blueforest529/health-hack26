import type { Item, ItemType, Patient, State } from '../data/types';
import { addDays, dayKey, fmtDate, fmtDateTime, normAsset, statusOf, uid } from './format';

export type Problem = { row: number; asset: string; kind: 'noAsset' | 'dup' | 'badDate' | 'noMrn'; value?: string };
export type ImportPlan = {
  file: string;
  items: Item[];
  patients: Patient[];
  added: number;
  updated: number;
  problems: Problem[];
};

type Rec = { row: number; asset: string; name: string; type: ItemType; serial?: string; home?: string; status?: string; mrn?: string; pname?: string; ward?: string; due?: string; lent?: string };

const HEAD: [keyof Rec, RegExp][] = [
  ['asset', /^(asset|asset ?no\.?|asset number|item ?no\.?|no\.?|id|tag)$/i],
  ['serial', /serial|hc ?21|s\/n/i],
  ['mrn', /mrn|hospital ?(no|number)|patient ?(no|number|id)/i],
  ['pname', /^(patient|patient name|name of patient|client)$/i],
  ['name', /^(item|equipment|description|item name|model|product)/i],
  ['type', /^(type|category|equipment type)$/i],
  ['status', /status|state|location status/i],
  ['home', /home|storage|store/i],
  ['ward', /ward|location|unit/i],
  ['due', /due|return (by|date)|expected return/i],
  ['lent', /issued|date (out|lent|issued)|lent|loan date/i],
];

function inferType(...hints: (string | undefined)[]): ItemType {
  const s = hints.filter(Boolean).join(' ').toLowerCase();
  if (/wheel ?chair|azalea|rea\b/.test(s)) return 'wheelchair';
  if (/cushion|pressure/.test(s)) return 'cushion';
  if (/leg/.test(s)) return 'legrest';
  if (/head/.test(s)) return 'headrest';
  if (/slid|transfer board|board/.test(s)) return 'slidingboard';
  return 'other';
}

function cellText(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return dayKey(v);
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join('');
    if (o.text) return String(o.text);
    if (o.result != null) return cellText(o.result);
  }
  return String(v).trim();
}

/** Accepts Excel dates, 24/10/2026, 24/10/26, 2026-10-24. Returns YYYY-MM-DD or null. */
function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return dayKey(v);
  const s = cellText(v);
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const d = +m[1], mo = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dayKey(dt);
  }
  return null;
}

export async function readTracker(file: File, current: State): Promise<ImportPlan> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const recs: Rec[] = [];
  const problems: Problem[] = [];
  wb.eachSheet((ws) => {
    // header = first row (of the first 10) that has an asset-like column
    let headerRow = 0;
    let map: Partial<Record<keyof Rec, number>> = {};
    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
      const m: Partial<Record<keyof Rec, number>> = {};
      ws.getRow(r).eachCell((c, col) => {
        const h = cellText(c.value);
        for (const [k, re] of HEAD) if (m[k] == null && re.test(h)) { m[k] = col; break; }
      });
      if (m.asset != null || (m.name != null && m.serial != null)) { headerRow = r; map = m; break; }
    }
    if (!headerRow) return;
    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (k: keyof Rec) => (map[k] != null ? row.getCell(map[k]!).value : undefined);
      const asset = normAsset(cellText(get('asset')));
      const name = cellText(get('name'));
      const any = [asset, name, cellText(get('serial')), cellText(get('mrn'))].some(Boolean);
      if (!any) continue;
      if (!asset) { problems.push({ row: r, asset: '', kind: 'noAsset' }); continue; }
      const rawDue = get('due');
      let due: string | undefined;
      if (cellText(rawDue)) {
        const d = parseDate(rawDue);
        if (d) due = d;
        else { problems.push({ row: r, asset, kind: 'badDate', value: cellText(rawDue) }); due = addDays(14); }
      }
      recs.push({
        row: r, asset,
        name: name || cellText(get('type')) || ws.name,
        type: inferType(cellText(get('type')), name, ws.name),
        serial: cellText(get('serial')) || undefined,
        home: cellText(get('home')) || undefined,
        status: cellText(get('status')) || undefined,
        mrn: cellText(get('mrn')).replace(/\D/g, '') || undefined,
        pname: cellText(get('pname')) || undefined,
        ward: cellText(get('ward')) || undefined,
        due,
        lent: parseDate(get('lent')) ?? undefined,
      });
    }
  });

  // build next state
  const patients = [...current.patients];
  const byMrn = new Map(patients.map((p) => [p.mrn, p]));
  const items = [...current.items];
  const byAsset = new Map(items.map((i, idx) => [i.asset, idx]));
  const seen = new Set<string>();
  let added = 0, updated = 0;

  for (const r of recs) {
    if (seen.has(r.asset)) { problems.push({ row: r.row, asset: r.asset, kind: 'dup' }); continue; }
    seen.add(r.asset);
    const statusText = (r.status ?? '').toLowerCase();
    const looksOut = !!r.mrn || /loan|patient|issued|out|ward/.test(statusText);
    let loan: Item['loan'];
    if (looksOut && r.mrn) {
      let p = byMrn.get(r.mrn);
      if (!p) {
        p = { id: uid(), mrn: r.mrn, name: r.pname || `Patient ${r.mrn.slice(-3)}`, ward: r.ward || 'Unknown ward' };
        patients.push(p);
        byMrn.set(r.mrn, p);
      }
      loan = { patientId: p.id, lentAt: (r.lent ? new Date(r.lent + 'T09:00:00') : new Date()).toISOString(), due: r.due ?? addDays(14), staff: 'Excel import' };
    } else if (looksOut && !r.mrn && /loan|patient|issued/.test(statusText)) {
      problems.push({ row: r.row, asset: r.asset, kind: 'noMrn' });
    }
    const idx = byAsset.get(r.asset);
    if (idx == null) {
      items.push({ id: uid(), asset: r.asset, name: r.name, type: r.type, serial: r.serial, home: r.home || 'OT Dept storage', loan });
      byAsset.set(r.asset, items.length - 1);
      added++;
    } else {
      const old = items[idx];
      const next: Item = { ...old, name: r.name || old.name, type: r.type !== 'other' ? r.type : old.type, serial: r.serial ?? old.serial, home: r.home ?? old.home, loan };
      const oldLoan = old.loan ? `${byIdMrn(current.patients, old.loan.patientId)}|${old.loan.due}` : '';
      const newLoan = loan ? `${r.mrn}|${loan.due}` : '';
      if (next.name !== old.name || next.type !== old.type || next.serial !== old.serial || oldLoan !== newLoan) updated++;
      // keep the original loan timestamp when the same patient still has it
      if (old.loan && loan && oldLoan.split('|')[0] === r.mrn) next.loan = { ...loan, lentAt: old.loan.lentAt, staff: old.loan.staff };
      items[idx] = next;
    }
  }
  items.sort((a, b) => a.asset.localeCompare(b.asset, undefined, { numeric: true }));
  return { file: file.name, items, patients, added, updated, problems };
}

function byIdMrn(ps: Patient[], id: string) {
  return ps.find((p) => p.id === id)?.mrn ?? '';
}

export async function exportTracker(state: State) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OTrace Library';
  const ws = wb.addWorksheet('Register');
  ws.columns = [
    { header: 'Asset', key: 'asset', width: 10 },
    { header: 'Item', key: 'name', width: 32 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Patient MRN', key: 'mrn', width: 14 },
    { header: 'Patient name', key: 'pname', width: 22 },
    { header: 'Ward', key: 'ward', width: 14 },
    { header: 'Lent', key: 'lent', width: 12 },
    { header: 'Due', key: 'due', width: 12 },
    { header: 'Serial', key: 'serial', width: 16 },
    { header: 'Home location', key: 'home', width: 18 },
  ];
  const label = { available: 'Available', onloan: 'On loan', overdue: 'Overdue', waiting: 'Waiting' };
  for (const i of state.items) {
    const p = i.loan ? state.patients.find((x) => x.id === i.loan!.patientId) : undefined;
    ws.addRow({
      asset: i.asset, name: i.name, type: i.type, status: label[statusOf(i)], mrn: p?.mrn ?? '', pname: p?.name ?? '', ward: p?.ward ?? '',
      lent: i.loan ? fmtDate(i.loan.lentAt.slice(0, 10)) : '', due: i.loan ? fmtDate(i.loan.due) : '', serial: i.serial ?? '', home: i.home,
    });
  }
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const hs = wb.addWorksheet('History');
  hs.columns = [
    { header: 'Date and time', key: 'at', width: 18 },
    { header: 'Action', key: 'action', width: 10 },
    { header: 'Asset', key: 'asset', width: 10 },
    { header: 'Item', key: 'item', width: 32 },
    { header: 'Patient MRN', key: 'mrn', width: 14 },
    { header: 'Staff', key: 'staff', width: 18 },
  ];
  for (const h of state.history) hs.addRow({ at: fmtDateTime(h.at), action: h.action === 'lent' ? 'Lent' : 'Returned', asset: h.asset, item: h.itemName, mrn: h.mrn, staff: h.staff });
  hs.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `OTrace-register-${dayKey()}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
