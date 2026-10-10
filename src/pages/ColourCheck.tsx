import { Check, Eye } from 'lucide-react';
import { Page } from '../components/Layout';
import { StatusBadge } from '../components/ui';
import type { Status } from '../data/types';
import { VISIONS, useVision, visionFilter } from '../lib/colorVision';

const STATUSES: Status[] = ['available', 'onloan', 'overdue', 'waiting'];

/** Shows every status badge under each colour-vision type, and lets staff view the whole app that way. */
export function ColourCheck() {
  const { vision, setVision } = useVision();
  const current = VISIONS.find((v) => v.id === vision)!;
  return (
    <Page title="Colour check">
      <section className="panel panel--pad stack" aria-labelledby="cv-mode">
        <div className="row" style={{ gap: 'var(--s3)' }}>
          <Eye size={24} aria-hidden />
          <h2 className="h2" id="cv-mode">View the app as</h2>
        </div>
        <div className="chips" role="radiogroup" aria-labelledby="cv-mode">
          {VISIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={vision === v.id}
              className={`chip${vision === v.id ? ' chip--on' : ''}`}
              onClick={() => setVision(v.id)}
            >
              {vision === v.id && <Check size={18} aria-hidden />}
              {v.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {vision === 'normal'
            ? 'Pick a type to see every screen the way a colour-blind colleague would. It stays on until you switch back.'
            : `Every screen is now shown as ${current.label} (${current.hint.toLowerCase()}). Switch back to Normal when done.`}
        </p>
      </section>

      <section className="panel" aria-labelledby="cv-grid">
        <div className="panel__head">
          <h2 className="h2" id="cv-grid">Status badges side by side</h2>
        </div>
        <div className="cvgrid">
          {VISIONS.map((v) => (
            <div className="cvgrid__row" key={v.id}>
              <div className="cvgrid__label">
                <b>{v.label}</b>
                <span className="muted">{v.hint}</span>
              </div>
              {/* In a non-normal app mode the page filter already applies; only simulate per row in Normal. */}
              <div className="cvgrid__badges" style={{ filter: vision === 'normal' ? visionFilter(v.id) : 'none' }}>
                {STATUSES.map((s) => (
                  <StatusBadge key={s} status={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="note">
        <p style={{ margin: 0 }}>
          <b>Shape + word, never colour alone.</b> Each status has its own icon and border style (solid, filled, dashed), so it reads the same in every row.
        </p>
      </div>
    </Page>
  );
}
