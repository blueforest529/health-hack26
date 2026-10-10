export type ItemType = 'wheelchair' | 'cushion' | 'legrest' | 'headrest' | 'slidingboard' | 'other';
export const ITEM_TYPES: ItemType[] = ['wheelchair', 'cushion', 'legrest', 'headrest', 'slidingboard', 'other'];

export type Loan = { patientId: string; lentAt: string; due: string; staff: string };

export type Item = {
  id: string;
  asset: string; // D27
  name: string; // Rea Azalea Assist wheelchair
  type: ItemType;
  serial?: string;
  home: string; // OT Dept storage
  notes?: string;
  loan?: Loan;
};

export type Patient = { id: string; name: string; mrn: string; ward: string };

export type WaitEntry = { id: string; patientId: string; type: ItemType; need: string; addedAt: string };

export type HistoryEntry = {
  id: string;
  action: 'lent' | 'returned';
  itemId: string;
  asset: string;
  itemName: string;
  patientId: string;
  mrn: string;
  at: string; // ISO
  staff: string;
  due?: string;
};

export type Status = 'available' | 'onloan' | 'overdue' | 'waiting';

export type State = {
  items: Item[];
  patients: Patient[];
  waitlist: WaitEntry[];
  history: HistoryEntry[];
  staff: string;
  staffList: string[];
  sheetUpdatedAt?: string;
  sheetUpdatedBy?: string;
};
