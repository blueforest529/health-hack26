import { useCallback, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Check, Plus, QrCode, Search, SquareArrowOutUpRight, TriangleAlert } from 'lucide-react';
import { Page } from '../components/Layout';
import { Scanner } from '../components/Scanner';
import { BigActionButton, Due, Empty, HistoryRow, ItemRow, Mrn, StatusBadge } from '../components/ui';
import { useT } from '../i18n/i18n';
import { addDays, fmtDate, mask, normAsset, statusOf } from '../lib/format';
import { useItems, useStore } from '../store/store';

export function LendStart() {
  const { t } = useT();
  const nav = useNavigate();
  const { state } = useStore();
  return (
    <Page title={t('lend.title')}>
      <div className="bigs">
        <BigActionButton primary label={t('lend.lend')} sub={t('lend.lendSub')} icon={<SquareArrowOutUpRight size={32} aria-hidden />} onClick={() => nav('/lend/new')} />
        <BigActionButton label={t('lend.return')} sub={t('lend.returnSub')} icon={<ArrowDownToLine size={32} aria-hidden />} onClick={() => nav('/return')} />
      </div>
      <section className="panel" aria-labelledby="la">
        <div className="panel__head"><h2 className="h3" id="la">{t('lend.lastActions')}</h2></div>
        {state.history.slice(0, 5).map((h) => <HistoryRow key={h.id} h={h} />)}
      </section>
    </Page>
  );
}

function Steps({ current }: { current: number }) {
  const { t } = useT();
  const names = [t('step.item'), t('step.patient'), t('step.due'), t('step.confirm')];
  return (
    <ol className="steps" aria-label={`${current + 1} / 4`}>
      {names.map((n, i) => (
        <li key={n} className={`step${i < current ? ' step--done' : i === current ? ' step--current' : ''}`} aria-current={i === current ? 'step' : undefined}>
          <span className="step__bar" />
          <span className="step__label">{i + 1}. {n}</span>
        </li>
      ))}
    </ol>
  );
}

function Pick({ k, v, onChange }: { k: string; v: React.ReactNode; onChange?: () => void }) {
  const { t } = useT();
  return (
    <div className="pick">
      <span className="pick__k">{k}</span>
      <span className="pick__v">{v}</span>
      {onChange && <button type="button" className="btn btn--quiet" onClick={onChange}>{t('common.change')}</button>}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder, onEnter, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; onEnter?: () => void; autoFocus?: boolean }) {
  return (
    <label className="search">
      <Search size={22} aria-hidden />
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
      />
    </label>
  );
}

export function LendWizard() {
  const { t } = useT();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { itemById, itemByAsset, patientById, state, lend } = useStore();
  const items = useItems();
  const item = itemById(params.get('item') ?? undefined);
  const patient = patientById(params.get('patient') ?? undefined);
  const due = params.get('due');
  const step = !item ? 0 : !patient ? 1 : !due ? 2 : 3;

  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [scan, setScan] = useState(false);
  const [choice, setChoice] = useState<'1' | '2' | 'custom'>('2');
  const [custom, setCustom] = useState(addDays(21));

  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      setParams(next);
      setQ('');
      setError('');
    },
    [params, setParams, setQ, setError],
  );

  // step 0: item
  const available = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter(({ item: i, status }) => status === 'available' && (!n || i.asset.toLowerCase().includes(n) || i.name.toLowerCase().includes(n)));
  }, [items, q]);
  const chooseItemCode = (code: string) => {
    const found = itemByAsset(code);
    if (!found) return setError(t('lend.unknownCode', { code: code.trim() }));
    if (found.loan) return setError(t('lend.notAvailable', { asset: found.asset }));
    set({ item: found.id });
  };

  // step 1: patient
  const patients = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/^•+/, '');
    const waiting = new Map(state.waitlist.filter((w) => item && w.type === item.type).map((w) => [w.patientId, w.need]));
    return state.patients
      .filter((p) => !n || p.mrn.includes(n) || p.name.toLowerCase().includes(n) || p.ward.toLowerCase().includes(n))
      .map((p) => ({ p, need: waiting.get(p.id) }))
      .sort((a, b) => Number(!!b.need) - Number(!!a.need));
  }, [state.patients, state.waitlist, q, item]);
  const choosePatientCode = (code: string) => {
    const mrn = code.replace(/\D/g, '');
    const found = state.patients.find((p) => p.mrn === mrn);
    if (!found) return setError(t('lend.noPatient'));
    set({ patient: found.id });
  };

  const dueDate = choice === '1' ? addDays(7) : choice === '2' ? addDays(14) : custom;
  const back = () => (step === 0 ? nav('/lend') : step === 1 ? set({ item: null }) : step === 2 ? set({ patient: null }) : set({ due: null }));

  return (
    <Page title={t('lend.heading')} back="/lend">
      <div className="wizard stack">
        <Steps current={step} />
        {item && <Pick k={t('step.item')} v={<>{item.asset} · {item.name}</>} onChange={() => set({ item: null, due: null })} />}
        {patient && <Pick k={t('step.patient')} v={<><Mrn mrn={patient.mrn} /> · {patient.ward}</>} onChange={() => set({ patient: null, due: null })} />}
        {due && step === 3 && <Pick k={t('step.due')} v={fmtDate(due)} onChange={() => set({ due: null })} />}

        {step === 0 && (
          <>
            <h2 className="h2">{t('lend.chooseItem')}</h2>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => setScan(true)}>
              <QrCode size={22} aria-hidden />
              {t('lend.scanLabel')}
            </button>
            <SearchBox value={q} onChange={(v) => { setQ(v); setError(''); }} placeholder={t('lend.searchItem')} onEnter={() => q.trim() && chooseItemCode(q)} autoFocus />
            {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}
            <div className="list">
              {available.length ? (
                available.map(({ item: i }) => <ItemRow key={i.id} asset={i.asset} name={i.name} status="available" meta={i.home} onClick={() => set({ item: i.id })} />)
              ) : (
                <Empty title={t('lend.noAvailable')} />
              )}
            </div>
            <p className="muted" style={{ margin: 0 }}>{t('lend.onlyAvailable')}</p>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="h2">{t('lend.choosePatient')}</h2>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => setScan(true)}>
              <QrCode size={22} aria-hidden />
              {t('lend.scanWristband')}
            </button>
            <SearchBox value={q} onChange={(v) => { setQ(v); setError(''); }} placeholder={t('lend.searchPatient')} onEnter={() => q.trim() && choosePatientCode(q)} autoFocus />
            {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}
            <div className="list">
              {patients.length ? (
                patients.map(({ p, need }) => (
                  <ItemRow key={p.id} asset={mask(p.mrn)} name={p.ward} meta={need ? <span className="row"><StatusBadge status="waiting" />{t('lend.waitingFor', { need })}</span> : undefined} onClick={() => set({ patient: p.id })} />
                ))
              ) : (
                <Empty title={t('lend.noPatient')} />
              )}
            </div>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => nav(`/patients/new?then=${encodeURIComponent(`/lend/new?item=${item!.id}&patient=__PATIENT__`)}`)}>
              <Plus size={20} aria-hidden />
              {t('register.addPatient')}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="h2">{t('lend.dueQ')}</h2>
            <div className="choices" role="radiogroup" aria-label={t('lend.dueQ')}>
              {(['1', '2', 'custom'] as const).map((c) => (
                <button key={c} type="button" role="radio" aria-checked={choice === c} className={`choice${choice === c ? ' choice--on' : ''}`} onClick={() => setChoice(c)}>
                  {c === '1' ? t('lend.week1') : c === '2' ? t('lend.week2') : t('lend.custom')}
                  <small>{c === 'custom' ? t('lend.pickDate') : t('due', { date: fmtDate(addDays(c === '1' ? 7 : 14)) })}</small>
                </button>
              ))}
            </div>
            {choice === 'custom' && (
              <div className="field" style={{ maxWidth: 280 }}>
                <label htmlFor="due">{t('lend.pickDate')}</label>
                <input id="due" type="date" className="input" min={addDays(1)} value={custom} onChange={(e) => setCustom(e.target.value)} />
              </div>
            )}
          </>
        )}

        {step === 3 && item && patient && due && (
          <>
            <h2 className="h2">{t('lend.check')}</h2>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => { lend(item.id, patient.id, due); nav('/lend', { replace: true }); }}>
              <SquareArrowOutUpRight size={22} aria-hidden />
              {t('lend.lendItem')}
            </button>
          </>
        )}

        <div className="row spread">
          <button type="button" className="btn btn--secondary" onClick={back}>{t('common.back')}</button>
          {step === 2 && (
            <button type="button" className="btn btn--primary btn--lg" disabled={!dueDate} onClick={() => set({ due: dueDate })}>
              {t('common.next')}
            </button>
          )}
        </div>
      </div>
      {scan && (
        <Scanner
          onClose={() => setScan(false)}
          onCode={(code) => { setScan(false); if (step === 0) chooseItemCode(normAsset(code)); else choosePatientCode(code); }}
        />
      )}
    </Page>
  );
}

export function ReturnPage() {
  const { t } = useT();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { itemById, itemByAsset, patientById, returnItem } = useStore();
  const items = useItems();
  const item = itemById(params.get('item') ?? undefined);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [scan, setScan] = useState(false);

  const out = useMemo(() => {
    const n = q.trim().toLowerCase();
    return items.filter(({ item: i }) => i.loan && (!n || i.asset.toLowerCase().includes(n) || i.name.toLowerCase().includes(n) || (patientById(i.loan.patientId)?.mrn ?? '').includes(n)));
  }, [items, q, patientById]);

  const choose = (code: string) => {
    const found = itemByAsset(code);
    if (!found) return setError(t('lend.unknownCode', { code: code.trim() }));
    if (!found.loan) return setError(t('ret.notOnLoan', { asset: found.asset }));
    setParams({ item: found.id });
    setQ('');
    setError('');
  };

  const p = item?.loan ? patientById(item.loan.patientId) : undefined;
  return (
    <Page title={t('ret.heading')} back="/lend">
      <div className="wizard stack">
        <h2 className="h2">{t('ret.choose')}</h2>
        {item && item.loan ? (
          <>
            <Pick k={t('step.item')} v={<>{item.asset} · {item.name}</>} onChange={() => setParams({})} />
            <section className="panel" aria-labelledby="who">
              <div className="panel__head">
                <h3 className="h3" id="who">{t('ret.whoHas')}</h3>
                <StatusBadge status={statusOf(item)} />
              </div>
              <div className="panel--pad">
                <dl className="kv">
                  <dt>{t('col.patient')}</dt><dd><Mrn mrn={p?.mrn} /></dd>
                  <dt>{t('patient.ward')}</dt><dd>{p?.ward}</dd>
                  <dt>{t('ret.lent')}</dt><dd>{fmtDate(item.loan.lentAt.slice(0, 10))}</dd>
                  <dt>{t('col.due')}</dt><dd><Due date={item.loan.due} /></dd>
                </dl>
              </div>
            </section>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => { returnItem(item.id); setParams({}, { replace: true }); }}>
              <ArrowDownToLine size={22} aria-hidden />
              {t('ret.returnItem')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => setScan(true)}>
              <QrCode size={22} aria-hidden />
              {t('lend.scanLabel')}
            </button>
            <SearchBox value={q} onChange={(v) => { setQ(v); setError(''); }} placeholder={t('lend.searchItem')} onEnter={() => q.trim() && choose(q)} autoFocus />
            {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}
            <div className="list">
              {out.length ? (
                out.map(({ item: i, status }) => {
                  const pp = patientById(i.loan!.patientId);
                  return <ItemRow key={i.id} asset={i.asset} name={i.name} status={status} meta={<><Mrn mrn={pp?.mrn} /><span>{pp?.ward}</span><Due date={i.loan!.due} /></>} onClick={() => setParams({ item: i.id })} />;
                })
              ) : (
                <Empty icon={<Check size={28} />} title={t('ret.noneOut')} />
              )}
            </div>
            <p className="muted" style={{ margin: 0 }}>{t('ret.onlyOnLoan')}</p>
            <div><button type="button" className="btn btn--secondary" onClick={() => nav('/lend')}>{t('common.back')}</button></div>
          </>
        )}
      </div>
      {scan && <Scanner onClose={() => setScan(false)} onCode={(code) => { setScan(false); choose(code); }} />}
    </Page>
  );
}
