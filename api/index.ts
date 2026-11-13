import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { attachDatabasePool } from '@neon/functions';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import pg from 'pg';
import { IMAGE_ID, type Content, type CvInfo } from '../src/data/content.js';
import { stackText } from '../src/data/stack.js';
import { boardRoutes } from './board.js';
import { runRoutes } from './run.js';
import { tvRoutes } from './tv.js';
import { vocabRoutes } from './vocab.js';
import { parseExperience, parsePartners, parseProjects, parseStats } from './validate.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);

const s3 = new S3Client({ forcePathStyle: true });
const BUCKET = 'documents';
const MAX_CV_BYTES = 10 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_SHOT_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg' } as const;

/** Identifies a logo upload by its bytes, not by the header the browser sent. */
function logoType(bytes: Uint8Array): keyof typeof LOGO_TYPES | null {
  const head = new TextDecoder().decode(bytes.subarray(0, 1024));
  if (bytes[0] === 0x89 && head.slice(1, 4) === 'PNG') return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'webp';
  if (/<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

type CvRow = { object_key: string; filename: string; size_bytes: number; updated_at: Date };

const toCvInfo = (r: CvRow): CvInfo => ({
  filename: r.filename,
  sizeBytes: r.size_bytes,
  updatedAt: r.updated_at.toISOString(),
});

async function readContent(): Promise<Content> {
  const [stats, partners, projects, experience, cv] = await Promise.all([
    pool.query('select projects_delivered, core_frameworks from site_stats where id = 1'),
    pool.query('select name, logo_id from partners order by position'),
    pool.query(
      `select name, discipline, file, kind, client, headline, project, description, type, stack_items, role, image_ids, duties, url
       from projects order by position`,
    ),
    pool.query('select period, place, title, org, is_current from experience order by position'),
    pool.query<CvRow>('select object_key, filename, size_bytes, updated_at from cv_file where id = 1'),
  ]);
  const s = stats.rows[0];
  return {
    stats: { projectsDelivered: s?.projects_delivered ?? 0, coreFrameworks: s?.core_frameworks ?? 0 },
    partners: partners.rows.map((r) => ({ name: r.name, logo: r.logo_id })),
    projects: projects.rows.map(({ description, image_ids, stack_items, ...r }) => ({ ...r, desc: description, stack: stack_items, images: image_ids })),
    experience: experience.rows.map(({ is_current, ...r }) => ({ ...r, current: is_current })),
    cv: cv.rows[0] ? toCvInfo(cv.rows[0]) : null,
  };
}

/** Runs `fn` in one transaction so a list is never left half replaced. */
async function transaction(fn: (client: pg.PoolClient) => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await fn(client);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

const digest = (s: string) => createHash('sha256').update(s).digest();

const requireAdmin = createMiddleware(async (c, next) => {
  const expected = process.env.ADMIN_KEY;
  const given = c.req.header('x-admin-key') ?? '';
  if (!expected || !timingSafeEqual(digest(given), digest(expected))) {
    return c.json({ error: 'Wrong admin key.' }, 401);
  }
  await next();
});

const app = new Hono();

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Admin-Key', 'X-Filename'],
    maxAge: 86400,
  }),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: 'Something went wrong on the server.' }, 500);
});

app.get('/', (c) => c.json({ ok: true }));

app.get('/content', async (c) => {
  c.header('Cache-Control', 'no-cache');
  return c.json(await readContent());
});

app.get('/cv', async (c) => {
  const { rows } = await pool.query<CvRow>('select object_key, filename from cv_file where id = 1');
  const row = rows[0];
  if (!row) return c.json({ error: 'No CV has been uploaded yet.' }, 404);
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: row.object_key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `attachment; filename="${row.filename.replace(/[^\w.\- ]/g, '_')}"`,
    }),
    { expiresIn: 300 },
  );
  return c.redirect(url, 302);
});

/** Streams an image from a private bucket folder; ids are random per upload, so caching is permanent. */
async function serveImage(c: Context, folder: 'logos' | 'shots') {
  const id = c.req.param('id') ?? '';
  if (!IMAGE_ID.test(id)) return c.json({ error: 'Not found.' }, 404);
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: `${folder}/${id}` }));
    const bytes = await obj.Body!.transformToByteArray();
    // slice() gives an ArrayBuffer holding exactly these bytes.
    return c.body(bytes.slice().buffer, 200, {
      'Content-Type': LOGO_TYPES[id.split('.').pop() as keyof typeof LOGO_TYPES],
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
    });
  } catch (err) {
    if ((err as { name?: string }).name === 'NoSuchKey') return c.json({ error: 'Not found.' }, 404);
    throw err;
  }
}

/** Stores an uploaded image under a new random id after checking its size and real format. */
async function storeImage(c: Context, folder: 'logos' | 'shots', maxBytes: number, label: string) {
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.byteLength === 0) throw new HTTPException(400, { message: 'The file is empty.' });
  if (bytes.byteLength > maxBytes) {
    throw new HTTPException(400, { message: `The ${label} must be ${maxBytes / 1024 / 1024} MB or smaller.` });
  }
  const ext = logoType(bytes);
  if (!ext) throw new HTTPException(400, { message: `The ${label} must be an SVG, PNG, JPEG or WebP file.` });
  const id = `${randomUUID()}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${folder}/${id}`, Body: bytes, ContentType: LOGO_TYPES[ext] }));
  return id;
}

/** Deletes files in a bucket folder that no saved row points at any more. */
async function pruneFolder(folder: 'logos' | 'shots', ids: (string | null)[]) {
  const keep = new Set(ids.flatMap((id) => (id ? [`${folder}/${id}`] : [])));
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${folder}/` }));
  for (const obj of listed.Contents ?? []) {
    if (obj.Key && !keep.has(obj.Key)) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key })).catch((err) => {
        console.error('Could not delete an unused file', obj.Key, err);
      });
    }
  }
}

app.get('/logo/:id', (c) => serveImage(c, 'logos'));
app.get('/shot/:id', (c) => serveImage(c, 'shots'));

app.use('/admin/*', requireAdmin);

app.put('/admin/logo', async (c) => c.json({ logo: await storeImage(c, 'logos', MAX_LOGO_BYTES, 'logo') }));

app.put('/admin/shot', async (c) => c.json({ image: await storeImage(c, 'shots', MAX_SHOT_BYTES, 'image') }));

app.get('/admin/check', (c) => c.json({ ok: true }));

// Project board for /mydashboard; separate from the portfolio's content.
app.route('/admin/board', boardRoutes(pool));

// Runs and the training plan's dates for Ruang Lari in /mydashboard.
app.route('/admin/run', runRoutes(pool));

// Daily words for Ruang Vocabulary in /mydashboard.
app.route('/admin/vocab', vocabRoutes(pool));

// Films and series for Ruang TV in /mydashboard.
app.route('/admin/tv', tvRoutes(pool));

app.put('/admin/stats', async (c) => {
  const s = parseStats(await c.req.json());
  await pool.query(
    `insert into site_stats (id, projects_delivered, core_frameworks) values (1, $1, $2)
     on conflict (id) do update set projects_delivered = $1, core_frameworks = $2, updated_at = now()`,
    [s.projectsDelivered, s.coreFrameworks],
  );
  return c.json({ stats: s });
});

app.put('/admin/partners', async (c) => {
  const partners = parsePartners(await c.req.json());
  await transaction(async (db) => {
    await db.query('delete from partners');
    for (const [i, p] of partners.entries()) {
      await db.query('insert into partners (position, name, logo_id) values ($1, $2, $3)', [i, p.name, p.logo]);
    }
  });

  // Remove logo files nothing points at any more: replaced, removed, or uploaded but never saved.
  await pruneFolder('logos', partners.map((p) => p.logo));

  return c.json({ partners });
});

app.put('/admin/projects', async (c) => {
  const projects = parseProjects(await c.req.json());
  await transaction(async (db) => {
    await db.query('delete from projects');
    for (const [i, p] of projects.entries()) {
      await db.query(
        `insert into projects (position, name, discipline, file, kind, client, headline, project, description, type, stack, stack_items, role, image_ids, duties, url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [i, p.name, p.discipline, p.file, p.kind, p.client, p.headline, p.project, p.desc, p.type, stackText(p.stack), JSON.stringify(p.stack), p.role, p.images, p.duties, p.url],
      );
    }
  });
  // Same clean-up as logos: images of deleted projects, replaced ones, and uploads never saved.
  await pruneFolder('shots', projects.flatMap((p) => p.images));
  return c.json({ projects });
});

app.put('/admin/experience', async (c) => {
  const experience = parseExperience(await c.req.json());
  await transaction(async (db) => {
    await db.query('delete from experience');
    for (const [i, e] of experience.entries()) {
      await db.query(
        `insert into experience (position, period, place, title, org, is_current)
         values ($1, $2, $3, $4, $5, $6)`,
        [i, e.period, e.place, e.title, e.org, e.current],
      );
    }
  });
  return c.json({ experience });
});

app.put('/admin/cv', async (c) => {
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.byteLength === 0) return c.json({ error: 'The file is empty.' }, 400);
  if (bytes.byteLength > MAX_CV_BYTES) return c.json({ error: 'The CV must be 10 MB or smaller.' }, 400);
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') {
    return c.json({ error: 'The CV must be a PDF file.' }, 400);
  }

  const rawName = decodeURIComponent(c.req.header('x-filename') ?? '').trim();
  const filename = (rawName || 'CV.pdf').slice(0, 120);
  // A new key per upload, so a cached presigned URL never serves the old file.
  const key = `cv/${randomUUID()}.pdf`;

  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: 'application/pdf' }));

  const previous = await pool.query<{ object_key: string }>('select object_key from cv_file where id = 1');
  const { rows } = await pool.query<CvRow>(
    `insert into cv_file (id, object_key, filename, size_bytes) values (1, $1, $2, $3)
     on conflict (id) do update set object_key = $1, filename = $2, size_bytes = $3, updated_at = now()
     returning object_key, filename, size_bytes, updated_at`,
    [key, filename, bytes.byteLength],
  );

  const oldKey = previous.rows[0]?.object_key;
  if (oldKey && oldKey !== key) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey })).catch((err) => {
      console.error('Could not delete the previous CV object', err);
    });
  }

  return c.json({ cv: toCvInfo(rows[0]) });
});

export default app;
