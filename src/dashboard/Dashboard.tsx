import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { KeyGate, useAdminKey, useNoIndex } from '../admin/DataProject';
import { ApiError, adminRequest } from '../data/api';
import { useTheme } from '../hooks/useTheme';
import ProjectBoard from './ProjectBoard';
import '../admin/admin.css';
import './dashboard.css';

/*
 * Personal dashboard. It is separate from the portfolio: nothing here reads the site's
 * content. The admin key only keeps the page private.
 */
const BASE = '/mydashboard';

type PageId = 'home' | 'project' | 'ibadah' | 'run' | 'buku' | 'learning' | 'vocab';

const pages: { id: PageId; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <path d="M2.5 7.5 8 3l5.5 4.5V13a.5.5 0 0 1-.5.5H9.75V10h-3.5v3.5H3a.5.5 0 0 1-.5-.5z" /> },
  { id: 'project', label: 'Project', icon: <path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" /> },
  { id: 'ibadah', label: 'Ibadah', icon: <path d="M10.5 2.75a5.25 5.25 0 1 0 2.75 9.72A6 6 0 0 1 10.5 2.75z" /> },
  { id: 'run', label: 'Run', icon: <path d="M2 11.5h3l1.5-3 2.5 5 2-4h3M9.5 2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" /> },
  {
    id: 'buku',
    label: 'Buku',
    icon: <path d="M8 4.75C6.75 3.75 5 3.5 2.5 3.5v8.75c2.5 0 4.25.25 5.5 1.25 1.25-1 3-1.25 5.5-1.25V3.5c-2.5 0-4.25.25-5.5 1.25zM8 4.75v8.75" />,
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: <path d="M1.5 6 8 3l6.5 3L8 9zM4.25 7.75v2.75c0 1 1.7 2 3.75 2s3.75-1 3.75-2V7.75M14.5 6v3.25" />,
  },
  {
    id: 'vocab',
    label: 'Vocab',
    icon: <path d="M2.5 3.5h11v7.25H8l-3 2.5v-2.5H2.5zM5.5 9 7 5l1.5 4M6 7.75h2M10 6.25h1.75M10 8h1.75" />,
  },
];

const hrefOf = (id: PageId, sub?: string | null) => (id === 'home' ? BASE : `${BASE}/${id}${sub ? `/${sub}` : ''}`);

type Route = { page: PageId; sub: string | null };

/** "/mydashboard/project/12" reads as page "project" with sub-path "12". */
function routeFromPath(path: string): Route {
  const [seg = '', sub = null] = path.replace(/\/+$/, '').slice(BASE.length).replace(/^\//, '').split('/');
  return pages.some((p) => p.id === seg) ? { page: seg as PageId, sub } : { page: 'home', sub: null };
}

/** Follows the address bar so back/forward and reloads land on the same page. */
function usePage() {
  const [route, setRoute] = useState(() => routeFromPath(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = (page: PageId, sub: string | null = null) => {
    if (page !== route.page || sub !== route.sub) window.history.pushState(null, '', hrefOf(page, sub));
    setRoute({ page, sub });
    window.scrollTo(0, 0);
  };
  return { ...route, go };
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

function Sidebar({ page, onGo, onLock }: { page: PageId; onGo: (id: PageId) => void; onLock: () => void }) {
  return (
    <aside className="dsh-side">
      <a href={BASE} className="dsh-logo" aria-label="My dashboard, home" onClick={follow(() => onGo('home'))}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={16 + Math.cos(a) * 11} cy={16 + Math.sin(a) * 11} r={i % 3 === 0 ? 2 : 1.4} />;
          })}
          <circle cx="16" cy="16" r="3.2" />
        </svg>
      </a>
      <nav aria-label="Dashboard">
        <ul>
          {pages.map((p) => (
            <li key={p.id}>
              <a
                href={hrefOf(p.id)}
                className="dsh-link"
                aria-label={p.label}
                aria-current={p.id === page ? 'page' : undefined}
                onClick={follow(() => onGo(p.id))}
              >
                <Icon>{p.icon}</Icon>
                <span className="dsh-tip" aria-hidden="true">
                  {p.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" className="dsh-link dsh-lock" onClick={onLock} aria-label="Lock">
        <Icon>
          <path d="M4 7.5h8a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5zM5.5 7.5V5.25a2.5 2.5 0 0 1 5 0V7.5" />
        </Icon>
        <span className="dsh-tip" aria-hidden="true">
          Lock
        </span>
      </button>
    </aside>
  );
}

function jakartaNow() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(now));
  const date = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(now);
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  return { greeting, date };
}

function Home({ onGo }: { onGo: (id: PageId) => void }) {
  const [{ greeting, date }, setNow] = useState(jakartaNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(jakartaNow()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <header className="dsh-head">
        <span className="ix">{date}</span>
        <h1>{greeting}.</h1>
      </header>
      <ul className="dsh-tiles">
        {pages
          .filter((p) => p.id !== 'home')
          .map((p) => (
            <li key={p.id}>
              <a href={hrefOf(p.id)} onClick={follow(() => onGo(p.id))}>
                <span className="dsh-tile-ic">
                  <Icon>{p.icon}</Icon>
                </span>
                <span className="dsh-tile-lb">{p.label}</span>
                <span className="dsh-tile-go" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
      </ul>
    </>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <>
      <header className="dsh-head">
        <span className="ix">
          <b>/</b>
          {label.toLowerCase()}
        </span>
        <h1>{label}</h1>
      </header>
      <div className="dsh-empty">
        <p>Belum ada isi.</p>
      </div>
    </>
  );
}

export default function Dashboard() {
  useTheme();
  const { page, sub, go } = usePage();
  const current = pages.find((p) => p.id === page)!;
  useNoIndex(`${current.label} · My dashboard`);
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
      <Sidebar page={page} onGo={go} onLock={lock} />
      <main className={page === 'project' ? 'dsh-main wide' : 'dsh-main'}>
        {page === 'home' && <Home onGo={go} />}
        {page === 'project' && (
          <ProjectBoard
            adminKey={adminKey}
            onLocked={lock}
            openId={sub && /^\d+$/.test(sub) ? Number(sub) : null}
            onOpen={(id) => go('project', id === null ? null : String(id))}
          />
        )}
        {page !== 'home' && page !== 'project' && <Empty label={current.label} />}
      </main>
    </div>
  );
}
