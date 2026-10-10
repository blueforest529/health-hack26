import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Plus, Search, TriangleAlert } from 'lucide-react';
import { Page } from '../components/Layout';
import { Due, Empty, FilterChip, ItemRow, Mrn, Option, Sheet, StatusBadge } from '../components/ui';
import { ITEM_TYPES } from '../data/types';
import type { ItemType, Status } from '../data/types';
import { useT } from '../i18n/i18n';
import type { Key } from '../i18n/i18n';
import { useWide } from '../lib/useMedia';
import { useItems, useStore } from '../store/store';

const STATUSES: Status[] = ['available', 'onloan', 'overdue'];

export function Register() {
  const { t } = useT();
  const { patientById, state } = useStore();
  const items = useItems();
  const wide = useWide();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = (params.get('type') as ItemType | null) ?? null;
  const status = (params.get('status') as Status | null) ?? null;
  const overdue = params.get('overdue') === '1';
  const [menu, setMenu] = useState<'type' | 'status' | null>(null);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(({ item, status: s }) => {
      if (type && item.type !== type) return false;
      if (status && s !== status) return false;
      if (overdue && s !== 'overdue') return false;
      if (!needle) return true;
      const p = item.loan ? patientById(item.loan.patientId) : undefined;
      return [item.asset, item.name, p?.mrn ?? '', item.serial ?? ''].some((v) => v.toLowerCase().includes(needle));
    });
  }, [items, q, type, status, overdue, patientById]);

  const anyFilter = !!(type || status || overdue);
  const typeLabel = (x: ItemType) => t(`type.${x}` as Key);

  return (
    <Page title={t('register.title')}>
      <div className="row" style={{ gap: 12 }}>
        <label className="search" style={{ flexBasis: 320 }}>
          <Search size={22} aria-hidden />
          <span className="sr-only">{t('register.search')}</span>
          <input type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder={wide ? t('register.search') : t('register.searchShort')} />
        </label>
        <div className="row">
          <button type="button" className="btn btn--secondary" onClick={() => nav('/items/new')}>
            <Plus size={20} aria-hidden />
            {t('register.addItem')}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => nav('/patients/new')}>
            <Plus size={20} aria-hidden />
            {t('register.addPatient')}
          </button>
        </div>
      </div>

      <div className="chips">
        <FilterChip label={type ? `${t('filter.type')}: ${typeLabel(type)}` : t('filter.type')} on={!!type} menu onClick={() => setMenu('type')} />
        <FilterChip label={status ? `${t('filter.status')}: ${t(`status.${status}` as Key)}` : t('filter.status')} on={!!status} menu onClick={() => setMenu('status')} />
        <FilterChip label={t('filter.overdue')} on={overdue} icon={<TriangleAlert size={18} aria-hidden />} onClick={() => set('overdue', overdue ? null : '1')} />
        {anyFilter && (
          <button type="button" className="btn btn--quiet" onClick={() => setParams(q ? { q } : {}, { replace: true })}>
            {t('common.clearFilters')}
          </button>
        )}
        <span className="muted" style={{ marginLeft: 4 }}>{t('register.count', { n: rows.length, total: state.items.length })}</span>
      </div>

      {rows.length === 0 ? (
        <div className="list">
          <Empty icon={<Search size={28} />} title={q ? t('register.empty', { q }) : t('register.emptyFilters')} hint={t('register.emptyHint')}>
            {anyFilter && (
              <button type="button" className="btn btn--secondary" onClick={() => setParams(q ? { q } : {}, { replace: true })}>
                {t('common.clearFilters')}
              </button>
            )}
          </Empty>
        </div>
      ) : wide ? (
        <div className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('col.asset')}</th>
                <th>{t('col.item')}</th>
                <th>{t('col.status')}</th>
                <th>{t('col.patient')}</th>
                <th>{t('col.location')}</th>
                <th>{t('col.due')}</th>
                <th><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, status: s }) => {
                const p = item.loan ? patientById(item.loan.patientId) : undefined;
                return (
                  <tr key={item.id} className="clickable" onClick={() => nav(`/items/${item.id}`)}>
                    <td className="asset">
                      <a href={`#/items/${item.id}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{item.asset}</a>
                    </td>
                    <td>{item.name}</td>
                    <td><StatusBadge status={s} /></td>
                    <td>{p ? <Mrn mrn={p.mrn} /> : <span className="muted">{t('common.none')}</span>}</td>
                    <td>{p ? p.ward : item.home}</td>
                    <td>{item.loan ? <Due date={item.loan.due} /> : <span className="muted">{t('common.none')}</span>}</td>
                    <td style={{ width: 40 }}><ChevronRight size={20} className="muted" aria-hidden /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="list">
          {rows.map(({ item, status: s }) => {
            const p = item.loan ? patientById(item.loan.patientId) : undefined;
            return (
              <ItemRow
                key={item.id}
                asset={item.asset}
                name={item.name}
                status={s}
                onClick={() => nav(`/items/${item.id}`)}
                meta={p && item.loan ? (<><Mrn mrn={p.mrn} /><span>{p.ward}</span><Due date={item.loan.due} /></>) : <span>{item.home}</span>}
              />
            );
          })}
        </div>
      )}

      {menu === 'type' && (
        <Sheet title={t('filter.type')} onClose={() => setMenu(null)}>
          <Option label={t('filter.allTypes')} on={!type} onClick={() => { set('type', null); setMenu(null); }} />
          {ITEM_TYPES.map((x) => (
            <Option key={x} label={typeLabel(x)} on={type === x} onClick={() => { set('type', x); setMenu(null); }} />
          ))}
        </Sheet>
      )}
      {menu === 'status' && (
        <Sheet title={t('filter.status')} onClose={() => setMenu(null)}>
          <Option label={t('filter.allStatuses')} on={!status} onClick={() => { set('status', null); setMenu(null); }} />
          {STATUSES.map((x) => (
            <Option key={x} label={<StatusBadge status={x} />} on={status === x} onClick={() => { set('status', x); setMenu(null); }} />
          ))}
        </Sheet>
      )}
    </Page>
  );
}
