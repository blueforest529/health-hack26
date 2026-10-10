import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { HistoryEntry, Item, ItemType, Patient, State, WaitEntry } from '../data/types';
import { seedState } from '../data/seed';
import { dayKey, normAsset, statusOf, uid } from '../lib/format';

const KEY = 'otrace-library-v2';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...(JSON.parse(raw) as State), staff: 'Admin', staffList: ['Admin'] };
  } catch {
    /* private mode or blocked storage: fall back to demo data */
  }
  return seedState();
}

type Toast = { id: number; message: string; undo?: State };

type Store = {
  state: State;
  // lookups
  itemById(id?: string): Item | undefined;
  itemByAsset(code: string): Item | undefined;
  patientById(id?: string): Patient | undefined;
  // actions (each returns the confirmation text it showed)
  lend(itemId: string, patientId: string, due: string): void;
  returnItem(itemId: string): void;
  saveItem(item: Item): void;
  savePatient(p: Patient): Patient;
  addToWaitlist(patientId: string, type: ItemType, need: string): void;
  removeFromWaitlist(id: string): void;
  setStaff(name: string): void;
  replaceAll(next: Pick<State, 'items' | 'patients'>, message: string): void;
  resetDemo(): void;
  // toast
  toast: Toast | null;
  notify(message: string, undo?: State): void;
  undo(): void;
  dismiss(): void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [toast, setToast] = useState<Toast | null>(null);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const notify = useCallback((message: string, undo?: State) => setToast({ id: Date.now(), message, undo }), []);

  const commit = useCallback(
    (fn: (s: State) => State, message?: string) => {
      const before = stateRef.current;
      const after = fn(before);
      setState(after);
      if (message) notify(message, before);
    },
    [notify],
  );

  const itemById = useCallback((id?: string) => state.items.find((i) => i.id === id), [state.items]);
  const itemByAsset = useCallback((code: string) => state.items.find((i) => i.asset.toUpperCase() === normAsset(code)), [state.items]);
  const patientById = useCallback((id?: string) => state.patients.find((p) => p.id === id), [state.patients]);

  const lend = useCallback(
    (itemId: string, patientId: string, due: string) => {
      const s = stateRef.current;
      const item = s.items.find((i) => i.id === itemId);
      const p = s.patients.find((x) => x.id === patientId);
      if (!item || !p) return;
      const at = new Date().toISOString();
      const entry: HistoryEntry = { id: uid(), action: 'lent', itemId, asset: item.asset, itemName: item.name, patientId, mrn: p.mrn, at, staff: s.staff, due };
      commit(
        (st) => ({
          ...st,
          items: st.items.map((i) => (i.id === itemId ? { ...i, loan: { patientId, lentAt: at, due, staff: st.staff } } : i)),
          // the patient got what they waited for
          waitlist: st.waitlist.filter((w) => !(w.patientId === patientId && w.type === item.type)),
          history: [entry, ...st.history],
        }),
        `lent|${item.asset}|${p.mrn}|${due}`,
      );
    },
    [commit],
  );

  const returnItem = useCallback(
    (itemId: string) => {
      const s = stateRef.current;
      const item = s.items.find((i) => i.id === itemId);
      if (!item || !item.loan) return;
      const p = s.patients.find((x) => x.id === item.loan!.patientId);
      const entry: HistoryEntry = { id: uid(), action: 'returned', itemId, asset: item.asset, itemName: item.name, patientId: item.loan.patientId, mrn: p?.mrn ?? '', at: new Date().toISOString(), staff: s.staff };
      commit(
        (st) => ({ ...st, items: st.items.map((i) => (i.id === itemId ? { ...i, loan: undefined } : i)), history: [entry, ...st.history] }),
        `returned|${item.asset}`,
      );
    },
    [commit],
  );

  const saveItem = useCallback(
    (item: Item) => {
      const exists = stateRef.current.items.some((i) => i.id === item.id);
      commit(
        (st) => ({ ...st, items: exists ? st.items.map((i) => (i.id === item.id ? item : i)) : [...st.items, item].sort((a, b) => a.asset.localeCompare(b.asset, undefined, { numeric: true })) }),
        `saved|${item.asset}`,
      );
    },
    [commit],
  );

  const savePatient = useCallback(
    (p: Patient) => {
      const exists = stateRef.current.patients.some((x) => x.id === p.id);
      commit((st) => ({ ...st, patients: exists ? st.patients.map((x) => (x.id === p.id ? p : x)) : [...st.patients, p] }), `savedPatient|${p.mrn}`);
      return p;
    },
    [commit],
  );

  const addToWaitlist = useCallback(
    (patientId: string, type: ItemType, need: string) => {
      const p = stateRef.current.patients.find((x) => x.id === patientId);
      const w: WaitEntry = { id: uid(), patientId, type, need, addedAt: new Date().toISOString() };
      commit((st) => ({ ...st, waitlist: [...st.waitlist, w] }), `waitAdded|${p?.mrn ?? ''}`);
    },
    [commit],
  );

  const removeFromWaitlist = useCallback((id: string) => commit((st) => ({ ...st, waitlist: st.waitlist.filter((w) => w.id !== id) }), 'waitRemoved'), [commit]);

  const setStaff = useCallback(
    (name: string) => setState((st) => ({ ...st, staff: name, staffList: st.staffList.includes(name) ? st.staffList : [...st.staffList, name] })),
    [],
  );

  const replaceAll = useCallback(
    (next: Pick<State, 'items' | 'patients'>, message: string) =>
      commit((st) => ({ ...st, items: next.items, patients: next.patients, sheetUpdatedAt: new Date().toISOString(), sheetUpdatedBy: st.staff }), message),
    [commit],
  );

  const resetDemo = useCallback(() => commit(() => seedState(), 'reset'), [commit]);

  const undo = useCallback(() => {
    setToast((t) => {
      if (t?.undo) setState(t.undo);
      return null;
    });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);

  const value = useMemo<Store>(
    () => ({ state, itemById, itemByAsset, patientById, lend, returnItem, saveItem, savePatient, addToWaitlist, removeFromWaitlist, setStaff, replaceAll, resetDemo, toast, notify, undo, dismiss }),
    [state, itemById, itemByAsset, patientById, lend, returnItem, saveItem, savePatient, addToWaitlist, removeFromWaitlist, setStaff, replaceAll, resetDemo, toast, notify, undo, dismiss],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Items enriched with status for lists. */
export function useItems() {
  const { state } = useStore();
  const today = dayKey();
  return useMemo(() => state.items.map((i) => ({ item: i, status: statusOf(i, today) })), [state.items, today]);
}
