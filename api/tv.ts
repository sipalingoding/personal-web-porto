import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import { TMDB_IMAGE, TV_LIMITS, tvKinds, tvStatuses, type TvData, type TvHit, type TvItem, type TvKind, type TvPlatform, type TvStatus } from '../src/data/tv.js';

/*
 * Routes for Ruang TV in /mydashboard, mounted under /admin/tv so the admin key protects
 * them: the list of films and series, and adding, changing and removing a title. Searching
 * for a title and looking up platforms go through TMDB from here, so its key (TMDB_API_KEY)
 * never reaches the browser.
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

/** A TMDB image path, or null. */
function image(v: unknown, field: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'string' && TMDB_IMAGE.test(v) ? v : fail(`${field} is not a TMDB image path.`);
}

function wholeOrNull(v: unknown, field: string, min: number, max: number): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fail(`${field} is out of range.`);
}

/** The fields of a title as sent by the form, checked, in the order of the SQL below. */
function fields(o: Record<string, unknown>) {
  const status = oneOf<TvStatus>(o.status ?? 'done', 'Status', tvStatuses);
  return [
    text(o.title, 'Title', TV_LIMITS.title),
    oneOf<TvKind>(o.kind, 'Type', tvKinds),
    text(o.platform, 'Platform', TV_LIMITS.platform),
    status,
    rating(o.rating),
    // The finish date belongs to finished titles only.
    status === 'done' ? day(o.watchedOn) : null,
    text(o.note ?? '', 'Note', TV_LIMITS.note, true),
    wholeOrNull(o.year, 'Year', 1870, 2200),
    image(o.poster, 'Poster'),
    wholeOrNull(o.tmdbId, 'TMDB id', 1, 2_000_000_000),
    image(o.platformLogo, 'Platform logo'),
  ];
}

/* ------------------------------------------------------------------ TMDB */

const TMDB = 'https://api.themoviedb.org/3';
/** Platforms are looked up for this country. */
const REGION = 'ID';

/** Calls TMDB with the key from the environment: a v4 token goes in the header, a v3 key in the address. */
async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new HTTPException(503, { message: 'TMDB is not set up: add TMDB_API_KEY to .env.local and deploy.' });
  const url = new URL(TMDB + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const bearer = key.startsWith('eyJ');
  if (!bearer) url.searchParams.set('api_key', key);
  let res: Response;
  try {
    res = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new HTTPException(502, { message: 'TMDB could not be reached. Try again.' });
  }
  if (res.status === 401) throw new HTTPException(503, { message: 'TMDB rejected the key in TMDB_API_KEY.' });
  if (!res.ok) throw new HTTPException(502, { message: `TMDB answered ${res.status}.` });
  return (await res.json()) as T;
}

type TmdbTitle = { id: number; media_type?: string; title?: string; name?: string; release_date?: string; first_air_date?: string; poster_path?: string | null; popularity?: number };
type TmdbProvider = { provider_name: string; logo_path?: string | null; display_priority?: number; display_priorities?: Record<string, number> };

const toPlatform = (p: TmdbProvider): TvPlatform => ({ name: p.provider_name.slice(0, TV_LIMITS.platform), logo: p.logo_path && TMDB_IMAGE.test(p.logo_path) ? p.logo_path : null });

const COLS = `id, title, kind, platform, status, rating, to_char(watched_on, 'YYYY-MM-DD') as "watchedOn", note, year, poster, tmdb_id as "tmdbId", platform_logo as "platformLogo"`;

export function tvRoutes(pool: pg.Pool) {
  const r = new Hono();

  r.get('/', async (c) => {
    const { rows } = await pool.query<TvItem>(`select ${COLS} from tv_items order by id desc`);
    return c.json({ items: rows } satisfies TvData);
  });

  /** Films and series matching the words typed, the best known first. */
  r.get('/search', async (c) => {
    const q = (c.req.query('q') ?? '').trim().slice(0, 100);
    if (q.length < 2) return c.json({ hits: [] as TvHit[] });
    const res = await tmdb<{ results?: TmdbTitle[] }>('/search/multi', { query: q, include_adult: 'false', language: 'en-US' });
    const hits = (res.results ?? [])
      .filter((t) => t.media_type === 'movie' || t.media_type === 'tv')
      .slice(0, 8)
      .map((t): TvHit => {
        const year = Number((t.release_date ?? t.first_air_date ?? '').slice(0, 4));
        return {
          tmdbId: t.id,
          kind: t.media_type === 'movie' ? 'Film' : 'Series',
          title: (t.title ?? t.name ?? '').slice(0, TV_LIMITS.title),
          year: year >= 1870 ? year : null,
          poster: t.poster_path && TMDB_IMAGE.test(t.poster_path) ? t.poster_path : null,
        };
      })
      .filter((h) => h.title);
    return c.json({ hits });
  });

  /** The streaming platforms TMDB lists for the country, the widest used first. */
  r.get('/platforms', async (c) => {
    const lists = await Promise.all(
      (['movie', 'tv'] as const).map((m) => tmdb<{ results?: TmdbProvider[] }>(`/watch/providers/${m}`, { watch_region: REGION, language: 'en-US' })),
    );
    const order = (p: TmdbProvider) => p.display_priorities?.[REGION] ?? p.display_priority ?? 999;
    const seen = new Map<string, TmdbProvider>();
    for (const p of lists.flatMap((l) => l.results ?? []).sort((a, b) => order(a) - order(b))) if (!seen.has(p.provider_name)) seen.set(p.provider_name, p);
    return c.json({ platforms: [...seen.values()].slice(0, 40).map(toPlatform) });
  });

  /** Where one title can be streamed in the country (subscription, free or with ads). */
  r.get('/where/:kind/:id', async (c) => {
    const kind = oneOf<TvKind>(c.req.param('kind'), 'Type', tvKinds);
    const id = pathId(c.req.param('id'));
    type Offers = { flatrate?: TmdbProvider[]; free?: TmdbProvider[]; ads?: TmdbProvider[] };
    const res = await tmdb<{ results?: Record<string, Offers> }>(`/${kind === 'Film' ? 'movie' : 'tv'}/${id}/watch/providers`);
    const here = res.results?.[REGION] ?? {};
    const seen = new Map<string, TmdbProvider>();
    for (const p of [...(here.flatrate ?? []), ...(here.free ?? []), ...(here.ads ?? [])]) if (!seen.has(p.provider_name)) seen.set(p.provider_name, p);
    return c.json({ platforms: [...seen.values()].map(toPlatform) });
  });

  r.post('/items', async (c) => {
    const values = fields(await body(c));
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from tv_items');
    if (count[0].n >= TV_LIMITS.items) fail(`The list holds at most ${TV_LIMITS.items} titles.`);
    const { rows } = await pool.query<TvItem>(
      `insert into tv_items (title, kind, platform, status, rating, watched_on, note, year, poster, tmdb_id, platform_logo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning ${COLS}`,
      values,
    );
    return c.json({ item: rows[0] }, 201);
  });

  r.put('/items/:id', async (c) => {
    const id = pathId(c.req.param('id'));
    const { rows } = await pool.query<TvItem>(
      `update tv_items set title = $1, kind = $2, platform = $3, status = $4, rating = $5, watched_on = $6, note = $7,
              year = $8, poster = $9, tmdb_id = $10, platform_logo = $11, updated_at = now()
       where id = $12 returning ${COLS}`,
      [...fields(await body(c)), id],
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
