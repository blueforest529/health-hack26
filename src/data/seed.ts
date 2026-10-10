import type { HistoryEntry, Item, Patient, State, WaitEntry } from './types';
import { addDays, dayKey } from '../lib/format';

// Demo data so the app is usable at once. "Update sheet" replaces it with the real Excel tracker.
export function seedState(): State {
  const now = new Date();
  const iso = (daysAgo: number, h = 10, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const patients: Patient[] = [
    { id: 'p1', name: "Mary O'Brien", mrn: '0041512', ward: 'Ward 3A' },
    { id: 'p2', name: 'John Murphy', mrn: '0038308', ward: 'Ward 4B' },
    { id: 'p3', name: 'Olena Kovalenko', mrn: '0052640', ward: 'Ward 4B' },
    { id: 'p4', name: 'Piotr Nowak', mrn: '0047201', ward: 'Ward 3A' },
    { id: 'p5', name: 'Ana Popescu', mrn: '0049044', ward: 'Ward 4B' },
    { id: 'p6', name: 'Seamus Walsh', mrn: '0050771', ward: 'Ward 3A' },
  ];

  const S = 'OT Dept storage';
  const items: Item[] = [
    { id: 'i1', asset: 'D02', name: 'Pressure-relieving cushion', type: 'cushion', home: S },
    { id: 'i2', asset: 'D11', name: 'Pressure-relieving cushion', type: 'cushion', home: S, loan: { patientId: 'p1', lentAt: iso(4), due: addDays(10), staff: 'Admin' } },
    { id: 'i3', asset: 'D19', name: 'Sliding board', type: 'slidingboard', home: S, loan: { patientId: 'p3', lentAt: iso(2), due: addDays(5), staff: 'Admin' } },
    { id: 'i4', asset: 'D27', name: 'Rea Azalea Assist wheelchair', type: 'wheelchair', serial: 'RA-2219-0427', home: S },
    { id: 'i5', asset: 'D33', name: 'Leg rest (pair)', type: 'legrest', home: S, loan: { patientId: 'p4', lentAt: iso(7), due: addDays(1), staff: 'Admin' } },
    { id: 'i6', asset: 'D46', name: 'Rea Azalea Assist wheelchair', type: 'wheelchair', serial: 'RA-2219-0451', home: S, loan: { patientId: 'p2', lentAt: iso(22), due: addDays(-8), staff: 'Admin' } },
    { id: 'i7', asset: 'D51', name: 'Headrest', type: 'headrest', home: S },
    { id: 'i8', asset: 'D14', name: 'Rea Azalea Assist wheelchair', type: 'wheelchair', serial: 'RA-2219-0414', home: S, loan: { patientId: 'p5', lentAt: iso(1), due: addDays(13), staff: 'Admin' } },
    { id: 'i9', asset: 'D08', name: 'Pressure-relieving cushion', type: 'cushion', home: S },
  ];

  const waitlist: WaitEntry[] = [
    { id: 'w1', patientId: 'p6', type: 'wheelchair', need: 'Wheelchair 18"', addedAt: iso(6) },
    { id: 'w2', patientId: 'p3', type: 'wheelchair', need: 'Wheelchair 18"', addedAt: iso(3) },
    { id: 'w3', patientId: 'p4', type: 'cushion', need: 'Pressure-relieving cushion', addedAt: iso(2) },
  ];

  const h = (id: string, action: 'lent' | 'returned', item: Item, p: Patient, at: string, staff: string): HistoryEntry => ({
    id, action, itemId: item.id, asset: item.asset, itemName: item.name, patientId: p.id, mrn: p.mrn, at, staff,
  });
  const history: HistoryEntry[] = [
    h('h1', 'lent', items[7], patients[4], iso(1, 14, 36), 'Admin'),
    h('h2', 'lent', items[2], patients[2], iso(2, 9, 15), 'Admin'),
    h('h3', 'returned', items[3], patients[5], iso(3, 11, 2), 'Admin'),
    h('h4', 'lent', items[1], patients[0], iso(4, 16, 45), 'Admin'),
    h('h5', 'lent', items[4], patients[3], iso(7, 10, 20), 'Admin'),
    h('h6', 'lent', items[5], patients[1], iso(22, 9, 40), 'Admin'),
  ];

  return {
    items,
    patients,
    waitlist,
    history,
    staff: 'Admin',
    staffList: ['Admin'],
    sheetUpdatedAt: iso(0, 9, 12),
    sheetUpdatedBy: 'Admin',
  };
}

export const TODAY = () => dayKey();
