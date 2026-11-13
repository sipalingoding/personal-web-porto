import { useEffect, useState } from 'react';
import { ApiError, adminRequest } from '../data/api';
import type { Run, RunData, RunPoint, RunSettings } from '../data/run';
import { dayKey } from './stats';

/*
 * The training plan of Ruang Lari, worked out from two dates. The goal is to run one's age
 * in kilometres on the next birthday. Until then there is a run every second day: 5 km when
 * it falls on a weekday, and a long run when it falls on a weekend, which starts at 10 km
 * and grows by 1 km each week until it reaches the goal distance.
 */

const DAY = 86_400_000;
export const WEEKDAY_KM = 5;
export const LONG_START_KM = 10;

const utc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const keyOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The birthday the plan aims at (the first one on or after the start) and the age turned that day. */
export function goalOf(s: RunSettings) {
  const [by, bm, bd] = s.birthday.split('-').map(Number);
  let year = Number(s.start.slice(0, 4));
  if (Date.UTC(year, bm - 1, bd) < utc(s.start)) year += 1;
  return { date: keyOf(Date.UTC(year, bm - 1, bd)), age: year - by };
}

export type PlanDay = { date: string; km: number; kind: 'weekday' | 'weekend' | 'birthday' };

export function planOf(s: RunSettings): PlanDay[] {
  const goal = goalOf(s);
  const end = utc(goal.date);
  const days: PlanDay[] = [];
  let longRuns = 0;
  for (let ms = utc(s.start); ms < end; ms += 2 * DAY) {
    const dow = new Date(ms).getUTCDay();
    if (dow === 0 || dow === 6) days.push({ date: keyOf(ms), km: Math.min(LONG_START_KM + longRuns++, goal.age), kind: 'weekend' });
    else days.push({ date: keyOf(ms), km: WEEKDAY_KM, kind: 'weekday' });
  }
  days.push({ date: goal.date, km: goal.age, kind: 'birthday' });
  return days;
}

/** Kilometres logged on each day (two runs on one day add up). */
export function kmByDate(runs: Run[]) {
  const per = new Map<string, number>();
  for (const r of runs) per.set(r.date, (per.get(r.date) ?? 0) + r.km);
  return per;
}

export type PlanStatus = 'done' | 'short' | 'missed' | 'today' | 'upcoming';

export function statusOf(day: PlanDay, logged: Map<string, number>, today: string): PlanStatus {
  const km = logged.get(day.date) ?? 0;
  if (km >= day.km) return 'done';
  if (km > 0) return 'short';
  return day.date < today ? 'missed' : day.date === today ? 'today' : 'upcoming';
}

export const planStatusLabel: Record<PlanStatus, string> = { done: 'Tercapai', short: 'Kurang dari target', missed: 'Terlewat', today: 'Hari ini', upcoming: 'Akan datang' };

const monday = (ms: number) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY;

export type PlanWeek = { key: string; label: string; plan: number | null; actual: number | null; goal: boolean };

/** One entry per week from the start to the birthday: the longest run planned in it and the longest one logged. */
export function weeksOf(plan: PlanDay[], runs: Run[]): PlanWeek[] {
  const planned = new Map<number, { km: number; goal: boolean }>();
  for (const d of plan) {
    if (d.kind === 'weekday') continue;
    const w = monday(utc(d.date));
    if ((planned.get(w)?.km ?? 0) <= d.km) planned.set(w, { km: d.km, goal: d.kind === 'birthday' });
  }
  const longest = new Map<number, number>();
  for (const r of runs) {
    const w = monday(utc(r.date));
    longest.set(w, Math.max(longest.get(w) ?? 0, r.km));
  }
  const out: PlanWeek[] = [];
  for (let w = monday(utc(plan[0].date)); w <= monday(utc(plan[plan.length - 1].date)); w += 7 * DAY) {
    out.push({ key: keyOf(w), label: dateShort(keyOf(w)), plan: planned.get(w)?.km ?? null, actual: longest.get(w) ?? null, goal: planned.get(w)?.goal ?? false });
  }
  return out;
}

export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY);

/* ------------------------------------------------------------------ wording */

const fmt = (opts: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('id-ID', { ...opts, timeZone: 'UTC' });
  return (key: string) => f.format(new Date(utc(key)));
};
/** "14 Nov" */
export const dateShort = fmt({ day: 'numeric', month: 'short' });
/** "Sab, 14 Nov" */
export const dateDay = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
/** "Sabtu, 14 November 2026" */
export const dateLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const kmFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
/** "5", "10,5": kilometres as written in Indonesian. */
export const kmText = (km: number) => kmFmt.format(km);

/** "32:15" or "1:02:30". */
export function timeText(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Reads "32:15", "1:02:30" or plain minutes ("45"); null when it is not a time. */
export function parseTime(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d{1,3}$/.test(p))) return null;
  const n = parts.map(Number);
  const s = n.length === 1 ? n[0] * 60 : n.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2];
  return s > 0 ? s : null;
}

/** Minutes and seconds per kilometre, "6:27". */
export const paceText = (seconds: number, km: number) => timeText(Math.round(seconds / km));

/* ------------------------------------------------------------------ GPX */

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
function haversine(a: RunPoint, b: RunPoint) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

export type GpxTrack = { route: RunPoint[]; km: number; seconds: number | null; date: string | null };

/**
 * Reads a GPX file (the export of a watch or a running app): the track's points, its length,
 * and, when the points carry times, how long it took and which day it was. The distance is
 * measured over every point; the route that is kept is thinned to at most `maxPoints`.
 */
export function parseGpx(xml: string, maxPoints: number): GpxTrack {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('File ini bukan GPX yang valid.');
  let nodes = Array.from(doc.getElementsByTagName('trkpt'));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagName('rtept'));
  const pts: RunPoint[] = [];
  const times: number[] = [];
  for (const n of nodes) {
    const lat = Number(n.getAttribute('lat'));
    const lng = Number(n.getAttribute('lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    pts.push([lat, lng]);
    const t = Date.parse(n.getElementsByTagName('time')[0]?.textContent ?? '');
    if (!Number.isNaN(t)) times.push(t);
  }
  if (pts.length < 2) throw new Error('File GPX ini tidak berisi rute (minimal dua titik).');
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += haversine(pts[i - 1], pts[i]);
  const step = Math.max(1, (pts.length - 1) / (maxPoints - 1));
  const route: RunPoint[] = [];
  for (let i = 0; Math.round(i) < pts.length - 1; i += step) route.push(pts[Math.round(i)]);
  route.push(pts[pts.length - 1]);
  const seconds = times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 1000) : null;
  return { route, km: Math.round(km * 100) / 100, seconds: seconds || null, date: times.length ? dayKey(new Date(Math.min(...times))) : null };
}

/** A route as SVG points inside a box of `size`, north up, keeping its proportions. */
export function tracePoints(route: RunPoint[], size: number, pad = 2) {
  const lat0 = route.reduce((s, p) => s + p[0], 0) / route.length;
  const xs = route.map((p) => p[1] * Math.cos(rad(lat0)));
  const ys = route.map((p) => -p[0]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const k = (size - pad * 2) / span;
  const ox = (size - (maxX - minX) * k) / 2;
  const oy = (size - (maxY - minY) * k) / 2;
  return route.map((_, i) => `${(ox + (xs[i] - minX) * k).toFixed(1)},${(oy + (ys[i] - minY) * k).toFixed(1)}`).join(' ');
}

/* ------------------------------------------------------------------ loading */

/** Loads the runs and the plan's dates; a rejected key locks the dashboard. */
export function useRunData(adminKey: string, onLocked: () => void) {
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError('');
    adminRequest<RunData>(adminKey, 'GET', '/run')
      .then((res) => live && setData(res))
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
  return { data, setData, error, retry: () => setAttempt((n) => n + 1) };
}
