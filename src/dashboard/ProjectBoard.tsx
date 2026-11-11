import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { ApiError, adminRequest } from '../data/api';
import {
  BOARD_LIMITS,
  boardKinds,
  boardStatuses,
  statusLabel,
  type Board,
  type BoardFeature,
  type BoardKind,
  type BoardLink,
  type BoardNote,
  type BoardOrder,
  type BoardProject,
  type BoardStatus,
  type BoardTask,
} from '../data/board';
import { Glyph, IconButton } from './icons';
import { HomeTitle, HomeView } from './Home';

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
  // Shown straight away; the server's time replaces it once the move is saved.
  const doneAt = status !== 'done' ? null : task.status === 'done' ? task.doneAt : new Date().toISOString();
  const moved = { ...task, status, doneAt };
  const at = beforeId === null ? -1 : rest.findIndex((t) => t.id === beforeId);
  if (at >= 0) return [...rest.slice(0, at), moved, ...rest.slice(at)];
  const last = rest.map((t) => t.status).lastIndexOf(status);
  return last >= 0 ? [...rest.slice(0, last + 1), moved, ...rest.slice(last + 1)] : [...rest, moved];
}

/* ------------------------------------------------------------------ dialogs */

function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={props.wide ? 'kb-dialog wide' : 'kb-dialog'}
      aria-labelledby={headingId}
      onClose={props.onClose}
      // A click on the backdrop lands on the dialog itself, not on its content.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="kb-dialog-in">
        <div className="kb-dialog-hd">
          <h2 id={headingId}>{props.title}</h2>
          <IconButton icon="close" label="Tutup" tone="ghost" onClick={() => ref.current?.close()} />
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
            <IconButton icon="close" label="Batal" autoFocus disabled={props.busy} onClick={() => setConfirming(false)} />
            <IconButton icon="trash" label="Hapus" tone="del" busy={props.busy} onClick={props.onDelete} />
          </div>
        </div>
      ) : (
        <div className="kb-dialog-actions">
          {props.isNew ? (
            <span />
          ) : (
            <IconButton icon="trash" label="Hapus" onClick={() => setConfirming(true)} />
          )}
          <IconButton type="submit" icon={props.isNew ? 'plus' : 'check'} label={props.isNew ? 'Tambah' : 'Simpan'} tone="p" busy={props.busy} />
        </div>
      )}
    </>
  );
}

type FeaturesUpdate = (update: (features: BoardFeature[]) => BoardFeature[]) => void;

const byName = (a: BoardFeature, b: BoardFeature) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });

/** One-line input that creates a feature for a project; Enter adds it without submitting the outer form. */
function NewFeature(props: { projectId: number; api: Api; onCreated: (f: BoardFeature) => void; onCancel?: () => void; autoFocus?: boolean }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  const create = async () => {
    if (!name.trim()) return setError('Tulis nama fitur dulu.');
    setBusy(true);
    setError('');
    try {
      const res = await props.api<{ feature: BoardFeature }>('POST', `/board/projects/${props.projectId}/features`, { name });
      props.onCreated(res.feature);
      setName('');
    } catch (err) {
      setError(msg(err));
    }
    setBusy(false);
  };

  return (
    <div className="ft-new">
      <div className="ft-new-row">
        <label className="sr-only" htmlFor={id}>
          Nama fitur baru
        </label>
        <input
          id={id}
          autoFocus={props.autoFocus}
          placeholder="Nama fitur, misalnya Login"
          value={name}
          maxLength={BOARD_LIMITS.featureName}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
            if (e.key === 'Escape' && props.onCancel) {
              e.preventDefault();
              e.stopPropagation();
              props.onCancel();
            }
          }}
        />
        <IconButton icon="plus" label="Tambah fitur" tone="p" size="sm" busy={busy} onClick={create} />
        {props.onCancel && <IconButton icon="close" label="Batal" tone="ghost" size="sm" onClick={props.onCancel} />}
      </div>
      {error && (
        <p className="adm-status error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Feature list inside the project form: add new ones, remove old ones (their tasks stay). */
function FeatureManager(props: { projectId: number; features: BoardFeature[]; taskCount: (id: number) => number; api: Api; onChange: FeaturesUpdate }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const remove = async (f: BoardFeature) => {
    setBusyId(f.id);
    setError('');
    try {
      await props.api('DELETE', `/board/features/${f.id}`);
      props.onChange((list) => list.filter((x) => x.id !== f.id));
    } catch (err) {
      setError(msg(err));
    }
    setBusyId(null);
  };

  return (
    <fieldset className="ft-manage">
      <legend>Fitur</legend>
      {props.features.length > 0 ? (
        <ul className="ft-chips">
          {props.features.map((f) => (
            <li key={f.id}>
              <span>{f.name}</span>
              <span className="ft-n">{props.taskCount(f.id)}</span>
              <IconButton
                icon="close"
                label={`Hapus fitur ${f.name} (task-nya tetap ada)`}
                tone="ghost"
                size="sm"
                busy={busyId === f.id}
                onClick={() => remove(f)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="ft-empty">Belum ada fitur.</p>
      )}
      <NewFeature projectId={props.projectId} api={props.api} onCreated={(f) => props.onChange((list) => [...list, f].sort(byName))} />
      {error && (
        <p className="adm-status error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

type LinkRow = BoardLink & { key: number };

let linkKey = 0;
const toRows = (links: BoardLink[]): LinkRow[] => links.map((l) => ({ ...l, key: ++linkKey }));

/** "https://www.github.com/me/repo" reads as "github.com/me/repo". */
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** Rows of URL + optional label; empty rows are dropped on save. */
function LinksEditor({ rows, onChange }: { rows: LinkRow[]; onChange: (rows: LinkRow[]) => void }) {
  const set = (key: number, patch: Partial<BoardLink>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <fieldset className="ln-edit">
      <legend>Link</legend>
      {rows.length === 0 && <p className="ft-empty">Belum ada link.</p>}
      {rows.map((r, i) => (
        <div key={r.key} className="ln-row">
          <input
            aria-label={`URL link ${i + 1}`}
            placeholder="github.com/nama/repo"
            inputMode="url"
            value={r.url}
            maxLength={BOARD_LIMITS.linkUrl}
            onChange={(e) => set(r.key, { url: e.target.value })}
          />
          <input
            aria-label={`Label link ${i + 1} (opsional)`}
            placeholder="Label (opsional)"
            value={r.label}
            maxLength={BOARD_LIMITS.linkLabel}
            onChange={(e) => set(r.key, { label: e.target.value })}
          />
          <IconButton icon="close" label={`Hapus link ${i + 1}`} tone="ghost" size="sm" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} />
        </div>
      ))}
      {rows.length < BOARD_LIMITS.linksPerProject && (
        <IconButton
          icon="plus"
          label="Tambah link"
          size="sm"
          className="ln-add"
          onClick={() => onChange([...rows, { label: '', url: '', key: ++linkKey }])}
        />
      )}
    </fieldset>
  );
}

function ProjectForm(props: {
  project: BoardProject | null;
  taskCount: number;
  features: BoardFeature[];
  featureTaskCount: (id: number) => number;
  onFeaturesChange: FeaturesUpdate;
  api: Api;
  onSaved: (p: BoardProject) => void;
  onDeleted: (id: number) => void;
  onClose: () => void;
}) {
  const p = props.project;
  const [title, setTitle] = useState(p?.title ?? '');
  const [kind, setKind] = useState<BoardKind>(p?.kind ?? 'Freelance');
  const [description, setDescription] = useState(p?.description ?? '');
  const [linkRows, setLinkRows] = useState(() => toRows(p?.links ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { title: useId(), desc: useId(), kind: useId() };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Nama project wajib diisi.');
    const filled = linkRows.filter((r) => r.url.trim() || r.label.trim());
    if (filled.some((r) => !r.url.trim())) return setError('Setiap link yang punya label juga perlu URL.');
    const links = filled.map(({ label, url }) => ({ label, url }));
    setBusy(true);
    setError('');
    try {
      const res = p
        ? await props.api<{ project: BoardProject }>('PATCH', `/board/projects/${p.id}`, { title, kind, description, links })
        : await props.api<{ project: BoardProject }>('POST', '/board/projects', { title, kind, description, links });
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
        <LinksEditor rows={linkRows} onChange={setLinkRows} />
        {p ? (
          <FeatureManager
            projectId={p.id}
            features={props.features}
            taskCount={props.featureTaskCount}
            api={props.api}
            onChange={props.onFeaturesChange}
          />
        ) : (
          <p className="ft-hint">Fitur bisa ditambahkan setelah project dibuat.</p>
        )}
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
  /** Features of the task's project, offered in the Fitur dropdown. */
  features: BoardFeature[];
  onFeatureCreated: (f: BoardFeature) => void;
  /** Feature to preselect for a new task, e.g. the one the page is filtered by. */
  featureId?: number | null;
  /** Inside a project's page the project is set and not shown as a choice. */
  fixed?: boolean;
}) {
  const t = props.task;
  const [title, setTitle] = useState(t?.title ?? '');
  const [projectId, setProjectId] = useState<number | ''>(t?.projectId ?? props.projectId ?? props.projects[0]?.id ?? '');
  const [status, setStatus] = useState<BoardStatus>(t?.status ?? props.status);
  const [featureId, setFeatureId] = useState<number | null>(t ? t.featureId : (props.featureId ?? null));
  const [addingFeature, setAddingFeature] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { title: useId(), project: useId(), status: useId(), feature: useId() };
  const features = props.features.filter((f) => f.projectId === projectId);

  if (props.projects.length === 0) {
    return (
      <Modal title="Task baru" onClose={props.onClose}>
        <p className="kb-note">Belum ada project. Buat project dulu, lalu tambahkan task ke dalamnya.</p>
        <div className="kb-dialog-actions">
          <span />
          <IconButton icon="plus" label="Add project" tone="p" onClick={props.onAddProject} />
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
        const patch: Record<string, unknown> = { title, projectId, featureId };
        if (status !== t.status) patch.status = status;
        res = await props.api('PATCH', `/board/tasks/${t.id}`, patch);
      } else {
        res = await props.api('POST', '/board/tasks', { title, projectId, status, featureId });
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
              <select
                id={ids.project}
                value={projectId}
                onChange={(e) => {
                  setProjectId(Number(e.target.value));
                  setFeatureId(null);
                }}
              >
                {props.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.kind}
                  </option>
                ))}
              </select>
            </span>
          </div>
        )}
        {projectId !== '' && (
          <div className="adm-field">
            <label htmlFor={ids.feature}>Fitur</label>
            {addingFeature ? (
              <NewFeature
                autoFocus
                projectId={projectId}
                api={props.api}
                onCreated={(f) => {
                  props.onFeatureCreated(f);
                  setFeatureId(f.id);
                  setAddingFeature(false);
                }}
                onCancel={() => setAddingFeature(false)}
              />
            ) : (
              <span className="adm-select">
                <select
                  id={ids.feature}
                  value={featureId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'new') setAddingFeature(true);
                    else setFeatureId(v === '' ? null : Number(v));
                  }}
                >
                  <option value="">Tanpa fitur</option>
                  {features.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                  <option value="new">+ Fitur baru…</option>
                </select>
              </span>
            )}
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
        {t && <TaskTimes task={t} />}
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

/* ------------------------------------------------------------------ list view */

type TaskView = 'board' | 'list';
const VIEW_KEY = 'mydashboard.taskView';

/** The chosen view is a per-browser convenience; storage may be blocked, so both calls are guarded. */
function readView(): TaskView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
}

function saveView(v: TaskView) {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* not saved; the page still switches */
  }
}

const JKT = 'Asia/Jakarta';
const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: JKT }).format(new Date(iso));
const dayTitle = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: JKT }).format(new Date(iso));
const clock = (iso: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: JKT }).format(new Date(iso));

/** Tasks newest first, grouped by the day they were added, like a commit history. */
function TaskTable(props: { tasks: BoardTask[]; featureName: Map<number, string>; onOpen: (t: BoardTask) => void; onAdd: () => void }) {
  const sorted = [...props.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  const days: { key: string; title: string; tasks: BoardTask[] }[] = [];
  for (const t of sorted) {
    const key = dayKey(t.createdAt);
    const last = days[days.length - 1];
    if (last?.key === key) last.tasks.push(t);
    else days.push({ key, title: dayTitle(t.createdAt), tasks: [t] });
  }

  return (
    <div className="tl">
      <div className="tl-hd">
        <span>
          {sorted.length} task · terbaru di atas
        </span>
        <IconButton icon="plus" label="Tambah task" size="sm" className="kb-plus" onClick={props.onAdd} />
      </div>
      {days.length === 0 && <p className="kb-empty tl-empty">Belum ada task</p>}
      {days.map((d) => (
        <section key={d.key} className="tl-day" aria-label={`Dibuat ${d.title}`}>
          <h2 className="tl-date">
            <span className="tl-dot" aria-hidden="true" />
            Dibuat {d.title}
          </h2>
          <ul className="tl-rows">
            {d.tasks.map((t) => (
              <li key={t.id}>
                <button type="button" className={`tl-row ${t.status}`} onClick={() => props.onOpen(t)}>
                  <span className={`kb-check ${t.status}`} aria-hidden="true" />
                  <span className="tl-main">
                    <span className="kb-title">{t.title}</span>
                    {t.featureId !== null && props.featureName.has(t.featureId) && (
                      <span className="kb-feature">{props.featureName.get(t.featureId)}</span>
                    )}
                  </span>
                  <span className={`tl-status ${t.status}`}>{statusLabel[t.status]}</span>
                  <span className="tl-time">
                    <time dateTime={t.createdAt} title={`Dibuat ${noteDate(t.createdAt)}`}>
                      {clock(t.createdAt)}
                    </time>
                  </span>
                  <span className="tl-done">
                    {t.status === 'done' && t.doneAt ? (
                      <>
                        Selesai <time dateTime={t.doneAt}>{noteDate(t.doneAt)}</time>
                      </>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** When a task was added and, once in Selesai, when it was finished. */
function TaskTimes({ task }: { task: BoardTask }) {
  if (!task.createdAt) return null;
  return (
    <span className="kb-times">
      <span>
        Dibuat <time dateTime={task.createdAt}>{noteDate(task.createdAt)}</time>
      </span>
      {task.status === 'done' && task.doneAt && (
        <span className="done">
          Selesai <time dateTime={task.doneAt}>{noteDate(task.doneAt)}</time>
        </span>
      )}
    </span>
  );
}

const noteDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(
    new Date(iso),
  );

function NoteItem(props: { note: BoardNote; api: Api; onSaved: (n: BoardNote) => void; onDeleted: (id: number) => void }) {
  const n = props.note;
  const [mode, setMode] = useState<'read' | 'edit' | 'confirm'>('read');
  const [draft, setDraft] = useState(n.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editId = useId();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return setError('Note tidak boleh kosong.');
    setBusy(true);
    setError('');
    try {
      const res = await props.api<{ note: BoardNote }>('PATCH', `/board/notes/${n.id}`, { body: draft });
      props.onSaved(res.note);
      setMode('read');
    } catch (err) {
      setError(msg(err));
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    try {
      await props.api('DELETE', `/board/notes/${n.id}`);
      props.onDeleted(n.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  const edited = n.updatedAt !== n.createdAt;

  return (
    <li className="nt-item">
      <div className="nt-meta">
        <time dateTime={n.createdAt}>{noteDate(n.createdAt)}</time>
        {edited && <span title={`Diubah ${noteDate(n.updatedAt)}`}>· diubah</span>}
        {mode === 'read' && (
          <span className="nt-tools">
            <IconButton
              icon="pencil"
              label="Edit note"
              tone="ghost"
              size="sm"
              onClick={() => {
                setDraft(n.body);
                setMode('edit');
              }}
            />
            <IconButton icon="trash" label="Hapus note" tone="ghost" size="sm" className="danger" onClick={() => setMode('confirm')} />
          </span>
        )}
      </div>
      {mode === 'edit' ? (
        <form className="nt-form" onSubmit={save}>
          <label className="sr-only" htmlFor={editId}>
            Edit note
          </label>
          <textarea
            id={editId}
            autoFocus
            rows={5}
            value={draft}
            maxLength={BOARD_LIMITS.noteBody}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(e);
              if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                setMode('read');
              }
            }}
          />
          <div className="nt-actions">
            <IconButton icon="close" label="Batal" size="sm" onClick={() => setMode('read')} />
            <IconButton type="submit" icon="check" label="Simpan" tone="p" size="sm" busy={busy} />
          </div>
        </form>
      ) : (
        <p className="nt-body">{n.body}</p>
      )}
      {mode === 'confirm' && (
        <div className="nt-confirm" role="group" aria-label="Konfirmasi hapus note">
          <span>Hapus note ini?</span>
          <IconButton icon="close" label="Batal" size="sm" autoFocus disabled={busy} onClick={() => setMode('read')} />
          <IconButton icon="trash" label="Hapus" tone="del" size="sm" busy={busy} onClick={remove} />
        </div>
      )}
      {error && (
        <p className="adm-status error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

/** Notes of one project: write a new one at the top, read and edit the rest below, newest first. */
function NotesDialog(props: {
  project: BoardProject;
  notes: BoardNote[];
  api: Api;
  onChange: (update: (notes: BoardNote[]) => BoardNote[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputId = useId();

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return setError('Tulis note dulu.');
    setBusy(true);
    setError('');
    try {
      const res = await props.api<{ note: BoardNote }>('POST', `/board/projects/${props.project.id}/notes`, { body: draft });
      props.onChange((list) => [res.note, ...list]);
      setDraft('');
    } catch (err) {
      setError(msg(err));
    }
    setBusy(false);
  };

  return (
    <Modal title={`Notes · ${props.project.title}`} onClose={props.onClose} wide>
      <form className="nt-form" onSubmit={add}>
        <label className="sr-only" htmlFor={inputId}>
          Note baru
        </label>
        <textarea
          id={inputId}
          autoFocus
          rows={4}
          placeholder="Tulis note… (Ctrl/⌘ + Enter untuk menyimpan)"
          value={draft}
          maxLength={BOARD_LIMITS.noteBody}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && add(e)}
        />
        <div className="nt-actions">
          <span className="nt-count">
            {props.notes.length} {props.notes.length === 1 ? 'note' : 'notes'}
          </span>
          <IconButton type="submit" icon="plus" label="Tambah note" tone="p" busy={busy} />
        </div>
        {error && (
          <p className="adm-status error" role="alert">
            {error}
          </p>
        )}
      </form>
      {props.notes.length === 0 ? (
        <p className="nt-empty">Belum ada note untuk project ini.</p>
      ) : (
        <ol className="nt-list">
          {props.notes.map((n) => (
            <NoteItem
              key={n.id}
              note={n}
              api={props.api}
              onSaved={(saved) => props.onChange((list) => list.map((x) => (x.id === saved.id ? saved : x)))}
              onDeleted={(id) => props.onChange((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </ol>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ list and detail */

type Dialog =
  | { type: 'project'; project: BoardProject | null }
  | { type: 'task'; task: BoardTask | null; status: BoardStatus }
  | { type: 'notes' };

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
  /** Feature the columns are narrowed to: an id, 'none' for tasks without one, or null for all. */
  const [featureFilter, setFeatureFilter] = useState<number | 'none' | null>(null);
  const [view, setView] = useState<TaskView>(readView);
  const filterId = useId();

  // Each project page starts with all its tasks shown.
  useEffect(() => setFeatureFilter(null), [props.openId]);

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


  if (!board) {
    return (
      <>
        <HomeTitle />
        {loadError ? (
          <div className="adm-error" role="alert">
            <p>Data project tidak bisa dimuat: {loadError}</p>
            <IconButton icon="retry" label="Coba lagi" onClick={() => setAttempt((n) => n + 1)} />
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
      <IconButton icon="close" label="Tutup" tone="ghost" size="sm" onClick={() => setError('')} />
    </div>
  );

  const dialogs = (
    <>
      {dialog?.type === 'project' && (
        <ProjectForm
          key={dialog.project?.id ?? 'new'}
          project={dialog.project}
          taskCount={dialog.project ? countFor(dialog.project.id) : 0}
          features={dialog.project ? board.features.filter((f) => f.projectId === dialog.project!.id) : []}
          featureTaskCount={(id) => tasks.filter((t) => t.featureId === id).length}
          onFeaturesChange={(update) =>
            setBoard((b) => {
              if (!b || !dialog.project) return b;
              const pid = dialog.project.id;
              const mine = update(b.features.filter((f) => f.projectId === pid));
              const kept = new Set(mine.map((f) => f.id));
              return {
                ...b,
                features: [...b.features.filter((f) => f.projectId !== pid), ...mine],
                // Tasks of a removed feature stay, without it, as the database does.
                tasks: b.tasks.map((t) => (t.projectId === pid && t.featureId !== null && !kept.has(t.featureId) ? { ...t, featureId: null } : t)),
              };
            })
          }
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
            // Tasks and notes go with their project, as the database cascade does.
            setBoard(
              (b) =>
                b && {
                  projects: b.projects.filter((x) => x.id !== id),
                  features: b.features.filter((f) => f.projectId !== id),
                  tasks: b.tasks.filter((t) => t.projectId !== id),
                  notes: b.notes.filter((n) => n.projectId !== id),
                },
            );
            setDialog(null);
            props.onOpen(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'notes' && project && (
        <NotesDialog
          project={project}
          notes={board.notes.filter((n) => n.projectId === project.id)}
          api={api}
          onChange={(update) =>
            setBoard((b) => {
              if (!b) return b;
              const mine = update(b.notes.filter((n) => n.projectId === project.id));
              return { ...b, notes: [...mine, ...b.notes.filter((n) => n.projectId !== project.id)] };
            })
          }
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
          features={board.features}
          featureId={featureFilter !== null && featureFilter !== 'none' ? featureFilter : null}
          onFeatureCreated={(f) => setBoard((b) => b && { ...b, features: [...b.features, f].sort(byName) })}
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
        <HomeView
          projects={projects}
          tasks={tasks}
          features={board.features}
          onOpen={(id) => props.onOpen(id)}
          onAdd={() => setDialog({ type: 'project', project: null })}
          notice={
            <>
              {props.openId !== null && (
                <p className="adm-status error" role="status">
                  Project itu tidak ditemukan. Mungkin sudah dihapus.
                </p>
              )}
              {errorBox}
            </>
          }
        />
        {dialogs}
      </>
    );
  }

  /* ---------------------------------------------------------------- detail */
  const own = tasks.filter((t) => t.projectId === project.id);
  const projectFeatures = board.features.filter((f) => f.projectId === project.id);
  const featureName = new Map(projectFeatures.map((f) => [f.id, f.name]));
  const activeFeature = featureFilter === 'none' || (featureFilter !== null && featureName.has(featureFilter)) ? featureFilter : null;
  const shown =
    activeFeature === null ? own : own.filter((t) => (activeFeature === 'none' ? t.featureId === null : t.featureId === activeFeature));
  const noteCount = board.notes.filter((n) => n.projectId === project.id).length;

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
      const res = await api<{ tasks?: BoardTask[] }>('PUT', '/board/order', orderOf(next));
      const saved = new Map((res.tasks ?? []).map((t) => [t.id, t]));
      if (saved.size) setBoard((b) => b && { ...b, tasks: b.tasks.map((t) => (saved.has(t.id) ? { ...t, doneAt: saved.get(t.id)!.doneAt } : t)) });
    } catch (err) {
      setTasks(prev);
      setError(msg(err));
    }
  };

  return (
    <div className="pj-detail">
      <a
        className="pj-back"
        aria-label="Semua project"
        title="Semua project"
        href="/mydashboard/project"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          props.onOpen(null);
        }}
      >
        <Glyph name="back" />
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
          {(project.links ?? []).length > 0 && (
            <ul className="pj-links" aria-label="Link project">
              {project.links.map((l, i) => (
                <li key={`${l.url}-${i}`}>
                  <a href={l.url} target="_blank" rel="noreferrer" title={l.url}>
                    <Glyph name="link" />
                    <span>{l.label || shortUrl(l.url)}</span>
                    <span className="pj-link-go" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {project.description && <p className="pj-hero-desc">{project.description}</p>}
        </div>
        <div className="pj-hero-side">
          <Progress tasks={own} large />
          <div className="pj-hero-actions">
            <span className="pj-notes">
              <IconButton
                icon="note"
                label={`Notes, ${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`}
                onClick={() => setDialog({ type: 'notes' })}
              />
              {noteCount > 0 && (
                <span className="pj-notes-n" aria-hidden="true">
                  {noteCount}
                </span>
              )}
            </span>
            <IconButton icon="pencil" label="Edit project" onClick={() => setDialog({ type: 'project', project })} />
          </div>
        </div>
      </section>

      {errorBox}

      <div className="pj-toolbar">
        <div className="pj-filter">
          <label htmlFor={filterId}>Fitur</label>
          <span className="adm-select">
            <select
              id={filterId}
              value={activeFeature ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setFeatureFilter(v === '' ? null : v === 'none' ? 'none' : Number(v));
              }}
            >
              <option value="">Semua fitur ({own.length})</option>
              {projectFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({own.filter((t) => t.featureId === f.id).length})
                </option>
              ))}
              <option value="none">Tanpa fitur ({own.filter((t) => t.featureId === null).length})</option>
            </select>
          </span>
        </div>
        {activeFeature !== null && (
          <p className="pj-filter-note" role="status">
            Menampilkan {shown.length} dari {own.length} task
          </p>
        )}
        <div className="pj-view" role="group" aria-label="Tampilan task">
          {(
            [
              ['board', 'columns', 'Tampilan kolom'],
              ['list', 'rows', 'Tampilan list'],
            ] as const
          ).map(([v, icon, label]) => (
            <button
              key={v}
              type="button"
              className={view === v ? 'on' : undefined}
              aria-pressed={view === v}
              aria-label={label}
              title={label}
              onClick={() => {
                setView(v);
                saveView(v);
              }}
            >
              <Glyph name={icon} />
            </button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <TaskTable
          tasks={shown}
          featureName={featureName}
          onOpen={(t) => setDialog({ type: 'task', task: t, status: t.status })}
          onAdd={() => setDialog({ type: 'task', task: null, status: 'not_started' })}
        />
      ) : (
        <div className="kb">
          {boardStatuses.map((status) => {
            const list = shown.filter((t) => t.status === status);
            const isTarget = drop?.status === status;
            const add = () => setDialog({ type: 'task', task: null, status });
            return (
              <section key={status} className={isTarget ? `kb-col ${status} over` : `kb-col ${status}`} aria-label={statusLabel[status]}>
                <header className="kb-col-hd">
                  <span className={`kb-ring ${status}`} aria-hidden="true" />
                  <span className="kb-pill">{statusLabel[status]}</span>
                  <span className="kb-count" aria-label={`${list.length} task`}>
                    {list.length}
                  </span>
                  <IconButton icon="plus" label={`Tambah task ke ${statusLabel[status]}`} size="sm" className="kb-plus" onClick={add} />
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
                        <span className="kb-body">
                          <span className="kb-title">{t.title}</span>
                          {t.featureId !== null && featureName.has(t.featureId) && <span className="kb-feature">{featureName.get(t.featureId)}</span>}
                          <TaskTimes task={t} />
                        </span>
                      </div>
                    </div>
                  ))}
                  {isTarget && drop.before === null && <div className="kb-drop" aria-hidden="true" />}
                  {list.length === 0 && <p className="kb-empty">Belum ada task</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {dialogs}
    </div>
  );
}
