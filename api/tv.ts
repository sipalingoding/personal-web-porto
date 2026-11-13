import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import { TV_LIMITS, tvKinds, tvStatuses, type TvData, type TvItem, type TvKind, type TvStatus } from '../src/data/tv.js';

/*
 * Routes for Ruang TV in /mydashboard, mounted under /admin/tv so the admin key protects
 * them: the list of films and series, and adding, changing and removing a title.
 */

const fail = (message: string, status: 400 | 404 = 400): never => {
  throw new HTTPException(status, { message });
};

const body = async (c: { req: { json: () => Promise<unknown> } }) => {
  const v = await c.req.json().catch(() => null);
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail('Send a JSON object.');
};

function text(v: unknown, field: string, max: number, optional = false): string {
  if (typeof v !== 'string') return fail(`${field} must be text.`);
  const s = v.trim();
  if (!s && !optional) return fail(`${field} is required.`);
  if (s.length > max) return fail(`${field} must be ${max} characters or fewer.`);
  return s;
}

const oneOf = <T extends string>(v: unknown, field: string, options: readonly T[]): T =>
  options.includes(v as T) ? (v as T) : fail(`${field} must be one of: ${options.join(', ')}.`);

function rating(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5 ? v : fail('Rating must be a whole number from 1 to 5.');
}

function day(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail('The date must look like 2026-11-13.');
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : fail('That is not a real date.');
}

const pathId = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fail('Not found.', 404);
};

const COLS = `id, title, kind, platform, status, rating, to_char(watched_on, 'YYYY-MM-DD') as "watchedOn", note`;

export function tvRoutes(pool: pg.Pool) {
  const r = new Hono();

  r.get('/', async (c) => {
    const { rows } = await pool.query<TvItem>(`select ${COLS} from tv_items order by id desc`);
    return c.json({ items: rows } satisfies TvData);
  });

  r.post('/items', async (c) => {
    const o = await body(c);
    const status = oneOf<TvStatus>(o.status ?? 'done', 'Status', tvStatuses);
    const values = [
      text(o.title, 'Title', TV_LIMITS.title),
      oneOf<TvKind>(o.kind, 'Type', tvKinds),
      text(o.platform, 'Platform', TV_LIMITS.platform),
      status,
      rating(o.rating),
      // The finish date belongs to finished titles only.
      status === 'done' ? day(o.watchedOn) : null,
      text(o.note ?? '', 'Note', TV_LIMITS.note, true),
    ];
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from tv_items');
    if (count[0].n >= TV_LIMITS.items) fail(`The list holds at most ${TV_LIMITS.items} titles.`);
    const { rows } = await pool.query<TvItem>(
      `insert into tv_items (title, kind, platform, status, rating, watched_on, note) values ($1, $2, $3, $4, $5, $6, $7) returning ${COLS}`,
      values,
    );
    return c.json({ item: rows[0] }, 201);
  });

  r.put('/items/:id', async (c) => {
    const id = pathId(c.req.param('id'));
    const o = await body(c);
    const status = oneOf<TvStatus>(o.status, 'Status', tvStatuses);
    const { rows } = await pool.query<TvItem>(
      `update tv_items set title = $1, kind = $2, platform = $3, status = $4, rating = $5, watched_on = $6, note = $7, updated_at = now()
       where id = $8 returning ${COLS}`,
      [
        text(o.title, 'Title', TV_LIMITS.title),
        oneOf<TvKind>(o.kind, 'Type', tvKinds),
        text(o.platform, 'Platform', TV_LIMITS.platform),
        status,
        rating(o.rating),
        status === 'done' ? day(o.watchedOn) : null,
        text(o.note ?? '', 'Note', TV_LIMITS.note, true),
        id,
      ],
    );
    if (!rows[0]) fail('That title no longer exists.', 404);
    return c.json({ item: rows[0] });
  });

  r.delete('/items/:id', async (c) => {
    const { rowCount } = await pool.query('delete from tv_items where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That title no longer exists.', 404);
    return c.json({ ok: true });
  });

  return r;
}
