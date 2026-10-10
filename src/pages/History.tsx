import { useMemo, useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { Page } from '../components/Layout';
import { ActionLabel, Empty, FilterChip, HistoryRow, Mrn, Option, Sheet } from '../components/ui';
import { useT } from '../i18n/i18n';
import type { Key } from '../i18n/i18n';
import { fmtDateTime, mask } from '../lib/format';
import { useWide } from '../lib/useMedia';
import { useStore } from '../store/store';

type Range = 'today' | 'week' | 'month' | 'all';
const RANGE_DAYS: Record<Range, number> = { today: 0, week: 7, month: 30, all: Infinity };
const RANGE_KEY: Record<Range, Key> = { today: 'hist.today', week: 'hist.week', month: 'hist.month', all: 'hist.allTime' };

export function History() {
  const { t } = useT();
  const wide = useWide();
  const { state } = useStore();
  const [item, setItem] = useState<string | null>(null);
  const [patient, setPatient] = useState<string | null>(null);
  const [action, setAction] = useState<'lent' | 'returned' | null>(null);
  const [range, setRange] = useState<Range>('all');
  const [menu, setMenu] = useState<'item' | 'patient' | 'action' | 'date' | null>(null);

  const [now] = useState(() => Date.now());
  const rows = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (RANGE_DAYS[range] !== Infinity) start.setDate(start.getDate() - RANGE_DAYS[range]);
    return state.history.filter(
      (h) => (!item || h.itemId === item) && (!patient || h.patientId === patient) && (!action || h.action === action) && (range === 'all' || new Date(h.at) >= start),
    );
  }, [state.history, item, patient, action, range, now]);

  const itemOpts = useMemo(() => Array.from(new Map(state.history.map((h) => [h.itemId, h.asset])).entries()).sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true })), [state.history]);
  const patientOpts = useMemo(() => Array.from(new Map(state.history.map((h) => [h.patientId, h.mrn])).entries()), [state.history]);
  const any = !!(item || patient || action || range !== 'all');
  const clear = () => { setItem(null); setPatient(null); setAction(null); setRange('all'); };

  return (
    <Page title={t('hist.title')}>
      <div className="chips">
        <FilterChip menu label={item ? `${t('hist.item')}: ${itemOpts.find(([id]) => id === item)?.[1]}` : t('hist.item')} on={!!item} onClick={() => setMenu('item')} />
        <FilterChip menu label={patient ? `${t('hist.patient')}: ${mask(patientOpts.find(([id]) => id === patient)?.[1])}` : t('hist.patient')} on={!!patient} onClick={() => setMenu('patient')} />
        <FilterChip menu label={action ? `${t('hist.action')}: ${t(action === 'lent' ? 'hist.lent' : 'hist.returned')}` : t('hist.action')} on={!!action} onClick={() => setMenu('action')} />
        <FilterChip menu label={range !== 'all' ? `${t('hist.date')}: ${t(RANGE_KEY[range])}` : t('hist.date')} on={range !== 'all'} onClick={() => setMenu('date')} />
        {any && <button type="button" className="btn btn--quiet" onClick={clear}>{t('common.clearFilters')}</button>}
      </div>

      {rows.length === 0 ? (
        <div className="list"><Empty icon={<HistoryIcon size={28} />} title={t('hist.empty')}>{any && <button type="button" className="btn btn--secondary" onClick={clear}>{t('common.clearFilters')}</button>}</Empty></div>
      ) : wide ? (
        <div className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col.when')}</th>
                <th>{t('col.action')}</th>
                <th>{t('col.asset')}</th>
                <th>{t('col.item')}</th>
                <th>{t('col.patient')}</th>
                <th>{t('col.staff')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id}>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(h.at)}</td>
                  <td><ActionLabel action={h.action} /></td>
                  <td className="asset">{h.asset}</td>
                  <td>{h.itemName}</td>
                  <td><Mrn mrn={h.mrn} /></td>
                  <td>{h.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="list">{rows.map((h) => <HistoryRow key={h.id} h={h} />)}</div>
      )}

      {menu === 'item' && (
        <Sheet title={t('hist.item')} onClose={() => setMenu(null)}>
          <Option label={t('hist.anyItem')} on={!item} onClick={() => { setItem(null); setMenu(null); }} />
          {itemOpts.map(([id, a]) => <Option key={id} label={a} on={item === id} onClick={() => { setItem(id); setMenu(null); }} />)}
        </Sheet>
      )}
      {menu === 'patient' && (
        <Sheet title={t('hist.patient')} onClose={() => setMenu(null)}>
          <Option label={t('hist.anyPatient')} on={!patient} onClick={() => { setPatient(null); setMenu(null); }} />
          {patientOpts.map(([id, m]) => <Option key={id} label={<span className="mrn">{mask(m)}</span>} on={patient === id} onClick={() => { setPatient(id); setMenu(null); }} />)}
        </Sheet>
      )}
      {menu === 'action' && (
        <Sheet title={t('hist.action')} onClose={() => setMenu(null)}>
          <Option label={t('hist.anyAction')} on={!action} onClick={() => { setAction(null); setMenu(null); }} />
          <Option label={<ActionLabel action="lent" />} on={action === 'lent'} onClick={() => { setAction('lent'); setMenu(null); }} />
          <Option label={<ActionLabel action="returned" />} on={action === 'returned'} onClick={() => { setAction('returned'); setMenu(null); }} />
        </Sheet>
      )}
      {menu === 'date' && (
        <Sheet title={t('hist.date')} onClose={() => setMenu(null)}>
          {(Object.keys(RANGE_KEY) as Range[]).map((r) => <Option key={r} label={t(RANGE_KEY[r])} on={range === r} onClick={() => { setRange(r); setMenu(null); }} />)}
        </Sheet>
      )}
    </Page>
  );
}
