import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import { VOCAB_PER_DAY, vocabBank, type VocabData, type VocabDay } from '../src/data/vocab.js';

/*
 * Routes for Ruang Vocabulary in /mydashboard, mounted under /admin/vocab so the admin key
 * protects them. Opening the room on a new day hands out that day's words: the next five
 * of the bank that were never given before, and for review the new words of the last day
 * that had any. A day keeps its words once they are handed out.
 */

const fail = (message: string, status: 400 | 404 = 400): never => {
  throw new HTTPException(status, { message });
};

const DAY_COLS = `to_char(day, 'YYYY-MM-DD') as day, new_words as fresh, review_words as review, done_words as done`;

export function vocabRoutes(pool: pg.Pool) {
  const r = new Hono();

  const read = async (): Promise<VocabData> => {
    const [today, days] = await Promise.all([
      pool.query<{ today: string }>(`select to_char((now() at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD') as today`),
      pool.query<VocabDay>(`select ${DAY_COLS} from vocab_days order by day desc`),
    ]);
    return { today: today.rows[0].today, days: days.rows };
  };

  /** Everything logged so far, after making sure today (in Jakarta) has its words. */
  r.post('/open', async (c) => {
    let data = await read();
    if (data.days[0]?.day !== data.today) {
      const given = new Set(data.days.flatMap((d) => d.fresh));
      const fresh = vocabBank.filter((w) => !given.has(w.word)).slice(0, VOCAB_PER_DAY).map((w) => w.word);
      const review = data.days.find((d) => d.fresh.length > 0)?.fresh ?? [];
      // Two tabs opening at once both try; the second insert does nothing.
      await pool.query('insert into vocab_days (day, new_words, review_words) values ($1, $2, $3) on conflict (day) do nothing', [data.today, fresh, review]);
      data = await read();
    }
    return c.json(data);
  });

  /** Sets which of a day's words are ticked off. */
  r.put('/days/:day/done', async (c) => {
    const day = c.req.param('day');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail('Not found.', 404);
    const o = (await c.req.json().catch(() => null)) as { words?: unknown } | null;
    const words = o?.words;
    if (!Array.isArray(words) || words.some((w) => typeof w !== 'string')) return fail('Send the words as a list of text.');
    const { rows } = await pool.query<VocabDay>(`select ${DAY_COLS} from vocab_days where day = $1`, [day]);
    if (!rows[0]) return fail('That day has no words.', 404);
    const allowed = new Set([...rows[0].fresh, ...rows[0].review]);
    const done = [...new Set(words as string[])];
    if (done.some((w) => !allowed.has(w))) fail('A word is not one of that day’s words.');
    await pool.query('update vocab_days set done_words = $2 where day = $1', [day, done]);
    return c.json({ day: { ...rows[0], done } satisfies VocabDay });
  });

  return r;
}
