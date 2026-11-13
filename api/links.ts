import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import { LINK_LIMITS, type LinksData, type SavedLink } from '../src/data/links.js';

/*
 * Routes for Ruang Lampiran in /mydashboard, mounted under /admin/links so the admin key
 * protects them: the saved links, and adding, changing and removing one.
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

/** Accepts "instagram.com/p/…" or a full http(s) address and stores the full address. */
function webUrl(v: unknown): string {
  const s = text(v, 'Link', LINK_LIMITS.url);
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
  } catch {
    return fail('The link must be a web address, like instagram.com/p/abc.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return fail('The link must be a web address, like instagram.com/p/abc.');
  return url.href;
}

const pathId = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fail('Not found.', 404);
};

type Row = { id: number; url: string; title: string; category: string; created_at: Date };
const toLink = (r: Row): SavedLink => ({ id: r.id, url: r.url, title: r.title, category: r.category, createdAt: r.created_at.toISOString() });
const COLS = 'id, url, title, category, created_at';

const fields = (o: Record<string, unknown>) => [webUrl(o.url), text(o.title ?? '', 'Title', LINK_LIMITS.title, true), text(o.category, 'Category', LINK_LIMITS.category)];

export function linkRoutes(pool: pg.Pool) {
  const r = new Hono();

  r.get('/', async (c) => {
    const { rows } = await pool.query<Row>(`select ${COLS} from saved_links order by created_at desc, id desc`);
    return c.json({ items: rows.map(toLink) } satisfies LinksData);
  });

  r.post('/items', async (c) => {
    const values = fields(await body(c));
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from saved_links');
    if (count[0].n >= LINK_LIMITS.items) fail(`The page holds at most ${LINK_LIMITS.items} links.`);
    const { rows } = await pool.query<Row>(`insert into saved_links (url, title, category) values ($1, $2, $3) returning ${COLS}`, values);
    return c.json({ item: toLink(rows[0]) }, 201);
  });

  r.put('/items/:id', async (c) => {
    const id = pathId(c.req.param('id'));
    const { rows } = await pool.query<Row>(`update saved_links set url = $1, title = $2, category = $3 where id = $4 returning ${COLS}`, [...fields(await body(c)), id]);
    if (!rows[0]) fail('That link no longer exists.', 404);
    return c.json({ item: toLink(rows[0]) });
  });

  r.delete('/items/:id', async (c) => {
    const { rowCount } = await pool.query('delete from saved_links where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That link no longer exists.', 404);
    return c.json({ ok: true });
  });

  return r;
}
