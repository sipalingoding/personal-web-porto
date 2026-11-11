import { useEffect, useState, type ReactNode } from 'react';
import { boardStatuses, statusLabel, type BoardFeature, type BoardProject, type BoardStatus, type BoardTask } from '../data/board';
import { Glyph } from './icons';
import IsoOffice, { scene } from './IsoOffice';

/*
 * The dashboard's front page: a title, the isometric office with a label over each
 * cubicle for a project, an overview gauge with totals, the tasks by status, every
 * project with its progress, and the latest tasks.
 */

const JKT = 'Asia/Jakarta';

function jakartaNow() {
  const d = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: JKT }).format(d));
  const date = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: JKT }).format(d);
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  return { greeting, date };
}

/** Greeting and date in Jakarta, refreshed every minute. */
export function useJakartaClock() {
  const [now, setNow] = useState(jakartaNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(jakartaNow()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function HomeTitle() {
  const now = useJakartaClock();
  return (
    <header className="hm-title">
      <h1>
        Project <span>Dashboard</span>
      </h1>
      <p>
        {now.greeting} · {now.date}
      </p>
    </header>
  );
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

type Stat = { total: number; done: number; inProgress: number };

function statOf(tasks: BoardTask[]): Stat {
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'done').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
  };
}

/** Selesai when every task is done, On progress when any task has started, else Not started. */
function stateOf(s: Stat): BoardStatus {
  if (s.total > 0 && s.done === s.total) return 'done';
  return s.inProgress > 0 || s.done > 0 ? 'in_progress' : 'not_started';
}

function Initial({ project }: { project: BoardProject }) {
  return (
    <span className={`hm-init ${project.kind.toLowerCase()}`} aria-hidden="true">
      {project.title.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ office map */

function OfficeMap(props: { projects: BoardProject[]; stats: Map<number, Stat>; onOpen: (id: number) => void; tools: ReactNode }) {
  const shown = props.projects.slice(0, scene.anchors.length);
  return (
    <div className="hm-map">
      <div className="hm-tools">{props.tools}</div>
      <div className="hm-scene" style={{ aspectRatio: `${scene.width} / ${scene.height}`, ['--ar' as string]: scene.width / scene.height }}>
        <IsoOffice />
        {shown.map((p, i) => {
          const s = props.stats.get(p.id)!;
          const a = scene.anchors[i];
          return (
            <button
              key={p.id}
              type="button"
              className="hm-pin"
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              onClick={() => props.onOpen(p.id)}
              aria-label={`${p.title}: ${s.done} dari ${s.total} task selesai. Buka project.`}
            >
              <Initial project={p} />
              <span className="hm-pin-tx">
                <b>{p.title}</b>
                <span>
                  {s.done} / {s.total}
                  <i className={`hm-dot ${stateOf(s)}`} aria-hidden="true" />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ overview */

const TICKS = 44;

/** Arc of ticks from lower left over the top to lower right; the first share of them is lit. */
function Gauge({ value }: { value: number | null }) {
  const lit = value === null ? 0 : Math.round((value / 100) * TICKS);
  const start = 200;
  const sweep = 220;
  return (
    <div className="hm-gauge">
      <svg viewBox="-100 -100 200 135" aria-hidden="true">
        {Array.from({ length: TICKS }, (_, i) => {
          const a = ((start - (i / (TICKS - 1)) * sweep) * Math.PI) / 180;
          const [c, s] = [Math.cos(a), -Math.sin(a)];
          return (
            <line
              key={i}
              x1={(c * 70).toFixed(2)}
              y1={(s * 70).toFixed(2)}
              x2={(c * 90).toFixed(2)}
              y2={(s * 90).toFixed(2)}
              className={i < lit ? 'on' : undefined}
              style={i < lit ? { stroke: `color-mix(in srgb, var(--hm-teal) ${Math.round((i / TICKS) * 100)}%, var(--hm-blue))` } : undefined}
            />
          );
        })}
      </svg>
      <p className="hm-gauge-v">
        <b>
          {value === null ? '–' : value}
          {value !== null && <small>%</small>}
        </b>
        <span>Progress keseluruhan</span>
      </p>
    </div>
  );
}

function Overview(props: { projects: BoardProject[]; tasks: BoardTask[]; stats: Map<number, Stat> }) {
  const all = statOf(props.tasks);
  const finished = props.projects.filter((p) => stateOf(props.stats.get(p.id)!) === 'done').length;
  const tiles: { icon: ReactNode; label: string; value: number; note: string }[] = [
    { icon: <path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />, label: 'Total project', value: props.projects.length, note: `${finished} selesai` },
    { icon: <path d="M3 4h10M3 8h10M3 12h6" />, label: 'Task open', value: all.total - all.done, note: `dari ${all.total} task` },
    { icon: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />, label: 'Task selesai', value: all.done, note: `${pct(all.done, all.total)}% dari semua` },
  ];
  return (
    <section className="hm-card hm-over" aria-label="Overview">
      <header className="hm-card-hd">
        <h2>
          <span className="hm-hd-ic">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" />
            </svg>
          </span>
          Overview
        </h2>
      </header>
      <Gauge value={all.total ? pct(all.done, all.total) : null} />
      <dl className="hm-tiles">
        {tiles.map((t) => (
          <div key={t.label}>
            <svg className="hm-tile-ic" viewBox="0 0 16 16" aria-hidden="true">
              {t.icon}
            </svg>
            <dt>{t.label}</dt>
            <dd>{t.value}</dd>
            <span>{t.note}</span>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StatusCard({ tasks }: { tasks: BoardTask[] }) {
  return (
    <section className="hm-card" aria-label="Status task">
      <header className="hm-card-hd">
        <h2>
          <span className="hm-hd-ic">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM8 5v3l2 1.5" />
            </svg>
          </span>
          Status task
        </h2>
      </header>
      <ul className="hm-status">
        {boardStatuses.map((st) => {
          const n = tasks.filter((t) => t.status === st).length;
          return (
            <li key={st} className={st}>
              <span>{statusLabel[st]}</span>
              <b>{n}</b>
              <small>{pct(n, tasks.length)}% task</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ lists */

function ProjectTable(props: { projects: BoardProject[]; stats: Map<number, Stat>; onOpen: (id: number) => void; onAdd: () => void }) {
  return (
    <section className="hm-card hm-projects" aria-label="Project">
      <header className="hm-card-hd">
        <h2>
          <span className="hm-hd-ic">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
            </svg>
          </span>
          Project
        </h2>
        <span className="hm-chip">{props.projects.length} project</span>
      </header>
      {props.projects.length === 0 ? (
        <div className="hm-empty">
          <p>Belum ada project.</p>
          <button type="button" className="hm-pill p" onClick={props.onAdd}>
            <Glyph name="plus" />
            Add project
          </button>
        </div>
      ) : (
        <ul className="hm-rows">
          {props.projects.map((p) => {
            const s = props.stats.get(p.id)!;
            const v = pct(s.done, s.total);
            return (
              <li key={p.id}>
                <a
                  href={`/mydashboard/project/${p.id}`}
                  className="hm-prow"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    props.onOpen(p.id);
                  }}
                >
                  <Initial project={p} />
                  <span className="hm-prow-name">
                    <b>{p.title}</b>
                    <span>{p.kind}</span>
                  </span>
                  <span className={`hm-bar ${stateOf(s)}`} aria-hidden="true">
                    <i style={{ width: `${v}%` }} />
                  </span>
                  <span className="hm-num">
                    {s.done} / {s.total}
                  </span>
                  <span className="hm-num hm-pct">{s.total ? `${v}%` : '–'}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: JKT }).format(new Date(iso));

function RecentTasks(props: { tasks: BoardTask[]; projects: BoardProject[]; features: BoardFeature[]; onOpen: (id: number) => void }) {
  const byId = new Map(props.projects.map((p) => [p.id, p]));
  const feature = new Map(props.features.map((f) => [f.id, f.name]));
  const latest = [...props.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id).slice(0, 6);
  return (
    <section className="hm-card" aria-label="Task terbaru">
      <header className="hm-card-hd">
        <h2>
          <span className="hm-hd-ic">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 4h10M3 8h10M3 12h6" />
            </svg>
          </span>
          Task terbaru
        </h2>
      </header>
      {latest.length === 0 ? (
        <div className="hm-empty">
          <p>Belum ada task.</p>
        </div>
      ) : (
        <ul className="hm-rows">
          {latest.map((t) => {
            const p = byId.get(t.projectId);
            if (!p) return null;
            const f = t.featureId !== null ? feature.get(t.featureId) : undefined;
            return (
              <li key={t.id}>
                <a
                  href={`/mydashboard/project/${p.id}`}
                  className="hm-trow"
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    props.onOpen(p.id);
                  }}
                >
                  <Initial project={p} />
                  <span className="hm-prow-name">
                    <b>{t.title}</b>
                    <span>
                      {p.title}
                      {f ? ` · ${f}` : ''}
                    </span>
                  </span>
                  <time className="hm-time" dateTime={t.createdAt}>
                    {shortDate(t.createdAt)}
                  </time>
                  <span className={`hm-tag ${t.status}`}>{statusLabel[t.status]}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ page */

export function HomeView(props: {
  projects: BoardProject[];
  tasks: BoardTask[];
  features: BoardFeature[];
  onOpen: (id: number) => void;
  onAdd: () => void;
  notice?: ReactNode;
}) {
  const stats = new Map(props.projects.map((p) => [p.id, statOf(props.tasks.filter((t) => t.projectId === p.id))]));
  return (
    <div className="hm">
      <div className="hm-main">
        <HomeTitle />
        {props.notice}
        <OfficeMap
          projects={props.projects}
          stats={stats}
          onOpen={props.onOpen}
          tools={
            <button type="button" className="hm-pill" onClick={props.onAdd}>
              <Glyph name="plus" />
              Add project
            </button>
          }
        />
      </div>
      <aside className="hm-side">
        <Overview projects={props.projects} tasks={props.tasks} stats={stats} />
      </aside>
      <div className="hm-bottom">
        <ProjectTable projects={props.projects} stats={stats} onOpen={props.onOpen} onAdd={props.onAdd} />
        <RecentTasks tasks={props.tasks} projects={props.projects} features={props.features} onOpen={props.onOpen} />
        <StatusCard tasks={props.tasks} />
      </div>
    </div>
  );
}
