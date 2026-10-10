import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Clock, Download, FileSpreadsheet, Pencil, Plus, RotateCcw, TriangleAlert, Upload } from 'lucide-react';
import { Page } from '../components/Layout';
import { useT } from '../i18n/i18n';
import type { Key } from '../i18n/i18n';
import { exportTracker, readTracker } from '../lib/excel';
import type { ImportPlan, Problem } from '../lib/excel';
import { fmtDateTime } from '../lib/format';
import { useWide } from '../lib/useMedia';
import { useStore } from '../store/store';

const PROB: Record<Problem['kind'], [Key, Key]> = {
  noAsset: ['prob.noAsset', 'prob.skip'],
  dup: ['prob.dup', 'prob.dupDo'],
  badDate: ['prob.badDate', 'prob.badDateDo'],
  noMrn: ['prob.noMrn', 'prob.noMrnDo'],
};

export function UpdateSheet() {
  const { t } = useT();
  const wide = useWide();
  const { state, replaceAll, resetDemo, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);

  const read = async (file?: File) => {
    if (!file) return;
    setError('');
    setPlan(null);
    setBusy(true);
    try {
      const p = await readTracker(file, state);
      if (p.added + p.updated === 0 && p.problems.length === 0) setError(t('sheet.noRows'));
      else setPlan(p);
    } catch {
      setError(t('sheet.readError'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    read(e.dataTransfer.files[0]);
  };

  const probText = (p: Problem) => t(PROB[p.kind][0], { asset: p.asset, v: p.value ?? '' });

  return (
    <Page title={t('sheet.title')}>
      <div className="note">
        <Clock size={22} aria-hidden style={{ flex: 'none', marginTop: 1 }} />
        <span>{state.sheetUpdatedAt ? t('sheet.lastUpdated', { date: fmtDateTime(state.sheetUpdatedAt), name: state.sheetUpdatedBy ?? '' }) : t('sheet.never')}</span>
      </div>

      <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => read(e.target.files?.[0])} />

      {!plan ? (
        <div className={`drop${over ? ' drop--over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
          <FileSpreadsheet size={36} color="var(--brand-primary)" aria-hidden />
          <b className="h3">{t('sheet.import')}</b>
          <p>{t('sheet.importHint')}</p>
          <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={() => input.current?.click()}>
            <Upload size={20} aria-hidden />
            {busy ? t('sheet.reading') : t('sheet.choose')}
          </button>
        </div>
      ) : (
        <section className="stack" aria-labelledby="pv">
          <div className="row spread">
            <h2 className="h2" id="pv">{t('sheet.preview', { file: plan.file })}</h2>
            <div className="row">
              <button type="button" className="btn btn--secondary" onClick={() => input.current?.click()}>{t('sheet.chooseOther')}</button>
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => {
                  replaceAll({ items: plan.items, patients: plan.patients }, `imported|${plan.added + plan.updated}|${plan.problems.length}`);
                  setPlan(null);
                }}
              >
                <Upload size={20} aria-hidden />
                {t('sheet.importBtn')}
              </button>
            </div>
          </div>
          <div className="stats">
            <div className="panel stat"><div className="row"><Plus size={20} aria-hidden /><b>{t('sheet.new')}</b></div><div className="stat__n">{plan.added}</div><span className="muted">{t('sheet.newHint')}</span></div>
            <div className="panel stat"><div className="row"><Pencil size={20} aria-hidden /><b>{t('sheet.updated')}</b></div><div className="stat__n">{plan.updated}</div><span className="muted">{t('sheet.updatedHint')}</span></div>
            <div className={`panel stat${plan.problems.length ? ' stat--warn' : ''}`}><div className="row stat__label"><TriangleAlert size={20} aria-hidden /><b>{t('sheet.problems')}</b></div><div className="stat__n">{plan.problems.length}</div><span className="muted">{t('sheet.problemsHint')}</span></div>
          </div>
          {plan.problems.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>{t('sheet.noProblems')}</p>
          ) : wide ? (
            <div className="panel table-wrap">
              <table className="table">
                <thead><tr><th>{t('sheet.row')}</th><th>{t('col.asset')}</th><th>{t('sheet.problem')}</th><th>{t('sheet.willDo')}</th></tr></thead>
                <tbody>
                  {plan.problems.map((p, i) => (
                    <tr key={i}><td className="num">{p.row}</td><td className="asset">{p.asset || '–'}</td><td>{probText(p)}</td><td>{t(PROB[p.kind][1])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="list">
              {plan.problems.map((p, i) => (
                <div key={i} className="irow" style={{ cursor: 'default' }}>
                  <span className="irow__main">
                    <span className="irow__title">{t('sheet.row')} {p.row}{p.asset && <span>{p.asset}</span>}</span>
                    <span className="irow__meta">{probText(p)}</span>
                    <span className="irow__meta">→ {t(PROB[p.kind][1])}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {error && <p className="error" role="alert"><TriangleAlert size={20} aria-hidden />{error}</p>}

      <section className="panel panel--pad row spread" style={{ gap: 16 }}>
        <span>
          <b>{t('sheet.export')}</b>
          <br />
          <span className="muted">{t('sheet.exportHint')}</span>
        </span>
        <button type="button" className="btn btn--secondary" onClick={async () => { await exportTracker(state); notify('exported'); }}>
          <Download size={20} aria-hidden />
          {t('sheet.exportBtn')}
        </button>
      </section>

      <section className="row spread" style={{ gap: 16 }}>
        <span className="muted">{t('sheet.resetHint')}</span>
        <button type="button" className="btn btn--quiet" onClick={resetDemo}>
          <RotateCcw size={18} aria-hidden />
          {t('sheet.reset')}
        </button>
      </section>
    </Page>
  );
}
