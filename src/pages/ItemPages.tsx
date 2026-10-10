import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Pencil, SquareArrowOutUpRight, TriangleAlert } from 'lucide-react';
import { Page } from '../components/Layout';
import { Due, Empty, HistoryRow, Mrn, StatusBadge } from '../components/ui';
import { ITEM_TYPES } from '../data/types';
import type { Item, ItemType, Patient } from '../data/types';
import { useT } from '../i18n/i18n';
import type { Key } from '../i18n/i18n';
import { daysBetween, dayKey, fmtDate, normAsset, statusOf, uid } from '../lib/format';
import { useStore } from '../store/store';

export function ItemPage() {
  const { id } = useParams();
  const { t } = useT();
  const nav = useNavigate();
  const { itemById, patientById, state, returnItem } = useStore();
  const item = itemById(id);
  if (!item) {
    return (
      <Page title={t('item.details')} back="/">
        <div className="list"><Empty title={t('item.notFound')} /></div>
      </Page>
    );
  }
  const status = statusOf(item);
  const p = item.loan ? patientById(item.loan.patientId) : undefined;
  const hist = state.history.filter((h) => h.itemId === item.id);

  const action = item.loan ? (
    <button type="button" className="btn btn--primary btn--lg" onClick={() => returnItem(item.id)}>
      <ArrowDownToLine size={20} aria-hidden />
      {t('item.return')}
    </button>
  ) : (
    <button type="button" className="btn btn--primary btn--lg" onClick={() => nav(`/lend/new?item=${item.id}`)}>
      <SquareArrowOutUpRight size={20} aria-hidden />
      {t('item.lend')}
    </button>
  );

  return (
    <Page title={<><span className="num">{item.asset}</span> · {item.name}</>} back="/">
      <div className="row spread" style={{ gap: 12 }}>
        <div className="row">
          <StatusBadge status={status} />
          {item.loan && status === 'overdue' ? (
            <span className="due due--overdue">
              <TriangleAlert size={16} aria-hidden />
              {t('item.wasDue', { date: fmtDate(item.loan.due), n: daysBetween(item.loan.due, dayKey()) })}
            </span>
          ) : item.loan ? (
            <Due date={item.loan.due} />
          ) : (
            <span className="muted">{t('item.inStorage')}</span>
          )}
        </div>
        <div className="row">
          <button type="button" className="btn btn--secondary" onClick={() => nav(`/items/${item.id}/edit`)}>
            <Pencil size={18} aria-hidden />
            {t('item.edit')}
          </button>
          {action}
        </div>
      </div>

      <div className="grid2">
        <div className="stack">
          <section className="panel" aria-labelledby="d-h">
            <div className="panel__head"><h2 className="h3" id="d-h">{t('item.details')}</h2></div>
            <div className="panel--pad">
              <dl className="kv">
                <dt>{t('item.asset')}</dt><dd className="num">{item.asset}</dd>
                <dt>{t('item.type')}</dt><dd>{t(`type.${item.type}` as Key)}</dd>
                <dt>{t('item.name')}</dt><dd>{item.name}</dd>
                {item.serial && (<><dt>{t('item.serial')}</dt><dd>{item.serial}</dd></>)}
                <dt>{t('item.home')}</dt><dd>{item.home}</dd>
                {item.notes && (<><dt>{t('item.notes')}</dt><dd>{item.notes}</dd></>)}
              </dl>
            </div>
          </section>
          {p && item.loan && (
            <section className="panel" aria-labelledby="p-h">
              <div className="panel__head">
                <h2 className="h3" id="p-h">{t('item.currentPatient')}</h2>
                <button type="button" className="btn btn--quiet" onClick={() => nav(`/patients/${p.id}/edit`)}>
                  <Pencil size={18} aria-hidden />
                  {t('patient.edit')}
                </button>
              </div>
              <div className="panel--pad">
                <dl className="kv">
                  <dt>{t('patient.name')}</dt><dd>{p.name}</dd>
                  <dt>{t('patient.mrn')}</dt><dd><Mrn mrn={p.mrn} full /></dd>
                  <dt>{t('patient.ward')}</dt><dd>{p.ward}</dd>
                  <dt>{t('ret.lent')}</dt><dd>{t('item.lentOn', { date: fmtDate(item.loan.lentAt.slice(0, 10)), staff: item.loan.staff })}</dd>
                  <dt>{t('col.due')}</dt><dd>{fmtDate(item.loan.due)}</dd>
                </dl>
              </div>
            </section>
          )}
        </div>
        <section className="panel" aria-labelledby="h-h">
          <div className="panel__head">
            <h2 className="h3" id="h-h">{t('item.history')}</h2>
            <span className="muted">{t('common.entries', { n: hist.length })}</span>
          </div>
          {hist.length ? hist.map((h) => <HistoryRow key={h.id} h={h} />) : <Empty title={t('item.noHistory')} />}
        </section>
      </div>
    </Page>
  );
}

export function ItemForm() {
  const { id } = useParams();
  const { t } = useT();
  const nav = useNavigate();
  const { itemById, saveItem, state } = useStore();
  const existing = itemById(id);
  const [f, setF] = useState<Item>(existing ?? { id: uid(), asset: '', name: '', type: 'wheelchair', home: 'OT Dept storage' });
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const asset = normAsset(f.asset);
    if (!asset || !f.name.trim()) return setError(t('item.required'));
    if (state.items.some((i) => i.asset === asset && i.id !== f.id)) return setError(t('item.assetTaken', { asset }));
    saveItem({ ...f, asset, name: f.name.trim(), home: f.home.trim() || 'OT Dept storage' });
    nav(`/items/${f.id}`, { replace: true });
  };
  const upd = (k: keyof Item) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Page title={existing ? t('item.edit') : t('item.new')} back>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="asset">{t('item.asset')}</label>
          <input id="asset" className="input num" value={f.asset} onChange={upd('asset')} autoCapitalize="characters" required />
          <small>{t('item.assetHint')}</small>
        </div>
        <div className="field">
          <label htmlFor="name">{t('item.name')}</label>
          <input id="name" className="input" value={f.name} onChange={upd('name')} required />
        </div>
        <div className="field">
          <label htmlFor="type">{t('item.type')}</label>
          <select id="type" className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ItemType })}>
            {ITEM_TYPES.map((x) => <option key={x} value={x}>{t(`type.${x}` as Key)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="serial">{t('item.serial')}</label>
          <input id="serial" className="input" value={f.serial ?? ''} onChange={upd('serial')} />
        </div>
        <div className="field">
          <label htmlFor="home">{t('item.home')}</label>
          <input id="home" className="input" value={f.home} onChange={upd('home')} />
        </div>
        <div className="field">
          <label htmlFor="notes">{t('item.notes')}</label>
          <textarea id="notes" className="textarea" value={f.notes ?? ''} onChange={upd('notes')} />
        </div>
        {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}
        <div className="row">
          <button className="btn btn--primary btn--lg" type="submit">{t('item.save')}</button>
          <button className="btn btn--secondary btn--lg" type="button" onClick={() => nav(-1)}>{t('common.cancel')}</button>
        </div>
      </form>
    </Page>
  );
}

export function PatientForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t } = useT();
  const nav = useNavigate();
  const { patientById, savePatient, state } = useStore();
  const existing = patientById(id);
  const [f, setF] = useState<Patient>(existing ?? { id: uid(), name: '', mrn: '', ward: '' });
  const [error, setError] = useState('');
  const wards = Array.from(new Set(state.patients.map((p) => p.ward))).sort();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const mrn = f.mrn.replace(/\D/g, '');
    if (!f.name.trim() || !mrn || !f.ward.trim()) return setError(t('patient.required'));
    if (state.patients.some((p) => p.mrn === mrn && p.id !== f.id)) return setError(t('patient.mrnTaken', { mrn }));
    savePatient({ ...f, name: f.name.trim(), mrn, ward: f.ward.trim() });
    const then = params.get('then');
    if (then) nav(then.replace('__PATIENT__', f.id), { replace: true });
    else nav(-1);
  };

  return (
    <Page title={existing ? t('patient.edit') : t('patient.new')} back>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="pname">{t('patient.name')}</label>
          <input id="pname" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="mrn">{t('patient.mrn')}</label>
          <input id="mrn" className="input mrn" inputMode="numeric" value={f.mrn} onChange={(e) => setF({ ...f, mrn: e.target.value })} autoComplete="off" />
          <small>{t('patient.mrnHint')}</small>
        </div>
        <div className="field">
          <label htmlFor="ward">{t('patient.ward')}</label>
          <input id="ward" className="input" list="wards" value={f.ward} onChange={(e) => setF({ ...f, ward: e.target.value })} autoComplete="off" />
          <datalist id="wards">{wards.map((w) => <option key={w} value={w} />)}</datalist>
        </div>
        {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}
        <div className="row">
          <button className="btn btn--primary btn--lg" type="submit">{t('patient.save')}</button>
          <button className="btn btn--secondary btn--lg" type="button" onClick={() => nav(-1)}>{t('common.cancel')}</button>
        </div>
      </form>
    </Page>
  );
}
