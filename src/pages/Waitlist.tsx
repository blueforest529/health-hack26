import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Plus, TriangleAlert } from 'lucide-react';
import { Page } from '../components/Layout';
import { Empty, FilterChip, QueueEntry } from '../components/ui';
import { ITEM_TYPES } from '../data/types';
import type { ItemType } from '../data/types';
import { useT } from '../i18n/i18n';
import type { Key } from '../i18n/i18n';
import { mask } from '../lib/format';
import { useWide } from '../lib/useMedia';
import { useStore } from '../store/store';

export function Waitlist() {
  const { t } = useT();
  const nav = useNavigate();
  const wide = useWide();
  const [params, setParams] = useSearchParams();
  const { state, patientById, removeFromWaitlist } = useStore();
  const type = (params.get('type') as ItemType | null) ?? 'wheelchair';

  const counts = useMemo(() => Object.fromEntries(ITEM_TYPES.map((x) => [x, state.waitlist.filter((w) => w.type === x).length])), [state.waitlist]);
  const queue = useMemo(() => state.waitlist.filter((w) => w.type === type).sort((a, b) => a.addedAt.localeCompare(b.addedAt)), [state.waitlist, type]);
  const free = state.items.find((i) => i.type === type && !i.loan);
  const label = (x: ItemType) => t(`type.${x}` as Key);

  const list = (
    <div className="stack">
      <div className="row spread">
        <h2 className="h2">{label(type)}</h2>
        <button type="button" className="btn btn--primary" onClick={() => nav(`/waitlist/new?type=${type}`)}>
          <Plus size={20} aria-hidden />
          {t('wait.add')}
        </button>
      </div>
      <p className="muted" style={{ margin: 0 }}>{t('wait.first')}</p>
      <div className="list">
        {queue.length ? (
          queue.map((w, i) => {
            const p = patientById(w.patientId);
            const ready =
              i === 0 && free ? (
                <div className="ready">
                  <b><Check size={22} aria-hidden />{t('wait.available', { asset: free.asset })}</b>
                  <button type="button" className="btn btn--primary" onClick={() => nav(`/lend/new?item=${free.id}&patient=${w.patientId}`)}>
                    {t('wait.lendTo')}
                  </button>
                </div>
              ) : undefined;
            return <QueueEntry key={w.id} position={i + 1} mrn={p?.mrn ?? ''} ward={p?.ward ?? ''} need={w.need} addedAt={w.addedAt} ready={ready} onRemove={() => removeFromWaitlist(w.id)} />;
          })
        ) : (
          <Empty title={t('wait.empty')} hint={t('wait.emptyHint')} />
        )}
      </div>
    </div>
  );

  return (
    <Page title={t('wait.title')}>
      {wide ? (
        <div className="split">
          <nav className="panel" style={{ padding: 8 }} aria-label={t('wait.type')}>
            <p className="muted" style={{ margin: '8px 12px', fontSize: 14, fontWeight: 600 }}>{t('wait.type')}</p>
            {ITEM_TYPES.filter((x) => x !== 'other').map((x) => (
              <button key={x} type="button" className={`typelink${x === type ? ' typelink--on' : ''}`} aria-pressed={x === type} onClick={() => setParams({ type: x }, { replace: true })}>
                <span>{label(x)}</span>
                <span className="num muted">{counts[x]}</span>
              </button>
            ))}
          </nav>
          {list}
        </div>
      ) : (
        <>
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
            {ITEM_TYPES.filter((x) => x !== 'other').map((x) => (
              <FilterChip key={x} label={`${label(x)} (${counts[x]})`} on={x === type} onClick={() => setParams({ type: x }, { replace: true })} />
            ))}
          </div>
          {list}
        </>
      )}
    </Page>
  );
}

export function WaitlistAdd() {
  const { t } = useT();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { state, addToWaitlist } = useStore();
  const [patientId, setPatientId] = useState('');
  const [type, setType] = useState<ItemType>((params.get('type') as ItemType) || 'wheelchair');
  const [need, setNeed] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!patientId) return setError(t('wait.choosePatient'));
    if (state.waitlist.some((w) => w.patientId === patientId && w.type === type)) return setError(t('wait.already'));
    addToWaitlist(patientId, type, need.trim() || t(`type.${type}` as Key));
    nav(`/waitlist?type=${type}`, { replace: true });
  };

  return (
    <Page title={t('wait.add')} back={`/waitlist?type=${type}`}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="wp">{t('wait.patient')}</label>
          <select id="wp" className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">{t('wait.choosePatient')}</option>
            {state.patients.map((p) => <option key={p.id} value={p.id}>{mask(p.mrn)} · {p.ward}</option>)}
          </select>
          <button type="button" className="btn btn--quiet" style={{ alignSelf: 'flex-start' }} onClick={() => nav(`/patients/new?then=${encodeURIComponent(`/waitlist/new?type=${type}`)}`)}>
            <Plus size={18} aria-hidden />
            {t('register.addPatient')}
          </button>
        </div>
        <div className="field">
          <label htmlFor="wt">{t('wait.type')}</label>
          <select id="wt" className="select" value={type} onChange={(e) => setType(e.target.value as ItemType)}>
            {ITEM_TYPES.map((x) => <option key={x} value={x}>{t(`type.${x}` as Key)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="wn">{t('wait.need')}</label>
          <input id="wn" className="input" value={need} onChange={(e) => setNeed(e.target.value)} placeholder={t('wait.needHint')} />
        </div>
        {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}
        <div className="row">
          <button type="submit" className="btn btn--primary btn--lg"><Plus size={20} aria-hidden />{t('wait.add')}</button>
          <button type="button" className="btn btn--secondary btn--lg" onClick={() => nav(-1)}>{t('common.cancel')}</button>
        </div>
      </form>
    </Page>
  );
}
