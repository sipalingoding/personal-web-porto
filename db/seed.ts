import pg from 'pg';
import { fallbackContent } from '../src/data/content';
import { stackText } from '../src/data/stack';

process.loadEnvFile('.env.local');

// Copies the site's current hard-coded data into empty tables. Tables that already
// hold rows are left alone, so this never overwrites edits made at /data-project.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();

const isEmpty = async (table: string) =>
  (await client.query(`select count(*)::int as n from ${table}`)).rows[0].n === 0;

try {
  await client.query('begin');
  const { stats, partners, projects, experience } = fallbackContent;

  if (await isEmpty('site_stats')) {
    await client.query('insert into site_stats (id, projects_delivered, core_frameworks) values (1, $1, $2)', [
      stats.projectsDelivered,
      stats.coreFrameworks,
    ]);
    console.log('site_stats: seeded');
  } else console.log('site_stats: already has data, skipped');

  if (await isEmpty('partners')) {
    for (const [i, p] of partners.entries()) {
      await client.query('insert into partners (position, name, logo_id) values ($1, $2, $3)', [i, p.name, p.logo]);
    }
    console.log(`partners: seeded ${partners.length}`);
  } else console.log('partners: already has data, skipped');

  if (await isEmpty('projects')) {
    for (const [i, p] of projects.entries()) {
      await client.query(
        `insert into projects (position, name, discipline, file, kind, client, headline, project, description, type, stack, stack_items, role, image_ids, duties, url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [i, p.name, p.discipline, p.file, p.kind, p.client, p.headline, p.project, p.desc, p.type, stackText(p.stack), JSON.stringify(p.stack), p.role, p.images, p.duties, p.url],
      );
    }
    console.log(`projects: seeded ${projects.length}`);
  } else console.log('projects: already has data, skipped');

  if (await isEmpty('experience')) {
    for (const [i, e] of experience.entries()) {
      await client.query(
        `insert into experience (position, period, place, title, org, is_current)
         values ($1, $2, $3, $4, $5, $6)`,
        [i, e.period, e.place, e.title, e.org, e.current],
      );
    }
    console.log(`experience: seeded ${experience.length}`);
  } else console.log('experience: already has data, skipped');

  await client.query('commit');
} catch (err) {
  await client.query('rollback');
  throw err;
} finally {
  await client.end();
}
