import { useEffect, useState } from 'react';
import { ApiError, adminRequest } from '../data/api';
import { boardStatuses, type Board, type BoardStatus, type BoardTask } from '../data/board';

/*
 * Figures for the dashboard's graphics, all worked out from the board (projects and
 * their tasks) and the calendar. Days are Jakarta days.
 */

const JKT = 'Asia/Jakarta';
const DAY = 86_400_000;

/** "2026-11-12" for a moment in time, in Jakarta. */
export const dayKey = (at: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: JKT }).format(typeof at === 'string' ? new Date(at) : at);

const utc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const keyOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** "12 Nov" for a day key. */
export const dayLabel = (key: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(utc(key)));

/** "hari ini", "kemarin" or "3 hari lalu" for a moment in time. */
export function daysAgo(iso: string, now = new Date()) {
  const n = Math.round((utc(dayKey(now)) - utc(dayKey(iso))) / DAY);
  return n <= 0 ? 'hari ini' : n === 1 ? 'kemarin' : `${n} hari lalu`;
}

export type Counts = Record<BoardStatus, number> & { total: number; pct: number | null };

export function countsOf(tasks: BoardTask[]): Counts {
  const c = Object.fromEntries(boardStatuses.map((s) => [s, tasks.filter((t) => t.status === s).length])) as Record<BoardStatus, number>;
  return { ...c, total: tasks.length, pct: tasks.length ? Math.round((c.done / tasks.length) * 100) : null };
}

/** The day a finished task counts on: when it was finished, or when it was added if that was never recorded. */
const doneDay = (t: BoardTask) => (t.status !== 'done' ? null : t.doneAt ? dayKey(t.doneAt) : t.createdAt ? dayKey(t.createdAt) : null);

export type DayCount = { key: string; label: string; n: number };

/** Tasks finished on each of the last `days` days, oldest first, today last. */
export function doneByDay(tasks: BoardTask[], days: number, now = new Date()): DayCount[] {
  const today = utc(dayKey(now));
  const per = new Map<string, number>();
  for (const t of tasks) {
    const k = doneDay(t);
    if (k) per.set(k, (per.get(k) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const key = keyOf(today - (days - 1 - i) * DAY);
    return { key, label: dayLabel(key), n: per.get(key) ?? 0 };
  });
}

export type BurnPoint = { key: string; label: string; created: number; done: number };

/** Running totals of tasks added and tasks finished, one point per day from the first task to today. */
export function burnUp(tasks: BoardTask[], now = new Date()): BurnPoint[] {
  const dated = tasks.filter((t) => t.createdAt);
  if (dated.length === 0) return [];
  const today = utc(dayKey(now));
  const made = new Map<string, number>();
  const done = new Map<string, number>();
  let first = today;
  for (const t of dated) {
    const c = dayKey(t.createdAt);
    made.set(c, (made.get(c) ?? 0) + 1);
    first = Math.min(first, utc(c));
    const d = doneDay(t);
    if (d) done.set(d, (done.get(d) ?? 0) + 1);
  }
  // The line starts at zero the day before the first task.
  const out: BurnPoint[] = [];
  let c = 0;
  let d = 0;
  for (let ms = first - DAY; ms <= today; ms += DAY) {
    const key = keyOf(ms);
    c += made.get(key) ?? 0;
    d += done.get(key) ?? 0;
    out.push({ key, label: dayLabel(key), created: c, done: d });
  }
  return out;
}

/** The most recently finished tasks, newest first. */
export function recentDone(tasks: BoardTask[], limit: number) {
  return tasks
    .filter((t): t is BoardTask & { doneAt: string } => t.status === 'done' && !!t.doneAt)
    .sort((a, b) => b.doneAt.localeCompare(a.doneAt))
    .slice(0, limit);
}

/** Where today falls in the year: day number, days in the year, and how much of each month has passed (0 to 1). */
export function yearProgress(now = new Date()) {
  const key = dayKey(now);
  const [y, m, d] = key.split('-').map(Number);
  const total = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / DAY;
  const day = (utc(key) - Date.UTC(y, 0, 1)) / DAY + 1;
  const months = Array.from({ length: 12 }, (_, i) => {
    if (i + 1 < m) return 1;
    if (i + 1 > m) return 0;
    return d / new Date(Date.UTC(y, m, 0)).getUTCDate();
  });
  return { year: y, day, total, left: total - day, months };
}

/** Today's date in Jakarta, e.g. "Kamis, 12 November 2026". */
export const todayLong = (now = new Date()) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: JKT }).format(now);

/** Loads the board read-only for the summaries; a rejected key locks the dashboard. */
export function useBoard(adminKey: string, onLocked: () => void) {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError('');
    adminRequest<Board>(adminKey, 'GET', '/board')
      .then((res) => live && setBoard(res))
      .catch((err: unknown) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 401) onLocked();
        else setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      });
    return () => {
      live = false;
    };
    // onLocked is a fresh function each render; only the key and retries decide when to load.
  }, [adminKey, attempt]);
  return { board, error, retry: () => setAttempt((n) => n + 1) };
}
