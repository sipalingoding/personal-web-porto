import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Trash } from '../components/Icons';
import { ApiError, adminRequest } from '../data/api';
import {
  BOARD_LIMITS,
  boardKinds,
  boardStatuses,
  statusLabel,
  type Board,
  type BoardKind,
  type BoardOrder,
  type BoardProject,
  type BoardStatus,
  type BoardTask,
} from '../data/board';

type Api = <T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) => Promise<T>;

const msg = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan.');

const orderOf = (tasks: BoardTask[]): BoardOrder =>
  Object.fromEntries(boardStatuses.map((s) => [s, tasks.filter((t) => t.status === s).map((t) => t.id)])) as BoardOrder;

/** Puts a task first in its column, where the server places new and re-columned tasks. */
function toTop(tasks: BoardTask[], task: BoardTask): BoardTask[] {
  const rest = tasks.filter((t) => t.id !== task.id);
  const first = rest.findIndex((t) => t.status === task.status);
  return first >= 0 ? [...rest.slice(0, first), task, ...rest.slice(first)] : [...rest, task];
}

/** Moves a task to `status`, before the task `beforeId` (or to the end of the column when null). */
function moveTask(tasks: BoardTask[], id: number, status: BoardStatus, beforeId: number | null): BoardTask[] {
  const task = tasks.find((t) => t.id === id);
  if (!task) return tasks;
  const rest = tasks.filter((t) => t.id !== id);
  const moved = { ...task, status };
  const at = beforeId === null ? -1 : rest.findIndex((t) => t.id === beforeId);
  if (at >= 0) return [...rest.slice(0, at), moved, ...rest.slice(at)];
  const last = rest.map((t) => t.status).lastIndexOf(status);
  return last >= 0 ? [...rest.slice(0, last + 1), moved, ...rest.slice(last + 1)] : [...rest, moved];
}

/* ------------------------------------------------------------------ dialogs */

function Modal(props: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="kb-dialog"
      aria-labelledby={headingId}
      onClose={props.onClose}
      // A click on the backdrop lands on the dialog itself, not on its content.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="kb-dialog-in">
        <div className="kb-dialog-hd">
          <h2 id={headingId}>{props.title}</h2>
          <button type="button" className="navb" onClick={() => ref.current?.close()}>
            Tutup
          </button>
        </div>
        {props.children}
      </div>
    </dialog>
  );
}

/** Save and delete row shared by both forms; delete asks once more before it runs. */
function FormActions(props: { busy: boolean; isNew: boolean; deleteText: ReactNode; onDelete: () => void; error: string }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      {props.error && (
        <p className="adm-status error" role="alert">
          {props.error}
        </p>
      )}
      {confirming ? (
        <div className="adm-confirm" role="group" aria-label="Konfirmasi hapus">
          <p>{props.deleteText}</p>
          <div className="adm-confirm-actions">
            <button type="button" className="btn g" autoFocus disabled={props.busy} onClick={() => setConfirming(false)}>
              Batal
            </button>
            <button type="button" className="btn del" disabled={props.busy} onClick={props.onDelete}>
              {props.busy ? 'Menghapus…' : 'Hapus'}
            </button>
          </div>
        </div>
      ) : (
        <div className="kb-dialog-actions">
          {props.isNew ? (
            <span />
          ) : (
            <button type="button" className="navb danger adm-icon" onClick={() => setConfirming(true)} aria-label="Hapus" title="Hapus">
              <Trash />
            </button>
          )}
          <button type="submit" className="btn p" disabled={props.busy}>
            {props.busy ? 'Menyimpan…' : props.isNew ? 'Tambah' : 'Simpan'}
          </button>
        </div>
      )}
    </>
  );
}

function ProjectForm(props: {
  project: BoardProject | null;
  taskCount: number;
  api: Api;
  onSaved: (p: BoardProject) => void;
  onDeleted: (id: number) => void;
  onClose: () => void;
}) {
  const p = props.project;
  const [title, setTitle] = useState(p?.title ?? '');
  const [kind, setKind] = useState<BoardKind>(p?.kind ?? 'Freelance');
  const [description, setDescription] = useState(p?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { title: useId(), desc: useId(), kind: useId() };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Nama project wajib diisi.');
    setBusy(true);
    setError('');
    try {
      const res = p
        ? await props.api<{ project: BoardProject }>('PATCH', `/board/projects/${p.id}`, { title, kind, description })
        : await props.api<{ project: BoardProject }>('POST', '/board/projects', { title, kind, description });
      props.onSaved(res.project);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!p) return;
    setBusy(true);
    try {
      await props.api('DELETE', `/board/projects/${p.id}`);
      props.onDeleted(p.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={p ? 'Edit project' : 'Project baru'} onClose={props.onClose}>
      <form className="kb-form" onSubmit={save} noValidate>
        <div className="adm-field">
          <label htmlFor={ids.title}>Nama project</label>
          <input id={ids.title} autoFocus value={title} maxLength={BOARD_LIMITS.projectTitle} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <fieldset className="kb-choice">
          <legend>Status</legend>
          {boardKinds.map((k) => (
            <label key={k}>
              <input type="radio" name={ids.kind} value={k} checked={kind === k} onChange={() => setKind(k)} />
              <span>{k}</span>
            </label>
          ))}
        </fieldset>
        <div className="adm-field">
          <label htmlFor={ids.desc}>Keterangan (opsional)</label>
          <textarea id={ids.desc} rows={4} value={description} maxLength={BOARD_LIMITS.description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <FormActions
          busy={busy}
          isNew={!p}
          error={error}
          onDelete={remove}
          deleteText={
            <>
              Hapus <b>{p?.title}</b>
              {props.taskCount > 0 && ` beserta ${props.taskCount} task-nya`}? Tidak bisa dibatalkan.
            </>
          }
        />
      </form>
    </Modal>
  );
}

function TaskForm(props: {
  task: BoardTask | null;
  status: BoardStatus;
  projectId: number | null;
  projects: BoardProject[];
  api: Api;
  onSaved: (t: BoardTask) => void;
  onDeleted: (id: number) => void;
  onAddProject: () => void;
  onClose: () => void;
  /** Inside a project's page the project is set and not shown as a choice. */
  fixed?: boolean;
}) {
  const t = props.task;
  const [title, setTitle] = useState(t?.title ?? '');
  const [projectId, setProjectId] = useState<number | ''>(t?.projectId ?? props.projectId ?? props.projects[0]?.id ?? '');
  const [status, setStatus] = useState<BoardStatus>(t?.status ?? props.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { title: useId(), project: useId(), status: useId() };

  if (props.projects.length === 0) {
    return (
      <Modal title="Task baru" onClose={props.onClose}>
        <p className="kb-note">Belum ada project. Buat project dulu, lalu tambahkan task ke dalamnya.</p>
        <div className="kb-dialog-actions">
          <span />
          <button type="button" className="btn p" onClick={props.onAddProject}>
            + Add project
          </button>
        </div>
      </Modal>
    );
  }

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Nama task wajib diisi.');
    if (projectId === '') return setError('Pilih project untuk task ini.');
    setBusy(true);
    setError('');
    try {
      let res: { task: BoardTask };
      if (t) {
        const patch: Record<string, unknown> = { title, projectId };
        if (status !== t.status) patch.status = status;
        res = await props.api('PATCH', `/board/tasks/${t.id}`, patch);
      } else {
        res = await props.api('POST', '/board/tasks', { title, projectId, status });
      }
      props.onSaved(res.task);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!t) return;
    setBusy(true);
    try {
      await props.api('DELETE', `/board/tasks/${t.id}`);
      props.onDeleted(t.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={t ? 'Edit task' : 'Task baru'} onClose={props.onClose}>
      <form className="kb-form" onSubmit={save} noValidate>
        <div className="adm-field">
          <label htmlFor={ids.title}>Nama task</label>
          <input id={ids.title} autoFocus value={title} maxLength={BOARD_LIMITS.taskTitle} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {props.fixed ? null : (
          <div className="adm-field">
            <label htmlFor={ids.project}>Project</label>
            <span className="adm-select">
              <select id={ids.project} value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
                {props.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.kind}
                  </option>
                ))}
              </select>
            </span>
          </div>
        )}
        <div className="adm-field">
          <label htmlFor={ids.status}>Kolom</label>
          <span className="adm-select">
            <select id={ids.status} value={status} onChange={(e) => setStatus(e.target.value as BoardStatus)}>
              {boardStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </span>
        </div>
        <FormActions
          busy={busy}
          isNew={!t}
          error={error}
          onDelete={remove}
          deleteText={
            <>
              Hapus task <b>{t?.title}</b>? Tidak bisa dibatalkan.
            </>
          }
        />
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ list and detail */

type Dialog =
  | { type: 'project'; project: BoardProject | null }
  | { type: 'task'; task: BoardTask | null; status: BoardStatus };

/** Share of a project's tasks that are done, as a whole percent; null when it has none. */
function progressOf(tasks: BoardTask[]) {
  if (tasks.length === 0) return null;
  return Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100);
}

function Progress({ tasks, large = false }: { tasks: BoardTask[]; large?: boolean }) {
  const pct = progressOf(tasks);
  const done = tasks.filter((t) => t.status === 'done').length;
  return (
    <div className={['pj-prog', large && 'lg', pct === 100 && 'complete'].filter(Boolean).join(' ')}>
      <div className="pj-prog-row">
        <b>{pct === null ? '–' : `${pct}%`}</b>
        <span>{pct === null ? 'Belum ada task' : `${done} dari ${tasks.length} task selesai`}</span>
      </div>
      <span
        className="pj-bar"
        role="progressbar"
        aria-label="Progress task"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? 0}
      >
        <i style={{ width: `${pct ?? 0}%` }} />
      </span>
    </div>
  );
}

function ProjectList(props: { projects: BoardProject[]; tasks: BoardTask[]; onOpen: (id: number) => void; onAdd: () => void }) {
  if (props.projects.length === 0) {
    return (
      <div className="pj-empty">
        <p>Belum ada project.</p>
        <button type="button" className="btn p" onClick={props.onAdd}>
          + Add project
        </button>
      </div>
    );
  }
  return (
    <ul className="pj-grid">
      {props.projects.map((p) => {
        const own = props.tasks.filter((t) => t.projectId === p.id);
        return (
          <li key={p.id}>
            <a
              className="pj-card"
              href={`/mydashboard/project/${p.id}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                props.onOpen(p.id);
              }}
            >
              <span className="pj-card-hd">
                <span className={`kb-sq ${p.kind.toLowerCase()}`} aria-hidden="true">
                  {p.title.trim().charAt(0).toUpperCase()}
                </span>
                <span className="pj-name">{p.title}</span>
                <span className="pj-go" aria-hidden="true">
                  ↗
                </span>
              </span>
              <span className={`kb-kind ${p.kind.toLowerCase()}`}>{p.kind}</span>
              {p.description && <span className="pj-desc">{p.description}</span>}
              <Progress tasks={own} />
              <span className="pj-counts">
                {boardStatuses.map((st) => (
                  <span key={st} className={`pj-count ${st}`}>
                    <i aria-hidden="true" />
                    {statusLabel[st]} <b>{own.filter((t) => t.status === st).length}</b>
                  </span>
                ))}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProjectBoard(props: {
  adminKey: string;
  onLocked: () => void;
  /** Project whose page is open, from the address; null shows the list. */
  openId: number | null;
  onOpen: (id: number | null) => void;
}) {
  const { adminKey, onLocked } = props;
  const [board, setBoard] = useState<Board | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [drop, setDrop] = useState<{ status: BoardStatus; before: number | null } | null>(null);

  const api: Api = async (method, path, body) => {
    try {
      return await adminRequest(adminKey, method, path, body);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLocked();
      throw err;
    }
  };

  useEffect(() => {
    let live = true;
    setLoadError('');
    adminRequest<Board>(adminKey, 'GET', '/board')
      .then((res) => live && setBoard(res))
      .catch((err: unknown) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 401) onLocked();
        else setLoadError(msg(err));
      });
    return () => {
      live = false;
    };
    // onLocked is a fresh function each render; only the key and retries decide when to load.
  }, [adminKey, attempt]);

  const head = (title: string, extra?: ReactNode) => (
    <header className="dsh-head pj-head">
      <div>
        <span className="ix">
          <b>/</b>project
        </span>
        <h1>{title}</h1>
      </div>
      {extra}
    </header>
  );

  if (!board) {
    return (
      <>
        {head('Project')}
        {loadError ? (
          <div className="adm-error" role="alert">
            <p>Data project tidak bisa dimuat: {loadError}</p>
            <button type="button" className="btn g" onClick={() => setAttempt((n) => n + 1)}>
              Coba lagi
            </button>
          </div>
        ) : (
          <p className="adm-status busy" role="status">
            Memuat project…
          </p>
        )}
      </>
    );
  }

  const { projects, tasks } = board;
  const project = props.openId === null ? null : (projects.find((p) => p.id === props.openId) ?? null);
  const setTasks = (next: BoardTask[]) => setBoard((b) => b && { ...b, tasks: next });
  const countFor = (id: number) => tasks.filter((t) => t.projectId === id).length;

  const errorBox = error && (
    <div className="adm-error kb-error" role="alert">
      <p>{error}</p>
      <button type="button" className="navb" onClick={() => setError('')}>
        Tutup
      </button>
    </div>
  );

  const dialogs = (
    <>
      {dialog?.type === 'project' && (
        <ProjectForm
          key={dialog.project?.id ?? 'new'}
          project={dialog.project}
          taskCount={dialog.project ? countFor(dialog.project.id) : 0}
          api={api}
          onSaved={(p) => {
            const isNew = !projects.some((x) => x.id === p.id);
            setBoard((b) => {
              if (!b) return b;
              const list = isNew ? [...b.projects, p] : b.projects.map((x) => (x.id === p.id ? p : x));
              return { ...b, projects: list.sort((a, c) => a.title.localeCompare(c.title, 'id', { sensitivity: 'base' })) };
            });
            setDialog(null);
            // A new project opens straight away, ready for its first task.
            if (isNew) props.onOpen(p.id);
          }}
          onDeleted={(id) => {
            // Tasks go with their project, as the database cascade does.
            setBoard((b) => b && { projects: b.projects.filter((x) => x.id !== id), tasks: b.tasks.filter((t) => t.projectId !== id) });
            setDialog(null);
            props.onOpen(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'task' && project && (
        <TaskForm
          key={dialog.task?.id ?? `new-${dialog.status}`}
          task={dialog.task}
          status={dialog.status}
          projectId={project.id}
          projects={[project]}
          fixed
          api={api}
          onSaved={(t) => {
            const old = tasks.find((x) => x.id === t.id);
            setTasks(!old || old.status !== t.status ? toTop(tasks, t) : tasks.map((x) => (x.id === t.id ? t : x)));
            setDialog(null);
          }}
          onDeleted={(id) => {
            setTasks(tasks.filter((x) => x.id !== id));
            setDialog(null);
          }}
          onAddProject={() => setDialog({ type: 'project', project: null })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );

  /* ---------------------------------------------------------------- list */
  if (!project) {
    return (
      <>
        {head(
          'Project',
          projects.length > 0 && (
            <button type="button" className="btn p" onClick={() => setDialog({ type: 'project', project: null })}>
              + Add project
            </button>
          ),
        )}
        {props.openId !== null && (
          <p className="adm-status error" role="status">
            Project itu tidak ditemukan. Mungkin sudah dihapus.
          </p>
        )}
        {errorBox}
        <ProjectList projects={projects} tasks={tasks} onOpen={(id) => props.onOpen(id)} onAdd={() => setDialog({ type: 'project', project: null })} />
        {dialogs}
      </>
    );
  }

  /* ---------------------------------------------------------------- detail */
  const own = tasks.filter((t) => t.projectId === project.id);

  /* Dragging: the drop position is worked out from the pointer against the cards' middles. */
  const onDragOver = (status: BoardStatus) => (e: DragEvent<HTMLDivElement>) => {
    if (dragId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cards = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.kb-card:not(.dragging)'));
    const next = cards.find((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    const before = next ? Number(next.dataset.id) : null;
    if (drop?.status !== status || drop.before !== before) setDrop({ status, before });
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragId === null || !drop) return;
    const prev = tasks;
    const next = moveTask(tasks, dragId, drop.status, drop.before);
    setDragId(null);
    setDrop(null);
    if (JSON.stringify(orderOf(next)) === JSON.stringify(orderOf(prev))) return;
    setTasks(next);
    try {
      await api('PUT', '/board/order', orderOf(next));
    } catch (err) {
      setTasks(prev);
      setError(msg(err));
    }
  };

  return (
    <>
      <a
        className="pj-back"
        href="/mydashboard/project"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          props.onOpen(null);
        }}
      >
        ← Semua project
      </a>

      <section className="pj-hero" aria-label="Detail project">
        <div className="pj-hero-main">
          <div className="pj-hero-title">
            <span className={`kb-sq ${project.kind.toLowerCase()}`} aria-hidden="true">
              {project.title.trim().charAt(0).toUpperCase()}
            </span>
            <h1>{project.title}</h1>
            <span className={`kb-kind ${project.kind.toLowerCase()}`}>{project.kind}</span>
          </div>
          {project.description && <p className="pj-hero-desc">{project.description}</p>}
        </div>
        <div className="pj-hero-side">
          <Progress tasks={own} large />
          <button type="button" className="btn g" onClick={() => setDialog({ type: 'project', project })}>
            Edit project
          </button>
        </div>
      </section>

      {errorBox}

      <div className="kb">
        {boardStatuses.map((status) => {
          const list = own.filter((t) => t.status === status);
          const isTarget = drop?.status === status;
          const add = () => setDialog({ type: 'task', task: null, status });
          return (
            <section key={status} className={isTarget ? `kb-col ${status} over` : `kb-col ${status}`} aria-label={statusLabel[status]}>
              <header className="kb-col-hd">
                <span className="kb-sq col" aria-label={`${list.length} task`}>
                  {list.length}
                </span>
                <span className="kb-pill">{statusLabel[status]}</span>
                <button type="button" className="kb-plus" onClick={add} aria-label={`Tambah task ke ${statusLabel[status]}`}>
                  +
                </button>
              </header>
              <div
                className="kb-list"
                onDragOver={onDragOver(status)}
                onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrop(null)}
                onDrop={onDrop}
              >
                {list.map((t) => (
                  <div key={t.id} className="kb-slot">
                    {isTarget && drop.before === t.id && dragId !== t.id && <div className="kb-drop" aria-hidden="true" />}
                    {/* A div rather than a button: Firefox will not drag a button. */}
                    <div
                      role="button"
                      tabIndex={0}
                      className={dragId === t.id ? 'kb-card dragging' : 'kb-card'}
                      draggable
                      data-id={t.id}
                      onClick={() => setDialog({ type: 'task', task: t, status: t.status })}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        setDialog({ type: 'task', task: t, status: t.status });
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(t.id));
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDrop(null);
                      }}
                    >
                      <span className={`kb-check ${status}`} aria-hidden="true" />
                      <span className="kb-title">{t.title}</span>
                    </div>
                  </div>
                ))}
                {isTarget && drop.before === null && <div className="kb-drop" aria-hidden="true" />}
                {list.length === 0 && <p className="kb-empty">Belum ada task</p>}
                <button type="button" className="kb-add" onClick={add}>
                  + New
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {dialogs}
    </>
  );
}
