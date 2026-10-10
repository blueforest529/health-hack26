import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownToLine, Check, ChevronDown, ChevronRight, Clock, SquareArrowOutUpRight, TriangleAlert, X } from 'lucide-react';
import type { HistoryEntry, Status } from '../data/types';
import { useT } from '../i18n/i18n';
import { daysBetween, dayKey, fmtDate, fmtDateTime, mask } from '../lib/format';
import { useStore } from '../store/store';

/* ---------- StatusBadge: colour + icon + word + shape ---------- */
const STATUS_ICON = { available: Check, onloan: SquareArrowOutUpRight, overdue: TriangleAlert, waiting: Clock } as const;
export function StatusBadge({ status }: { status: Status }) {
  const { t } = useT();
  const I = STATUS_ICON[status];
  return (
    <span className={`badge badge--${status}`}>
      <I size={18} strokeWidth={2.25} aria-hidden />
      {t(`status.${status}`)}
    </span>
  );
}

export function Due({ date }: { date: string }) {
  const { t } = useT();
  const over = date < dayKey();
  return over ? (
    <span className="due due--overdue">
      <TriangleAlert size={16} strokeWidth={2.25} aria-hidden />
      {t('due', { date: fmtDate(date) })}
    </span>
  ) : (
    <span className="due">{t('due', { date: fmtDate(date) })}</span>
  );
}

export function Mrn({ mrn, full }: { mrn?: string; full?: boolean }) {
  if (!mrn) return null;
  return <span className="mrn">{full ? mrn : mask(mrn)}</span>;
}

/* ---------- FilterChip ---------- */
export function FilterChip({ label, on, menu, icon, onClick }: { label: string; on?: boolean; menu?: boolean; icon?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={`chip${on ? ' chip--on' : ''}`} aria-pressed={on} onClick={onClick}>
      {icon}
      {label}
      {menu && <ChevronDown size={18} aria-hidden />}
    </button>
  );
}

/* ---------- BigActionButton ---------- */
export function BigActionButton({ label, sub, icon, primary, onClick }: { label: string; sub: string; icon: ReactNode; primary?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`big${primary ? ' big--primary' : ''}`} onClick={onClick}>
      <span className="big__icon">{icon}</span>
      <span>
        <span className="big__label">{label}</span>
        <span className="big__sub">{sub}</span>
      </span>
    </button>
  );
}

/* ---------- ItemRow (phone lists) ---------- */
export function ItemRow({ asset, name, status, meta, selected, onClick, trailing }: { asset: string; name: string; status?: Status; meta?: ReactNode; selected?: boolean; onClick?: () => void; trailing?: ReactNode }) {
  return (
    <button type="button" className={`irow${selected ? ' irow--on' : ''}`} onClick={onClick} aria-pressed={selected}>
      <span className="irow__main">
        <span className="irow__title">
          {asset}
          <span>{name}</span>
        </span>
        {meta && <span className="irow__meta">{meta}</span>}
        {status && (
          <span>
            <StatusBadge status={status} />
          </span>
        )}
      </span>
      {trailing ?? <ChevronRight className="irow__go" size={22} aria-hidden />}
    </button>
  );
}

/* ---------- HistoryEntry ---------- */
export function ActionLabel({ action }: { action: 'lent' | 'returned' }) {
  const { t } = useT();
  return action === 'lent' ? (
    <span className="action action--lent">
      <SquareArrowOutUpRight size={18} aria-hidden />
      {t('hist.lent')}
    </span>
  ) : (
    <span className="action action--returned">
      <ArrowDownToLine size={18} aria-hidden />
      {t('hist.returned')}
    </span>
  );
}
export function HistoryRow({ h }: { h: HistoryEntry }) {
  const lent = h.action === 'lent';
  return (
    <div className="hist">
      <span className={`hist__icon hist__icon--${h.action}`} aria-hidden>
        {lent ? <SquareArrowOutUpRight size={22} /> : <ArrowDownToLine size={22} />}
      </span>
      <div className="hist__main">
        <div className="hist__what">
          <ActionLabel action={h.action} /> {h.asset} · <Mrn mrn={h.mrn} />
        </div>
        <div className="hist__meta">
          {fmtDateTime(h.at)} · {h.staff}
        </div>
      </div>
    </div>
  );
}

/* ---------- QueueEntry ---------- */
export function QueueEntry({ position, mrn, ward, need, addedAt, ready, onRemove }: { position: number; mrn: string; ward: string; need: string; addedAt: string; ready?: ReactNode; onRemove?: () => void }) {
  const { t } = useT();
  const days = Math.max(0, daysBetween(addedAt, dayKey()));
  return (
    <div className="q">
      <div className={`q__pos${position === 1 ? ' q__pos--first' : ''}`} aria-label={`#${position}`}>
        {position}
      </div>
      <div className="q__main">
        <div className="row">
          <Mrn mrn={mrn} />
          <StatusBadge status="waiting" />
        </div>
        <div className="q__meta">
          <span>{ward}</span>
          <span>{t('wait.needs', { need })}</span>
        </div>
        {ready}
        {onRemove && (
          <div>
            <button type="button" className="btn btn--quiet" onClick={onRemove}>
              {t('wait.remove')}
            </button>
          </div>
        )}
      </div>
      <div className="q__days">
        {days}
        <small>{t('wait.daysWaiting')}</small>
      </div>
    </div>
  );
}

/* ---------- Sheet (bottom sheet on phone, dialog on desktop) ---------- */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h2 className="h3">{title}</h2>
          <button type="button" className="btn btn--quiet" onClick={onClose} aria-label={t('common.close')}>
            <X size={22} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Option({ label, hint, on, onClick }: { label: ReactNode; hint?: ReactNode; on?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`opt${on ? ' opt--on' : ''}`} onClick={onClick} aria-pressed={on}>
      <span>{label}</span>
      <span className="row">
        {hint && <small>{hint}</small>}
        {on && <Check size={20} aria-hidden />}
      </span>
    </button>
  );
}

/* ---------- Snackbar with Undo ---------- */
export function Snackbar() {
  const { toast, undo, dismiss } = useStore();
  const { t } = useT();
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(dismiss, 10000);
    return () => clearTimeout(id);
  }, [toast, dismiss]);
  if (!toast) return null;
  const [kind, a = '', b = '', c = ''] = toast.message.split('|');
  const msg =
    kind === 'lent' ? t('toast.lent', { asset: a, mrn: mask(b), date: fmtDate(c) })
    : kind === 'returned' ? t('toast.returned', { asset: a })
    : kind === 'saved' ? t('toast.saved', { asset: a })
    : kind === 'savedPatient' ? t('toast.savedPatient', { mrn: mask(a) })
    : kind === 'waitAdded' ? t('toast.waitAdded', { mrn: mask(a) })
    : kind === 'waitRemoved' ? t('toast.waitRemoved')
    : kind === 'imported' ? t('toast.imported', { n: a, p: b })
    : kind === 'reset' ? t('toast.reset')
    : kind === 'exported' ? t('toast.exported')
    : toast.message;
  return (
    <div className="snack" role="status" aria-live="polite" key={toast.id}>
      <Check size={20} aria-hidden />
      <span className="snack__msg">{msg}</span>
      {toast.undo && (
        <button type="button" className="btn btn--quiet" onClick={undo}>
          {t('common.undo')}
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, title, hint, children }: { icon?: ReactNode; title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="muted">{icon}</span>}
      <b className="h3">{title}</b>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  );
}
