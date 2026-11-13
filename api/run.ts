import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import { RUN_LIMITS, type Run, type RunData, type RunPoint, type RunSettings } from '../src/data/run.js';

/*
 * Routes for Ruang Lari in /mydashboard, mounted under /admin/run so the admin key
 * protects them: the logged runs, and the two dates the training plan is built from.
 */

const fail = (message: string, status: 400 | 404 = 400): never => {
  throw new HTTPException(status, { message });
};

const body = async (c: { req: { json: () => Promise<unknown> } }) => {
  const v = await c.req.json().catch(() => null);
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail('Send a JSON object.');
};

/** A real calendar day written "YYYY-MM-DD". */
function day(v: unknown, field: string): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(`${field} must be a date like 2026-11-13.`);
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return fail(`${field} is not a real date.`);
  return v;
}

function km(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > RUN_LIMITS.km) return fail(`Distance must be more than 0 and at most ${RUN_LIMITS.km} km.`);
  return Math.round(v * 100) / 100;
}

function seconds(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > RUN_LIMITS.seconds) return fail('Time must be a whole number of seconds, up to 48 hours.');
  return v;
}

function note(v: unknown): string {
  if (typeof v !== 'string') return fail('Note must be text.');
  const s = v.trim();
  if (s.length > RUN_LIMITS.note) return fail(`Note must be ${RUN_LIMITS.note} characters or fewer.`);
  return s;
}

/** A list of [latitude, longitude] pairs, rounded to about a metre; null for a run without a route. */
function route(v: unknown): RunPoint[] | null {
  if (v === null || v === undefined) return null;
  if (!Array.isArray(v) || v.length < 2 || v.length > RUN_LIMITS.routePoints) return fail(`A route has 2 to ${RUN_LIMITS.routePoints} points.`);
  return v.map((p) => {
    const ok = Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n)) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
    if (!ok) return fail('A route point is not a valid latitude and longitude.');
    return [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5] as RunPoint;
  });
}

const pathId = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fail('Not found.', 404);
};

type RunRow = { id: number; date: string; km: string; seconds: number | null; note: string; route: RunPoint[] | null };
const toRun = (r: RunRow): Run => ({ id: r.id, date: r.date, km: Number(r.km), seconds: r.seconds, note: r.note, route: r.route });
// Dates leave the database as text, so no time zone can shift them by a day.
const RUN_COLS = `id, to_char(run_date, 'YYYY-MM-DD') as date, km, seconds, note, route`;

export function runRoutes(pool: pg.Pool) {
  const r = new Hono();

  r.get('/', async (c) => {
    const [settings, runs] = await Promise.all([
      pool.query<RunSettings>(`select to_char(birthday, 'YYYY-MM-DD') as birthday, to_char(start_date, 'YYYY-MM-DD') as start from run_settings where id = 1`),
      pool.query<RunRow>(`select ${RUN_COLS} from runs order by run_date desc, id desc`),
    ]);
    return c.json({ settings: settings.rows[0] ?? null, runs: runs.rows.map(toRun) } satisfies RunData);
  });

  r.put('/settings', async (c) => {
    const o = await body(c);
    const settings: RunSettings = { birthday: day(o.birthday, 'Birthday'), start: day(o.start, 'Start date') };
    if (settings.birthday >= settings.start) fail('The birthday must be before the start date.');
    await pool.query(
      `insert into run_settings (id, birthday, start_date) values (1, $1, $2)
       on conflict (id) do update set birthday = $1, start_date = $2, updated_at = now()`,
      [settings.birthday, settings.start],
    );
    return c.json({ settings });
  });

  r.post('/runs', async (c) => {
    const o = await body(c);
    const values = [day(o.date, 'Date'), km(o.km), seconds(o.seconds), note(o.note ?? ''), JSON.stringify(route(o.route))];
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from runs');
    if (count[0].n >= RUN_LIMITS.runs) fail(`The log holds at most ${RUN_LIMITS.runs} runs.`);
    const { rows } = await pool.query<RunRow>(
      `insert into runs (run_date, km, seconds, note, route) values ($1, $2, $3, $4, $5::jsonb) returning ${RUN_COLS}`,
      values,
    );
    return c.json({ run: toRun(rows[0]) }, 201);
  });

  r.patch('/runs/:id', async (c) => {
    const id = pathId(c.req.param('id'));
    const o = await body(c);
    const sets: string[] = [];
    const vals: unknown[] = [];
    const add = (col: string, v: unknown, cast = '') => {
      vals.push(v);
      sets.push(`${col} = $${vals.length}${cast}`);
    };
    if ('date' in o) add('run_date', day(o.date, 'Date'));
    if ('km' in o) add('km', km(o.km));
    if ('seconds' in o) add('seconds', seconds(o.seconds));
    if ('note' in o) add('note', note(o.note));
    if ('route' in o) add('route', JSON.stringify(route(o.route)), '::jsonb');
    if (sets.length === 0) fail('Nothing to change.');
    vals.push(id);
    const { rows } = await pool.query<RunRow>(`update runs set ${sets.join(', ')} where id = $${vals.length} returning ${RUN_COLS}`, vals);
    if (!rows[0]) fail('That run no longer exists.', 404);
    return c.json({ run: toRun(rows[0]) });
  });

  r.delete('/runs/:id', async (c) => {
    const { rowCount } = await pool.query('delete from runs where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That run no longer exists.', 404);
    return c.json({ ok: true });
  });

  return r;
}
