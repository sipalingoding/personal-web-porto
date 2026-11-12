import { useEffect, useState, type ReactNode } from 'react';
import { KeyGate, useAdminKey, useNoIndex } from '../admin/DataProject';
import { ApiError, adminRequest } from '../data/api';
import { useTheme, type Theme } from '../hooks/useTheme';
import { HomeView } from './Home';
import { HouseContext } from './houseContext';
import type { RoomKey } from './isoScene';
import { RoomPage, roomHref, rooms } from './Rooms';
import ProjectBoard from './ProjectBoard';
import '../admin/admin.css';
import '@fontsource-variable/plus-jakarta-sans';
import './dashboard.css';

/*
 * Personal project dashboard. It is separate from the portfolio: nothing here reads the
 * site's content. The admin key only keeps the page private.
 */
const BASE = '/mydashboard';

/** The house (front page), a room's page, or a project's page. */
type Route = { kind: 'home' } | { kind: 'room'; room: RoomKey } | { kind: 'project'; id: number };

/** "/mydashboard/project/12" is project 12, "/mydashboard/baca" a room; anything else under /mydashboard is the house. */
function routeOf(path: string): Route {
  const p = /^\/mydashboard\/project\/(\d+)\/?$/.exec(path);
  if (p) return { kind: 'project', id: Number(p[1]) };
  const r = /^\/mydashboard\/([a-z]+)\/?$/.exec(path);
  const room = r && rooms.find((x) => x.slug === r[1]);
  return room ? { kind: 'room', room: room.key } : { kind: 'home' };
}

const hrefOf = (to: Route) => (to.kind === 'home' ? BASE : to.kind === 'room' ? roomHref(to.room) : `${BASE}/project/${to.id}`);

/** Follows the address bar so back/forward and reloads land on the same page. */
function useRoute() {
  const [route, setRoute] = useState(() => routeOf(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(routeOf(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = (to: Route) => {
    const href = hrefOf(to);
    if (href !== window.location.pathname) window.history.pushState(null, '', href);
    setRoute(to);
    window.scrollTo(0, 0);
  };
  return { route, go };
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="dsh-ic" viewBox="0 0 16 16" aria-hidden="true">
      {children}
    </svg>
  );
}

/** A lamp that switches the theme: lit in the light theme, off in the dark one. */
function ThemeButton({ theme, onToggle, className = '' }: { theme: Theme; onToggle: () => void; className?: string }) {
  const label = theme === 'dark' ? 'Nyalakan lampu' : 'Matikan lampu';
  return (
    <button type="button" className={`dsh-link dsh-theme ${className}`.trim()} onClick={onToggle} aria-label={label}>
      <Icon>
        <path d="M6.25 13.5h3.5M6.5 11.5h3M8 3a3.75 3.75 0 0 0-2.3 6.7c.5.4.8.9.8 1.8h3c0-.9.3-1.4.8-1.8A3.75 3.75 0 0 0 8 3z" />
        {theme === 'light' && <path d="M8 .75v.75M2.9 2.9l.55.55M13.1 2.9l-.55.55M1 7.5h.75M14.25 7.5H15" />}
      </Icon>
      <span className="dsh-tip" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

/** Lamp (theme) and front-door key (lock) at the top right of a project page. */
function TopBar(props: { onLock: () => void; theme: Theme; onTheme: () => void }) {
  return (
    <header className="dsh-top">
      <div className="dsh-top-end">
        <ThemeButton theme={props.theme} onToggle={props.onTheme} />
        <button type="button" className="dsh-link dsh-lock" onClick={props.onLock} aria-label="Kunci pintu (lock)">
          <Icon>
            <path d="M10.25 2.5a3.25 3.25 0 1 1-2.9 4.72L2.5 12.1v1.4h1.75v-1.25H5.5V11h1.25l1.33-1.33A3.25 3.25 0 0 1 10.25 2.5zM11 5.25h.01" />
          </Icon>
          <span className="dsh-tip" aria-hidden="true">
            Kunci pintu
          </span>
        </button>
      </div>
    </header>
  );
}

/** The house's front door, shut, with the key in the lock: the picture on the lock screen. */
function FrontDoor() {
  return (
    <svg className="dsh-door" viewBox="0 0 120 150" aria-hidden="true">
      <rect className="dsh-door-wall" x="0" y="0" width="120" height="150" rx="18" />
      <rect className="dsh-door-frame" x="26" y="22" width="68" height="118" rx="5" />
      <rect className="dsh-door-leaf" x="31" y="27" width="58" height="113" rx="3" />
      <rect className="dsh-door-panel" x="37" y="34" width="20" height="44" rx="2" />
      <rect className="dsh-door-panel" x="63" y="34" width="20" height="44" rx="2" />
      <rect className="dsh-door-panel" x="37" y="86" width="20" height="46" rx="2" />
      <rect className="dsh-door-panel" x="63" y="86" width="20" height="46" rx="2" />
      <rect className="dsh-door-knob" x="74" y="80" width="11" height="4" rx="2" />
      <circle className="dsh-door-lock" cx="79" cy="92" r="2.2" />
      <path className="dsh-door-key" d="M79 94v10M79 101h3M79 104h2" />
      <circle className="dsh-door-key-ring" cx="79" cy="108" r="3.5" />
      <rect className="dsh-door-mat" x="20" y="140" width="80" height="6" rx="3" />
    </svg>
  );
}

export default function Dashboard() {
  const { theme, toggle } = useTheme();
  const { route, go } = useRoute();
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
          <FrontDoor />
          <h1>Pintu terkunci</h1>
          <KeyGate onUnlock={unlock} iconOnly />
        </main>
      </div>
    );
  }

  return (
    <HouseContext.Provider value={{ theme, onTheme: toggle, onLock: lock }}>
      <div className="dsh">
        <div className="dsh-frame">
          {/* The house and the room pages have their own lamp and key; only a project page has the bar. */}
          {route.kind === 'project' && <TopBar onLock={lock} theme={theme} onTheme={toggle} />}
          <main className="dsh-main">
            {route.kind === 'home' ? (
              <HomeView onRoom={(room) => go({ kind: 'room', room })} />
            ) : route.kind === 'room' && route.room !== 'work' ? (
              <RoomPage room={route.room} onHome={() => go({ kind: 'home' })} />
            ) : (
              <ProjectBoard
                adminKey={adminKey}
                onLocked={lock}
                openId={route.kind === 'project' ? route.id : null}
                onOpen={(id) => go({ kind: 'project', id })}
                onRoom={(room) => go(room ? { kind: 'room', room } : { kind: 'home' })}
              />
            )}
          </main>
        </div>
      </div>
    </HouseContext.Provider>
  );
}
