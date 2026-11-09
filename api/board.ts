import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type pg from 'pg';
import {
  BOARD_LIMITS,
  boardKinds,
  boardStatuses,
  type Board,
  type BoardKind,
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

type TaskRow = { id: number; project_id: number; title: string; status: BoardStatus };
const toTask = (t: TaskRow): BoardTask => ({ id: t.id, projectId: t.project_id, title: t.title, status: t.status });

const PROJECT_COLS = 'id, title, kind, description';
const TASK_COLS = 'id, project_id, title, status';

/** Turns "the project was deleted meanwhile" (foreign key error 23503) into a clear 404. */
const missingProject = (err: { code?: string }) => {
  if (err.code === '23503') fail('That project no longer exists.', 404);
  throw err;
};

export function boardRoutes(pool: pg.Pool) {
  const r = new Hono();

  r.get('/', async (c) => {
    const [projects, tasks] = await Promise.all([
      pool.query<BoardProject>(`select ${PROJECT_COLS} from board_projects order by lower(title), id`),
      pool.query<TaskRow>(`select ${TASK_COLS} from board_tasks order by status, position, id`),
    ]);
    return c.json({ projects: projects.rows, tasks: tasks.rows.map(toTask) } satisfies Board);
  });

  /* ---------------------------------------------------------------- projects */

  r.post('/projects', async (c) => {
    const o = await body(c);
    const values = [
      text(o.title, 'Project name', BOARD_LIMITS.projectTitle),
      kind(o.kind),
      text(o.description ?? '', 'Description', BOARD_LIMITS.description, true),
    ];
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from board_projects');
    if (count[0].n >= BOARD_LIMITS.projects) fail(`The board holds at most ${BOARD_LIMITS.projects} projects.`);
    const { rows } = await pool.query<BoardProject>(
      `insert into board_projects (title, kind, description) values ($1, $2, $3) returning ${PROJECT_COLS}`,
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
    const { rows: count } = await pool.query<{ n: number }>('select count(*)::int as n from board_tasks');
    if (count[0].n >= BOARD_LIMITS.tasks) fail(`The board holds at most ${BOARD_LIMITS.tasks} tasks.`);
    // New tasks go to the top of their column.
    const { rows } = await pool
      .query<TaskRow>(
        `insert into board_tasks (project_id, title, status, position)
         values ($1, $2, $3, coalesce((select min(position) - 1 from board_tasks where status = $3), 0))
         returning ${TASK_COLS}`,
        [projectId, title, st],
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
    if ('projectId' in o) add('project_id', positiveInt(o.projectId, 'Choose a project for the task.'));
    if ('status' in o) {
      add('status', status(o.status));
      // Moving through this route puts the task at the top of its new column.
      const s = vals.length;
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
    try {
      await client.query('begin');
      for (const st of boardStatuses) {
        if (order[st].length === 0) continue;
        await client.query(
          `update board_tasks b set status = $1, position = o.pos
           from unnest($2::int[]) with ordinality as o(id, pos) where b.id = o.id`,
          [st, order[st]],
        );
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
    return c.json({ ok: true });
  });

  return r;
}
