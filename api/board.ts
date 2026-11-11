import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import {
  BOARD_LIMITS,
  boardKinds,
  boardStatuses,
  type Board,
  type BoardFeature,
  type BoardKind,
  type BoardLink,
  type BoardNote,
  type BoardOrder,
  type BoardProject,
  type BoardStatus,
  type BoardTask,
} from '../src/data/board.js';

/*
 * Routes for the project board in /mydashboard, mounted under /admin/board so the
 * admin key protects them. Each change is its own small request, so the page can
 * update one card without sending the whole board back.
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

const status = (v: unknown) => oneOf<BoardStatus>(v, 'Status', boardStatuses);
const kind = (v: unknown) => oneOf<BoardKind>(v, 'Status', boardKinds);

const positiveInt = (v: unknown, message: string, code: 400 | 404 = 400): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : fail(message, code);
};

const pathId = (v: string | undefined) => positiveInt(v, 'Not found.', 404);

/** Accepts "example.com" or a full http(s) address and stores the full address. */
function webUrl(v: unknown, field: string): string {
  const s = text(v, field, BOARD_LIMITS.linkUrl);
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) ? s : `https://${s}`);
  } catch {
    return fail(`${field} must be a web address, like example.com.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
    return fail(`${field} must be a web address, like example.com.`);
  }
  return url.href;
}

function links(v: unknown): BoardLink[] {
  if (!Array.isArray(v)) return fail('Links must be a list.');
  if (v.length > BOARD_LIMITS.linksPerProject) fail(`A project holds at most ${BOARD_LIMITS.linksPerProject} links.`);
  return v.map((raw, i) => {
    if (raw === null || typeof raw !== 'object') return fail(`Link #${i + 1} is invalid.`);
    const o = raw as Record<string, unknown>;
    return {
      label: text(o.label ?? '', `Link #${i + 1} label`, BOARD_LIMITS.linkLabel, true),
      url: webUrl(o.url, `Link #${i + 1}`),
    };
  });
}

type TaskRow = {
  id: number;
  project_id: number;
  feature_id: number | null;
  title: string;
  status: BoardStatus;
  created_at: Date;
  done_at: Date | null;
};
const toTask = (t: TaskRow): BoardTask => ({
  id: t.id,
  projectId: t.project_id,
  featureId: t.feature_id,
  title: t.title,
  status: t.status,
  createdAt: t.created_at.toISOString(),
  doneAt: t.done_at ? t.done_at.toISOString() : null,
});

/**
 * SQL for done_at given the new status: stamped when a task reaches done, kept as it was
 * for a task already done (older ones have none), cleared when it leaves done.
 */
const doneAt = (param: string) =>
  `done_at = case when ${param}::text <> 'done' then null when status = 'done' then done_at else now() end`;

type FeatureRow = { id: number; project_id: number; name: string };
const toFeature = (f: FeatureRow): BoardFeature => ({ id: f.id, projectId: f.project_id, name: f.name });
const FEATURE_COLS = 'id, project_id, name';

type NoteRow = { id: number; project_id: number; body: string; created_at: Date; updated_at: Date };
const toNote = (n: NoteRow): BoardNote => ({
  id: n.id,
  projectId: n.project_id,
  body: n.body,
  createdAt: n.created_at.toISOString(),
  updatedAt: n.updated_at.toISOString(),
});
const NOTE_COLS = 'id, project_id, body, created_at, updated_at';

const PROJECT_COLS = 'id, title, kind, description, links';
const TASK_COLS = 'id, project_id, feature_id, title, status, created_at, done_at';

/** Turns "the project was deleted meanwhile" (foreign key error 23503) into a clear 404. */
const missingProject = (err: { code?: string }) => {
  if (err.code === '23503') fail('That project no longer exists.', 404);
  throw err;
};

export function boardRoutes(pool: pg.Pool) {
  const r = new Hono();

  /** Reads an optional feature id and checks it belongs to the task's project. */
  async function featureFor(v: unknown, projectId: number): Promise<number | null> {
    if (v === null || v === undefined) return null;
    const fid = positiveInt(v, 'That feature is invalid.');
    const { rows } = await pool.query<{ project_id: number }>('select project_id from board_features where id = $1', [fid]);
    if (!rows[0]) fail('That feature no longer exists.', 404);
    if (rows[0].project_id !== projectId) fail('That feature belongs to another project.');
    return fid;
  }

  /** Turns the unique-name index error into a clear message. */
  const duplicateFeature = (err: { code?: string }) => {
    if (err.code === '23505') fail('This project already has a feature with that name.');
    return missingProject(err);
  };

  r.get('/', async (c) => {
    const [projects, features, tasks, notes] = await Promise.all([
      pool.query<BoardProject>(`select ${PROJECT_COLS} from board_projects order by lower(title), id`),
      pool.query<FeatureRow>(`select ${FEATURE_COLS} from board_features order by lower(name), id`),
      pool.query<TaskRow>(`select ${TASK_COLS} from board_tasks order by status, position, id`),
      pool.query<NoteRow>(`select ${NOTE_COLS} from board_notes order by created_at desc, id desc`),
    ]);
    return c.json({
      projects: projects.rows,
      features: features.rows.map(toFeature),
      tasks: tasks.rows.map(toTask),
      notes: notes.rows.map(toNote),
    } satisfies Board);
  });

  /* ---------------------------------------------------------------- projects */

  r.post('/projects', async (c) => {
    const o = await body(c);
    const values = [
      text(o.title, 'Project name', BOARD_LIMITS.projectTitle),
      kind(o.kind),
      text(o.description ?? '', 'Description', BOARD_LIMITS.description, true),
      JSON.stringify(links(o.links ?? [])),
    ];
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from board_projects');
    if (count[0].n >= BOARD_LIMITS.projects) fail(`The board holds at most ${BOARD_LIMITS.projects} projects.`);
    const { rows } = await pool.query<BoardProject>(
      `insert into board_projects (title, kind, description, links) values ($1, $2, $3, $4) returning ${PROJECT_COLS}`,
      values,
    );
    return c.json({ project: rows[0] }, 201);
  });

  r.patch('/projects/:id', async (c) => {
    const pid = pathId(c.req.param('id'));
    const o = await body(c);
    const sets: string[] = [];
    const vals: unknown[] = [];
    const add = (col: string, v: unknown) => {
      vals.push(v);
      sets.push(`${col} = $${vals.length}`);
    };
    if ('title' in o) add('title', text(o.title, 'Project name', BOARD_LIMITS.projectTitle));
    if ('kind' in o) add('kind', kind(o.kind));
    if ('description' in o) add('description', text(o.description, 'Description', BOARD_LIMITS.description, true));
    if ('links' in o) add('links', JSON.stringify(links(o.links)));
    if (sets.length === 0) fail('Nothing to change.');
    vals.push(pid);
    const { rows } = await pool.query<BoardProject>(
      `update board_projects set ${sets.join(', ')}, updated_at = now() where id = $${vals.length} returning ${PROJECT_COLS}`,
      vals,
    );
    if (!rows[0]) fail('That project no longer exists.', 404);
    return c.json({ project: rows[0] });
  });

  r.delete('/projects/:id', async (c) => {
    const { rowCount } = await pool.query('delete from board_projects where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That project no longer exists.', 404);
    return c.json({ ok: true });
  });

  /* ---------------------------------------------------------------- tasks */

  r.post('/tasks', async (c) => {
    const o = await body(c);
    const title = text(o.title, 'Task', BOARD_LIMITS.taskTitle);
    const projectId = positiveInt(o.projectId, 'Choose a project for the task.');
    const st = status(o.status ?? 'not_started');
    const featureId = await featureFor(o.featureId, projectId);
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from board_tasks');
    if (count[0].n >= BOARD_LIMITS.tasks) fail(`The board holds at most ${BOARD_LIMITS.tasks} tasks.`);
    // New tasks go to the top of their column.
    const { rows } = await pool
      .query<TaskRow>(
        `insert into board_tasks (project_id, feature_id, title, status, position, done_at)
         values ($1, $4, $2, $3, coalesce((select min(position) - 1 from board_tasks where status = $3), 0),
                 case when $3::text = 'done' then now() end)
         returning ${TASK_COLS}`,
        [projectId, title, st, featureId],
      )
      .catch(missingProject);
    return c.json({ task: toTask(rows[0]) }, 201);
  });

  r.patch('/tasks/:id', async (c) => {
    const tid = pathId(c.req.param('id'));
    const o = await body(c);
    const sets: string[] = [];
    const vals: unknown[] = [];
    const add = (col: string, v: unknown) => {
      vals.push(v);
      sets.push(`${col} = $${vals.length}`);
    };
    if ('title' in o) add('title', text(o.title, 'Task', BOARD_LIMITS.taskTitle));
    let projectId: number | null = null;
    if ('projectId' in o) {
      projectId = positiveInt(o.projectId, 'Choose a project for the task.');
      add('project_id', projectId);
    }
    if ('featureId' in o || projectId !== null) {
      // A feature only makes sense inside its own project; moving a task clears it unless a new one is given.
      const { rows: cur } = await pool.query<{ project_id: number }>('select project_id from board_tasks where id = $1', [tid]);
      if (!cur[0]) fail('That task no longer exists.', 404);
      add('feature_id', 'featureId' in o ? await featureFor(o.featureId, projectId ?? cur[0].project_id) : null);
    }
    if ('status' in o) {
      add('status', status(o.status));
      // Moving through this route puts the task at the top of its new column.
      const s = vals.length;
      sets.push(doneAt(`$${s}`));
      vals.push(tid);
      sets.push(`position = coalesce((select min(position) - 1 from board_tasks where status = $${s} and id <> $${vals.length}), 0)`);
    }
    if (sets.length === 0) fail('Nothing to change.');
    vals.push(tid);
    const { rows } = await pool
      .query<TaskRow>(`update board_tasks set ${sets.join(', ')} where id = $${vals.length} returning ${TASK_COLS}`, vals)
      .catch(missingProject);
    if (!rows[0]) fail('That task no longer exists.', 404);
    return c.json({ task: toTask(rows[0]) });
  });

  r.delete('/tasks/:id', async (c) => {
    const { rowCount } = await pool.query('delete from board_tasks where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That task no longer exists.', 404);
    return c.json({ ok: true });
  });

  /* ---------------------------------------------------------------- features */

  r.post('/projects/:id/features', async (c) => {
    const pid = pathId(c.req.param('id'));
    const name = text((await body(c)).name, 'Feature', BOARD_LIMITS.featureName);
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from board_features where project_id = $1', [pid]);
    if (count[0].n >= BOARD_LIMITS.featuresPerProject) fail(`A project holds at most ${BOARD_LIMITS.featuresPerProject} features.`);
    const { rows } = await pool
      .query<FeatureRow>(`insert into board_features (project_id, name) values ($1, $2) returning ${FEATURE_COLS}`, [pid, name])
      .catch(duplicateFeature);
    return c.json({ feature: toFeature(rows[0]) }, 201);
  });

  r.patch('/features/:id', async (c) => {
    const fid = pathId(c.req.param('id'));
    const name = text((await body(c)).name, 'Feature', BOARD_LIMITS.featureName);
    const { rows } = await pool
      .query<FeatureRow>(`update board_features set name = $1 where id = $2 returning ${FEATURE_COLS}`, [name, fid])
      .catch(duplicateFeature);
    if (!rows[0]) fail('That feature no longer exists.', 404);
    return c.json({ feature: toFeature(rows[0]) });
  });

  /** Deleting a feature keeps its tasks; they just lose the feature. */
  r.delete('/features/:id', async (c) => {
    const { rowCount } = await pool.query('delete from board_features where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That feature no longer exists.', 404);
    return c.json({ ok: true });
  });

  /* ---------------------------------------------------------------- notes */

  r.post('/projects/:id/notes', async (c) => {
    const pid = pathId(c.req.param('id'));
    const noteBody = text((await body(c)).body, 'Note', BOARD_LIMITS.noteBody);
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from board_notes where project_id = $1', [pid]);
    if (count[0].n >= BOARD_LIMITS.notesPerProject) fail(`A project holds at most ${BOARD_LIMITS.notesPerProject} notes.`);
    const { rows } = await pool
      .query<NoteRow>(`insert into board_notes (project_id, body) values ($1, $2) returning ${NOTE_COLS}`, [pid, noteBody])
      .catch(missingProject);
    return c.json({ note: toNote(rows[0]) }, 201);
  });

  r.patch('/notes/:id', async (c) => {
    const nid = pathId(c.req.param('id'));
    const noteBody = text((await body(c)).body, 'Note', BOARD_LIMITS.noteBody);
    const { rows } = await pool.query<NoteRow>(
      `update board_notes set body = $1, updated_at = now() where id = $2 returning ${NOTE_COLS}`,
      [noteBody, nid],
    );
    if (!rows[0]) fail('That note no longer exists.', 404);
    return c.json({ note: toNote(rows[0]) });
  });

  r.delete('/notes/:id', async (c) => {
    const { rowCount } = await pool.query('delete from board_notes where id = $1', [pathId(c.req.param('id'))]);
    if (!rowCount) fail('That note no longer exists.', 404);
    return c.json({ ok: true });
  });

  /** Saves the column layout after a drag: which column each task is in, and its order. */
  r.put('/order', async (c) => {
    const o = await body(c);
    const order = {} as BoardOrder;
    const seen = new Set<number>();
    for (const st of boardStatuses) {
      const ids = o[st];
      if (!Array.isArray(ids) || ids.length > BOARD_LIMITS.tasks) fail(`${st} must be a list of task ids.`);
      order[st] = (ids as unknown[]).map((v) => {
        const n = positiveInt(v, 'The order has an invalid id.');
        if (seen.has(n)) fail('The order lists a task twice.');
        seen.add(n);
        return n;
      });
    }
    const client = await pool.connect();
    const moved: BoardTask[] = [];
    try {
      await client.query('begin');
      for (const st of boardStatuses) {
        if (order[st].length === 0) continue;
        const { rows } = await client.query<TaskRow>(
          `update board_tasks b set status = $1, position = o.pos, ${doneAt('$1')}
           from unnest($2::int[]) with ordinality as o(id, pos) where b.id = o.id
           returning ${TASK_COLS.split(', ').map((c) => `b.${c}`).join(', ')}`,
          [st, order[st]],
        );
        moved.push(...rows.map(toTask));
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
    // The times come back so the page can show when a dragged task was finished.
    return c.json({ ok: true, tasks: moved });
  });

  return r;
}
