import { readFileSync } from 'node:fs';
import pg from 'pg';

process.loadEnvFile('.env.local');

// Schema changes go over the direct connection; the pooler runs in transaction mode.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();
try {
  await client.query(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name in ('site_stats', 'partners', 'projects', 'experience', 'cv_file', 'board_projects', 'board_tasks', 'board_notes', 'board_features')
     order by table_name`,
  );
  console.log('Schema applied. Tables:', rows.map((r) => r.table_name).join(', '));
} finally {
  await client.end();
}
