import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ChevronLeft, ClipboardList, FileSpreadsheet, History, List, UserRound } from 'lucide-react';
import { useT } from '../i18n/i18n';
import type { Key } from '../i18n/i18n';
import { fmtDateTime } from '../lib/format';
import { useStore } from '../store/store';
import { Snackbar } from './ui';

const NAV: { to: string; label: Key; short: Key; icon: typeof List }[] = [
  { to: '/', label: 'nav.register', short: 'nav.register', icon: ClipboardList },
  { to: '/lend', label: 'nav.lend', short: 'nav.lendShort', icon: ArrowLeftRight },
  { to: '/waitlist', label: 'nav.waitlist', short: 'nav.waitlist', icon: List },
  { to: '/history', label: 'nav.history', short: 'nav.history', icon: History },
  { to: '/sheet', label: 'nav.sheet', short: 'nav.sheetShort', icon: FileSpreadsheet },
];

export function Layout() {
  const { t } = useT();
  const { state } = useStore();
  return (
    <div className="app">
      <aside className="side" aria-label="Main">
        <NavLink to="/" className="wordmark" aria-label={t('app.name')}>
          <span className="wordmark__mark" aria-hidden />
          <span className="wordmark__text">OTrace Library</span>
        </NavLink>
        <nav className="stack" style={{ gap: 4 }}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
              <n.icon size={22} aria-hidden />
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        {state.sheetUpdatedAt && (
          <div className="side__foot">
            {t('sheet.lastUpdated', { date: fmtDateTime(state.sheetUpdatedAt), name: state.sheetUpdatedBy ?? '' })}
          </div>
        )}
      </aside>
      <div className="main">
        <Outlet />
      </div>
      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <span className="tab__icon">
              <n.icon size={24} aria-hidden />
            </span>
            <span>{t(n.short)}</span>
          </NavLink>
        ))}
      </nav>
      <Snackbar />
    </div>
  );
}

/** Page header (title, optional back, Admin label) + content. */
export function Page({ title, back, actions, children }: { title: ReactNode; back?: string | true; actions?: ReactNode; children: ReactNode }) {
  const nav = useNavigate();
  const { t } = useT();
  return (
    <>
      <header className="header">
        <h1 className="header__title">
          {back && (
            <button type="button" className="header__back" aria-label={t('common.back')} onClick={() => (back === true ? nav(-1) : nav(back))}>
              <ChevronLeft size={26} aria-hidden />
            </button>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        </h1>
        {actions}
        <span className="hbtn" aria-label="Signed in as Admin">
          <UserRound size={20} aria-hidden />
          <span className="hbtn__text">Admin</span>
        </span>
      </header>
      <main className="content">{children}</main>
    </>
  );
}
