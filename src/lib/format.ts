import type { Item, Status } from '../data/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD in local time */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}
/** 2026-10-24 -> 24/10/2026 */
export function fmtDate(key?: string): string {
  if (!key) return '';
  const [y, m, d] = key.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
/** ISO -> 24/10/2026 14:36 */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function daysBetween(fromKey: string, toKey: string): number {
  const a = new Date(fromKey.slice(0, 10) + 'T00:00:00');
  const b = new Date(toKey.slice(0, 10) + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
export function mask(mrn?: string): string {
  return mrn ? '••••' + mrn.slice(-3) : '';
}
export function statusOf(item: Item, today = dayKey()): Status {
  if (!item.loan) return 'available';
  return item.loan.due < today ? 'overdue' : 'onloan';
}
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
/** "d27", " D27 ", "27", "OTRACE:D27" -> "D27" */
export function normAsset(code: string): string {
  const raw = code.trim().toUpperCase().replace(/^OTRACE:/, '');
  if (/^\d+$/.test(raw)) return 'D' + raw.padStart(2, '0');
  return raw;
}
