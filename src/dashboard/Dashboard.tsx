import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { KeyGate, useAdminKey, useNoIndex } from '../admin/DataProject';
import { ApiError, adminRequest } from '../data/api';
import { useTheme, type Theme } from '../hooks/useTheme';
import ProjectBoard from './ProjectBoard';
import '../admin/admin.css';
import '@fontsource-variable/plus-jakarta-sans';
import './dashboard.css';

/*
 * Personal project dashboard. It is separate from the portfolio: nothing here reads the
 * site's content. The admin key only keeps the page private.
 */
const BASE = '/mydashboard';

/** "/mydashboard/project/12" opens project 12; any other address under /mydashboard shows the overview. */
function openIdFromPath(path: string): number | null {
  const m = /^\/mydashboard\/project\/(\d+)\/?$/.exec(path);
  return m ? Number(m[1]) : null;
}

/** Follows the address bar so back/forward and reloads land on the same project. */
function useOpenProject() {
  const [openId, setOpenId] = useState(() => openIdFromPath(window.location.pathname));
  useEffect(() => {
    const onPop = () => setOpenId(openIdFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = (id: number | null) => {
    const href = id === null ? BASE : `${BASE}/project/${id}`;
    if (href !== window.location.pathname) window.history.pushState(null, '', href);
    setOpenId(id);
    window.scrollTo(0, 0);
  };
  return { openId, open };
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="dsh-ic" viewBox="0 0 16 16" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Lets a link switch pages in place, while new-tab and modified clicks behave as normal links. */
const follow = (onGo: () => void) => (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  onGo();
};

/** Switches between the light and dark look; the label names the theme it switches to. */
function ThemeButton({ theme, onToggle, className = '' }: { theme: Theme; onToggle: () => void; className?: string }) {
  const label = theme === 'dark' ? 'Light mode' : 'Dark mode';
  return (
    <button type="button" className={`dsh-link dsh-theme ${className}`.trim()} onClick={onToggle} aria-label={label}>
      <Icon>
        {theme === 'dark' ? (
          <path d="M8 5.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5zM8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M3.58 12.42l1.06-1.06M11.36 4.64l1.06-1.06" />
        ) : (
          <path d="M13.25 9.6A5.5 5.5 0 1 1 6.4 2.75a4.5 4.5 0 0 0 6.85 6.85z" />
        )}
      </Icon>
      <span className="dsh-tip" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

/** Brand on the left; theme switch and lock on the right. Shown above every view. */
function TopBar(props: { onHome: () => void; onLock: () => void; theme: Theme; onTheme: () => void }) {
  return (
    <header className="dsh-top">
      <a href={BASE} className="dsh-brand" onClick={follow(props.onHome)}>
        <span className="dsh-brand-mk" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <path d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z" />
          </svg>
        </span>
        MyDashboard
      </a>
      <div className="dsh-top-end">
        <ThemeButton theme={props.theme} onToggle={props.onTheme} />
        <button type="button" className="dsh-link dsh-lock" onClick={props.onLock} aria-label="Lock">
          <Icon>
            <path d="M4 7.5h8a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5zM5.5 7.5V5.25a2.5 2.5 0 0 1 5 0V7.5" />
          </Icon>
          <span className="dsh-tip" aria-hidden="true">
            Lock
          </span>
        </button>
      </div>
    </header>
  );
}

export default function Dashboard() {
  const { theme, toggle } = useTheme();
  const { openId, open } = useOpenProject();
  useNoIndex('My dashboard');
  const { adminKey, unlock, lock } = useAdminKey();

  // A key kept from earlier in the session is checked again; a changed key locks the page.
  useEffect(() => {
    if (!adminKey) return;
    adminRequest(adminKey, 'GET', '/check').catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) lock();
    });
    // lock is a fresh function each render; only a new key needs a check.
  }, [adminKey]);

  if (!adminKey) {
    return (
      <div className="dsh dsh-gate">
        <ThemeButton theme={theme} onToggle={toggle} className="dsh-gate-theme" />
        <main className="dsh-gate-card">
          <span className="ix">
            <b>/</b>mydashboard
          </span>
          <h1>My dashboard</h1>
          <KeyGate onUnlock={unlock} iconOnly />
        </main>
      </div>
    );
  }

  return (
    <div className="dsh">
      <div className="dsh-frame">
        <TopBar onHome={() => open(null)} onLock={lock} theme={theme} onTheme={toggle} />
        <main className="dsh-main">
          <ProjectBoard adminKey={adminKey} onLocked={lock} openId={openId} onOpen={open} />
        </main>
      </div>
    </div>
  );
}
