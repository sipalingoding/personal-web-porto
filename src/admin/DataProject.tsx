import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Trash } from '../components/Icons';
import PartnerMark from '../components/PartnerMark';
import { ApiError, adminRequest, fetchContent, normalizeProjects, shotUrl, uploadCv, uploadLogo, uploadShot } from '../data/api';
import { MAX_PROJECT_DUTIES, MAX_PROJECT_IMAGES, type Content, type CvInfo, type Partner, type Stats } from '../data/content';
import type { Experience } from '../data/experience';
import { disciplines, kinds, type Project } from '../data/projects';
import { site } from '../data/site';
import { useTheme } from '../hooks/useTheme';
import { IconButton } from '../dashboard/icons';
import StackPicker from './StackPicker';
import './admin.css';

const KEY_STORAGE = 'data-project-key';

const readKey = () => {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
};

const writeKey = (key: string) => {
  try {
    if (key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // Storage can be blocked; the key then lasts only until reload.
  }
};

const message = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');

/* ------------------------------------------------------------------ list helpers */

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const replaceAt = <T,>(list: T[], i: number, item: T) => list.map((x, k) => (k === i ? item : x));
const removeAt = <T,>(list: T[], i: number) => list.filter((_, k) => k !== i);

/* ------------------------------------------------------------------ shared pieces */

type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; text: string };
const idle: Status = { kind: 'idle', text: '' };

/** Draft state for one section: tracks unsaved edits and the save request. */
function useDraft<T>(saved: T, save: (draft: T) => Promise<T>) {
  const [base, setBase] = useState(saved);
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState<Status>(idle);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);

  /** Stores `value` (the current draft unless given) and reports whether it worked. */
  const submit = async (value: T = draft, done = 'Saved to Neon.') => {
    setStatus({ kind: 'busy', text: 'Saving…' });
    try {
      const stored = await save(value);
      setBase(stored);
      setDraft(stored);
      setStatus({ kind: 'ok', text: done });
      return true;
    } catch (err) {
      setStatus({ kind: 'error', text: message(err) });
      return false;
    }
  };

  return { draft, setDraft, dirty, status, submit, reset: () => setDraft(base) };
}

function Section(props: {
  n: string;
  title: string;
  hint: string;
  dirty: boolean;
  status: Status;
  onSave: () => void;
  onReset?: () => void;
  saveLabel?: string;
  children: ReactNode;
}) {
  const id = useId();
  const busy = props.status.kind === 'busy';
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    props.onSave();
  };

  return (
    <section className="adm-sec" aria-labelledby={id}>
      <header className="adm-head">
        <span className="ix">
          <b>{props.n}/</b> {props.title}
        </span>
        <h2 id={id}>{props.title}</h2>
        <p>{props.hint}</p>
      </header>
      <form className="adm-body" onSubmit={onSubmit} noValidate>
        {props.children}
        <div className="adm-bar">
          <p className={`adm-status ${props.status.kind}`} role="status">
            {props.status.text || (props.dirty ? 'Unsaved changes.' : 'No unsaved changes.')}
          </p>
          {props.onReset && props.dirty && !busy && (
            <button type="button" className="btn g" onClick={props.onReset}>
              Discard changes
            </button>
          )}
          <button type="submit" className="btn p" disabled={!props.dirty || busy}>
            {busy ? 'Saving…' : (props.saveLabel ?? 'Save')}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  multiline?: boolean;
  wide?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className={props.wide ? 'adm-field wide' : 'adm-field'}>
      <label htmlFor={id}>{props.label}</label>
      {props.multiline ? (
        <textarea id={id} value={props.value} rows={props.rows ?? 3} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          type={props.type ?? 'text'}
          inputMode={props.type === 'number' ? 'numeric' : undefined}
          min={props.type === 'number' ? 0 : undefined}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function Select<T extends string>(props: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="adm-field">
      <label htmlFor={id}>{props.label}</label>
      <span className="adm-select">
        <select id={id} value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
          {props.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}

/** A collapsible editor. New, empty items start open; the user's toggle is kept while typing. */
function Item({ startOpen, summary, children }: { startOpen: boolean; summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <details className="adm-item" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

/** Up, down and remove controls for one item in an ordered list. */
function RowTools(props: { name: string; index: number; count: number; onMove: (dir: -1 | 1) => void; onRemove?: () => void }) {
  return (
    <div className="adm-tools">
      <button type="button" className="navb" disabled={props.index === 0} onClick={() => props.onMove(-1)} aria-label={`Move ${props.name} up`}>
        ↑
      </button>
      <button
        type="button"
        className="navb"
        disabled={props.index === props.count - 1}
        onClick={() => props.onMove(1)}
        aria-label={`Move ${props.name} down`}
      >
        ↓
      </button>
      {props.onRemove && (
        <button type="button" className="navb danger" onClick={props.onRemove} aria-label={`Remove ${props.name}`}>
          Remove
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ sections */

function CvSection({ adminKey, initial }: { adminKey: string; initial: CvInfo | null }) {
  const [cv, setCv] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>(idle);
  const [inputKey, setInputKey] = useState(0);
  const id = useId();

  const save = async () => {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      setStatus({ kind: 'error', text: 'Choose a PDF file.' });
      return;
    }
    setStatus({ kind: 'busy', text: 'Uploading…' });
    try {
      const res = await uploadCv(adminKey, file);
      setCv(res.cv);
      setFile(null);
      setInputKey((k) => k + 1);
      setStatus({ kind: 'ok', text: 'CV uploaded to Neon.' });
    } catch (err) {
      setStatus({ kind: 'error', text: message(err) });
    }
  };

  return (
    <Section
      n="01"
      title="CV file"
      hint="The PDF behind every Download CV button. Uploading replaces the current file. PDF only, up to 10 MB."
      dirty={file !== null}
      status={status}
      onSave={save}
      saveLabel="Upload CV"
    >
      <div className="adm-cv">
        {cv ? (
          <p>
            Current file: <b>{cv.filename}</b> · {(cv.sizeBytes / 1024).toFixed(0)} KB · updated{' '}
            {new Date(cv.updatedAt).toLocaleString()}.{' '}
            <a className="adm-link" href={site.cv}>
              Download current CV
            </a>
          </p>
        ) : (
          <p>No CV uploaded yet. The Download CV buttons will show an error page until you upload one.</p>
        )}
      </div>
      <div className="adm-field wide">
        <label htmlFor={id}>New CV (PDF)</label>
        <input
          key={inputKey}
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setStatus(idle);
          }}
        />
      </div>
    </Section>
  );
}

type StatsDraft = { projectsDelivered: string; coreFrameworks: string };

function StatsSection({ adminKey, initial }: { adminKey: string; initial: Stats }) {
  const toDraft = (s: Stats): StatsDraft => ({
    projectsDelivered: String(s.projectsDelivered),
    coreFrameworks: String(s.coreFrameworks),
  });
  // An empty field must fail validation, not quietly become 0.
  const toNumber = (v: string) => (v.trim() === '' ? null : Number(v));
  const s = useDraft(toDraft(initial), async (d) => {
    const body = { projectsDelivered: toNumber(d.projectsDelivered), coreFrameworks: toNumber(d.coreFrameworks) };
    const res = await adminRequest<{ stats: Stats }>(adminKey, 'PUT', '/stats', body);
    return toDraft(res.stats);
  });

  return (
    <Section
      n="02"
      title="Projects delivered & core frameworks"
      hint="The two numbers in the hero. Projects delivered shows with a plus sign after it."
      dirty={s.dirty}
      status={s.status}
      onSave={s.submit}
      onReset={s.reset}
    >
      <div className="adm-grid">
        <Field
          label="Projects delivered"
          type="number"
          value={s.draft.projectsDelivered}
          onChange={(v) => s.setDraft({ ...s.draft, projectsDelivered: v })}
        />
        <Field
          label="Core frameworks"
          type="number"
          value={s.draft.coreFrameworks}
          onChange={(v) => s.setDraft({ ...s.draft, coreFrameworks: v })}
        />
      </div>
    </Section>
  );
}

function PartnerRow(props: {
  adminKey: string;
  partner: Partner;
  index: number;
  count: number;
  onChange: (p: Partner) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { partner: p, index: i } = props;
  const [status, setStatus] = useState<Status>(idle);
  const [inputKey, setInputKey] = useState(0);
  const fileId = useId();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ kind: 'busy', text: 'Uploading logo…' });
    try {
      const res = await uploadLogo(props.adminKey, file);
      props.onChange({ ...p, logo: res.logo });
      setStatus({ kind: 'ok', text: 'Logo uploaded. Save the section to publish it.' });
    } catch (err) {
      setStatus({ kind: 'error', text: message(err) });
    }
    setInputKey((k) => k + 1);
  };

  return (
    <li className="adm-partner">
      <div className="adm-row">
        <Field label={`Name ${i + 1}`} value={p.name} onChange={(v) => props.onChange({ ...p, name: v })} />
        <RowTools name={p.name || `name ${i + 1}`} index={i} count={props.count} onMove={props.onMove} onRemove={props.onRemove} />
      </div>
      <div className="adm-logo">
        <div className="adm-logo-preview" aria-label={p.logo ? `Logo preview for ${p.name}` : undefined}>
          <span className="pname">
            <PartnerMark partner={p} />
          </span>
          <span className="adm-logo-note">{p.logo ? 'Shows the logo' : 'No logo, shows the name'}</span>
        </div>
        <div className="adm-field">
          <label htmlFor={fileId}>Logo (SVG, PNG, JPEG or WebP)</label>
          <input
            key={inputKey}
            id={fileId}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp"
            disabled={status.kind === 'busy'}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
        {p.logo && (
          <button
            type="button"
            className="navb danger"
            onClick={() => {
              props.onChange({ ...p, logo: null });
              setStatus(idle);
            }}
          >
            Remove logo
          </button>
        )}
      </div>
      {status.text && (
        <p className={`adm-status ${status.kind}`} role="status">
          {status.text}
        </p>
      )}
    </li>
  );
}

function PartnersSection({ adminKey, initial }: { adminKey: string; initial: Partner[] }) {
  const s = useDraft(initial, async (d) => {
    const res = await adminRequest<{ partners: Partner[] }>(adminKey, 'PUT', '/partners', { partners: d });
    return res.partners;
  });
  const list = s.draft;

  return (
    <Section
      n="03"
      title="Worked with"
      hint="The scrolling strip under the hero, in this order. A logo is shown in its own colours when there is one; a transparent background looks best on both themes. Without a logo the name is shown."
      dirty={s.dirty}
      status={s.status}
      onSave={s.submit}
      onReset={s.reset}
    >
      {list.length === 0 && <p className="adm-empty">No names yet. The strip is hidden until you add one.</p>}
      <ol className="adm-list">
        {list.map((p, i) => (
          <PartnerRow
            key={i}
            adminKey={adminKey}
            partner={p}
            index={i}
            count={list.length}
            onChange={(next) => s.setDraft(replaceAt(list, i, next))}
            onMove={(dir) => s.setDraft(move(list, i, dir))}
            onRemove={() => s.setDraft(removeAt(list, i))}
          />
        ))}
      </ol>
      <button type="button" className="btn g adm-add" onClick={() => s.setDraft([...list, { name: '', logo: null }])}>
        Add a name
      </button>
    </Section>
  );
}

const disciplineNames = disciplines.map((d) => d.name);

const blankProject = (): Project => ({
  name: '',
  discipline: 'Frontend',
  file: '',
  kind: 'Freelance',
  client: '',
  headline: '',
  project: '',
  desc: '',
  type: '',
  stack: [],
  role: '',
  images: [],
  duties: [],
  url: null,
});

/** Uploads the images that replace the sketch in Selected work, in display order. Saving the list publishes them. */
function ProjectImages({ adminKey, project: p, onChange }: { adminKey: string; project: Project; onChange: (images: string[]) => void }) {
  const [status, setStatus] = useState<Status>(idle);
  const [inputKey, setInputKey] = useState(0);
  const fileId = useId();
  const images = p.images;
  const room = MAX_PROJECT_IMAGES - images.length;
  const label = p.name || 'this project';

  const upload = async (picked: FileList | null) => {
    const files = Array.from(picked ?? []);
    if (files.length === 0) return;
    const take = files.slice(0, room);
    const added: string[] = [];
    const failed: string[] = [];
    for (const [k, file] of take.entries()) {
      setStatus({ kind: 'busy', text: `Uploading image ${k + 1} of ${take.length}…` });
      try {
        added.push((await uploadShot(adminKey, file)).image);
      } catch (err) {
        failed.push(`${file.name}: ${message(err)}`);
      }
    }
    if (added.length) onChange([...images, ...added]);
    const skipped = files.length - take.length;
    const notes = [
      added.length ? `${added.length} ${added.length === 1 ? 'image' : 'images'} uploaded. Save the list to publish.` : '',
      skipped ? `${skipped} skipped, a project holds at most ${MAX_PROJECT_IMAGES}.` : '',
      ...failed,
    ].filter(Boolean);
    setStatus({ kind: failed.length || !added.length ? 'error' : 'ok', text: notes.join(' ') });
    setInputKey((k) => k + 1);
  };

  return (
    <div className="adm-wide">
      <div className="adm-field">
        <label htmlFor={fileId}>
          Images in place of the sketch (PNG, JPEG, WebP or SVG, up to 5 MB each, at most {MAX_PROJECT_IMAGES}). The first one shows first.
        </label>
        <input
          key={inputKey}
          id={fileId}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          disabled={status.kind === 'busy' || room <= 0}
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {images.length === 0 ? (
        <p className="adm-logo-note adm-shots-empty">No images, the site shows the sketch</p>
      ) : (
        <ol className="adm-shots">
          {images.map((id, k) => (
            <li key={id} className="adm-shot-item">
              <a href={shotUrl(id)} target="_blank" rel="noreferrer" className="adm-shot-thumb">
                <img src={shotUrl(id)} alt={`Image ${k + 1} for ${label}`} loading="lazy" />
                <span className="no">{String(k + 1).padStart(2, '0')}</span>
              </a>
              <div className="adm-tools">
                <button type="button" className="navb" disabled={k === 0} onClick={() => onChange(move(images, k, -1))} aria-label={`Move image ${k + 1} earlier`}>
                  ←
                </button>
                <button
                  type="button"
                  className="navb"
                  disabled={k === images.length - 1}
                  onClick={() => onChange(move(images, k, 1))}
                  aria-label={`Move image ${k + 1} later`}
                >
                  →
                </button>
                <button
                  type="button"
                  className="navb danger adm-icon"
                  onClick={() => {
                    onChange(removeAt(images, k));
                    setStatus(idle);
                  }}
                  aria-label={`Remove image ${k + 1}`}
                  title="Remove image"
                >
                  <Trash />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {status.text && (
        <p className={`adm-status ${status.kind}`} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}

function ProjectsSection({ adminKey, initial }: { adminKey: string; initial: Project[] }) {
  const s = useDraft(initial, async (d) => {
    const res = await adminRequest<{ projects: Project[] }>(adminKey, 'PUT', '/projects', { projects: d });
    return normalizeProjects(res.projects);
  });
  const list = s.draft;
  const set = (i: number, patch: Partial<Project>) => s.setDraft(replaceAt(list, i, { ...list[i], ...patch }));
  const [confirming, setConfirming] = useState<number | null>(null);
  const busy = s.status.kind === 'busy';

  // Deleting stores the list right away. Other unsaved edits in this list go with it,
  // which the confirmation says before anything happens.
  const remove = async (i: number) => {
    const name = list[i].name || 'the new project';
    if (await s.submit(removeAt(list, i), `Deleted ${name}.`)) setConfirming(null);
  };

  return (
    <Section
      n="04"
      title="Project list"
      hint="Every project in Selected work. Discipline decides which group it opens under; the order here is the tab order. Delete removes a project from the site straight away."
      dirty={s.dirty}
      status={s.status}
      onSave={s.submit}
      onReset={s.reset}
    >
      {list.length === 0 && <p className="adm-empty">No projects yet. Selected work shows an empty note until you add one.</p>}
      <ol className="adm-list">
        {list.map((p, i) => (
          <li key={i} className="adm-proj">
            <button
              type="button"
              className="navb danger adm-del"
              disabled={busy}
              aria-expanded={confirming === i}
              onClick={() => setConfirming(confirming === i ? null : i)}
              aria-label={`Delete ${p.name || `project ${i + 1}`}`}
              title="Delete project"
            >
              <Trash />
            </button>
            <Item
              startOpen={!p.name}
              summary={
                <>
                  <span className="no">{String(i + 1).padStart(2, '0')}</span>
                  <b>{p.name || 'New project'}</b>
                  <span className="meta">
                    {p.discipline} · {p.kind}
                  </span>
                </>
              }
            >
              <div className="adm-grid">
                <Field label="Name" value={p.name} onChange={(v) => set(i, { name: v })} />
                <Field label="File name" value={p.file} placeholder="project.tsx" onChange={(v) => set(i, { file: v })} />
                <Select label="Discipline" value={p.discipline} options={disciplineNames} onChange={(v) => set(i, { discipline: v })} />
                <Select label="Engagement" value={p.kind} options={kinds} onChange={(v) => set(i, { kind: v })} />
                <Field label="Headline" wide value={p.headline} onChange={(v) => set(i, { headline: v })} />
                <Field label="Description" wide multiline value={p.desc} onChange={(v) => set(i, { desc: v })} />
                <Field label="Project" value={p.project} onChange={(v) => set(i, { project: v })} />
                <Field label="Client" value={p.client} onChange={(v) => set(i, { client: v })} />
                <Field label="Type" value={p.type} onChange={(v) => set(i, { type: v })} />
                <Field label="Role" value={p.role} onChange={(v) => set(i, { role: v })} />
                <StackPicker value={p.stack} onChange={(stack) => set(i, { stack })} />
                <Field
                  label={`Job description, one task per line (up to ${MAX_PROJECT_DUTIES})`}
                  wide
                  multiline
                  rows={6}
                  value={p.duties.join('\n')}
                  placeholder={'Built the appraisal form flow\nIntegrated maps for field locations'}
                  // Kept line by line while typing; the server drops empty lines on save.
                  onChange={(v) => set(i, { duties: v === '' ? [] : v.split('\n') })}
                />
                <Field
                  label="Domain (optional)"
                  wide
                  value={p.url ?? ''}
                  placeholder="example.com"
                  onChange={(v) => set(i, { url: v || null })}
                />
                <ProjectImages adminKey={adminKey} project={p} onChange={(images) => set(i, { images })} />
              </div>
              <RowTools
                name={p.name || `project ${i + 1}`}
                index={i}
                count={list.length}
                onMove={(dir) => s.setDraft(move(list, i, dir))}
              />
            </Item>
            {confirming === i && (
              <div className="adm-confirm" role="group" aria-label="Confirm delete" onKeyDown={(e) => e.key === 'Escape' && setConfirming(null)}>
                <p>
                  Delete <b>{p.name || 'this new project'}</b>? It disappears from the site right away and cannot be undone.
                  {s.dirty && ' Your other unsaved changes in this list are saved at the same time.'}
                </p>
                <div className="adm-confirm-actions">
                  <button type="button" className="btn g" autoFocus disabled={busy} onClick={() => setConfirming(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn del" disabled={busy} onClick={() => remove(i)}>
                    {busy ? 'Deleting…' : 'Delete project'}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      <button type="button" className="btn g adm-add" onClick={() => s.setDraft([...list, blankProject()])}>
        Add a project
      </button>
    </Section>
  );
}

const blankExperience = (): Experience => ({
  period: '',
  place: '',
  title: '',
  org: '',
  current: false,
});

function ExperienceSection({ adminKey, initial }: { adminKey: string; initial: Experience[] }) {
  const s = useDraft(initial, async (d) => {
    const res = await adminRequest<{ experience: Experience[] }>(adminKey, 'PUT', '/experience', { experience: d });
    return res.experience;
  });
  const list = s.draft;
  const set = (i: number, patch: Partial<Experience>) => s.setDraft(replaceAt(list, i, { ...list[i], ...patch }));

  return (
    <Section
      n="05"
      title="Experience"
      hint="The timeline in the Experience section, top to bottom. Mark the role you are in now as current to highlight it."
      dirty={s.dirty}
      status={s.status}
      onSave={s.submit}
      onReset={s.reset}
    >
      {list.length === 0 && <p className="adm-empty">No entries yet. The timeline is empty until you add one.</p>}
      <ol className="adm-list">
        {list.map((e, i) => (
          <li key={i}>
            <Item
              startOpen={!e.title}
              summary={
                <>
                  <span className="no">{String(i + 1).padStart(2, '0')}</span>
                  <b>{e.title || 'New entry'}</b>
                  <span className="meta">{e.period}</span>
                </>
              }
            >
              <div className="adm-grid">
                <Field label="Title" value={e.title} onChange={(v) => set(i, { title: v })} />
                <Field label="Organisation" value={e.org} onChange={(v) => set(i, { org: v })} />
                <Field label="Period" value={e.period} placeholder="Sep 2022 to Present" onChange={(v) => set(i, { period: v })} />
                <Field label="Place" value={e.place} onChange={(v) => set(i, { place: v })} />
                <label className="adm-check wide">
                  <input type="checkbox" checked={e.current} onChange={(ev) => set(i, { current: ev.target.checked })} />
                  Current role
                </label>
              </div>

              <RowTools
                name={e.title || `entry ${i + 1}`}
                index={i}
                count={list.length}
                onMove={(dir) => s.setDraft(move(list, i, dir))}
                onRemove={() => s.setDraft(removeAt(list, i))}
              />
            </Item>
          </li>
        ))}
      </ol>
      <button type="button" className="btn g adm-add" onClick={() => s.setDraft([...list, blankExperience()])}>
        Add an entry
      </button>
    </Section>
  );
}

/* ------------------------------------------------------------------ page */

/** `iconOnly` shows the submit as an icon button, as the dashboard does. */
export function KeyGate({ onUnlock, iconOnly = false }: { onUnlock: (key: string) => void; iconOnly?: boolean }) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<Status>(idle);
  const id = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setStatus({ kind: 'error', text: 'Enter the admin key.' });
      return;
    }
    setStatus({ kind: 'busy', text: 'Checking…' });
    try {
      await adminRequest(key.trim(), 'GET', '/check');
      onUnlock(key.trim());
    } catch (err) {
      setStatus({ kind: 'error', text: message(err) });
    }
  };

  return (
    <form className="adm-gate" onSubmit={submit} noValidate>
      <div className="adm-field wide">
        <label htmlFor={id}>Admin key</label>
        <input id={id} type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} />
      </div>
      <p className="adm-hint">It is the ADMIN_KEY value in .env.local.</p>
      <div className="adm-bar">
        <p className={`adm-status ${status.kind}`} role="status">
          {status.text}
        </p>
        {iconOnly ? (
          <IconButton type="submit" icon="unlock" label="Unlock" tone="p" busy={status.kind === 'busy'} />
        ) : (
          <button type="submit" className="btn p" disabled={status.kind === 'busy'}>
            {status.kind === 'busy' ? 'Checking…' : 'Unlock'}
          </button>
        )}
      </div>
    </form>
  );
}

/** Admin key kept for the browser session, checked by the API before anything loads. */
export function useAdminKey() {
  const [adminKey, setAdminKey] = useState(readKey);
  const unlock = (key: string) => {
    writeKey(key);
    setAdminKey(key);
  };
  const lock = () => {
    writeKey('');
    setAdminKey('');
  };
  return { adminKey, unlock, lock };
}

/** Hides an owner-only page from search engines while it is open. */
export function useNoIndex(title: string) {
  useEffect(() => {
    document.title = title;
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.append(robots);
    return () => robots.remove();
  }, [title]);
}

/** Loads the site content after re-checking the key; a rejected key calls `onLocked`. */
export function useAdminContent(adminKey: string, onLocked: () => void) {
  const [content, setContent] = useState<Content | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!adminKey) {
      setContent(null);
      return;
    }
    const ctrl = new AbortController();
    setLoadError('');
    // A key saved from an earlier visit is checked again before anything loads.
    adminRequest(adminKey, 'GET', '/check')
      .then(() => fetchContent(ctrl.signal))
      .then(setContent)
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          onLocked();
          return;
        }
        setLoadError(message(err));
      });
    return () => ctrl.abort();
    // onLocked is a fresh function each render; only the key and retries decide when to load.
  }, [adminKey, attempt]);

  return { content, loadError, retry: () => setAttempt((n) => n + 1) };
}

export function LoadState({ loadError, onRetry }: { loadError: string; onRetry: () => void }) {
  return loadError ? (
    <div className="adm-error" role="alert">
      <p>Could not load the data: {loadError}</p>
      <button type="button" className="btn g" onClick={onRetry}>
        Try again
      </button>
    </div>
  ) : (
    <p className="adm-status busy" role="status">
      Loading data from Neon…
    </p>
  );
}

/** Every editable section of the public site, each saving on its own. */
export function SiteDataSections({ adminKey, content }: { adminKey: string; content: Content }) {
  return (
    <>
      <CvSection adminKey={adminKey} initial={content.cv} />
      <StatsSection adminKey={adminKey} initial={content.stats} />
      <PartnersSection adminKey={adminKey} initial={content.partners} />
      <ProjectsSection adminKey={adminKey} initial={content.projects} />
      <ExperienceSection adminKey={adminKey} initial={content.experience} />
    </>
  );
}

export default function DataProject() {
  useTheme();
  useNoIndex('Data project · Salman Faris Siddiq');
  const { adminKey, unlock, lock } = useAdminKey();
  const { content, loadError, retry } = useAdminContent(adminKey, lock);

  return (
    <main className="adm">
      <div className="wrap">
        <header className="adm-top">
          <div>
            <span className="ix">
              <b>/</b>data-project
            </span>
            <h1>Site data</h1>
            <p>Edits are stored in Neon. Each section saves on its own; the site shows the change on its next load.</p>
          </div>
          {adminKey && (
            <button type="button" className="btn g" onClick={lock}>
              Lock
            </button>
          )}
        </header>

        {!adminKey && <KeyGate onUnlock={unlock} />}
        {adminKey && !content && <LoadState loadError={loadError} onRetry={retry} />}
        {adminKey && content && <SiteDataSections adminKey={adminKey} content={content} />}
      </div>
    </main>
  );
}
