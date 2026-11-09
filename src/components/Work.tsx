import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { disciplines, kinds, type Discipline, type Kind, type Project } from '../data/projects';
import { shotUrl } from '../data/api';
import { ArrowRight, ArrowUpRight } from './Icons';
import StackChips from './StackChips';
import WorkPreview from './WorkPreview';

/** "https://www.example.com/" reads as "example.com"; a path stays visible. */
const displayHost = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const pad = (n: number) => String(n).padStart(2, '0');

const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const countLabel = (n: number) => `${words[n] ?? n} ${n === 1 ? 'project' : 'projects'},`;

/** Opens a dialog listing what the work on this project involved. */
function DutiesButton({ project: p }: { project: Project }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button type="button" className="btn g" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        Job description
        <ArrowRight />
      </button>
      <dialog
        ref={ref}
        className="jd"
        aria-labelledby={titleId}
        // A click on the backdrop lands on the dialog itself, not on its content.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className="jd-in">
          <div className="jd-hd">
            <span className="ix">
              <b>{p.name}/</b> {p.role}
            </span>
            <button type="button" className="navb" onClick={() => ref.current?.close()} aria-label="Close">
              Close ×
            </button>
          </div>
          <h4 id={titleId}>Job description</h4>
          <p className="jd-sub">
            {p.project} · {p.client}
          </p>
          <ol className="jd-list">
            {p.duties.map((d, i) => (
              <li key={i}>
                <span className="no">{pad(i + 1)}</span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          {p.stack.length > 0 && (
            <div className="jd-stack">
              <span>Stack</span>
              <StackChips stack={p.stack} />
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}

/** The project's images: one large at a time, with arrows and thumbnails when there are several. */
const SLIDE_MS = 3000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Gallery({ project: p }: { project: Project }) {
  const [rawAt, setAt] = useState(0);
  // Visitors who ask for less motion start paused and can press play.
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const n = p.images.length;
  const at = Math.min(rawAt, n - 1);
  const id = p.images[at];
  const step = (d: number) => setAt((at + d + n) % n);
  const running = n > 1 && !paused && !hovered && !focused;

  // Advances every 3 seconds; depending on `at` restarts the wait after a manual change.
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => {
      if (!document.hidden) setAt((i) => (Math.min(i, n - 1) + 1) % n);
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [running, at, n]);

  // Keeps the current thumbnail visible without scrolling the page itself.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[at] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: left - (strip.clientWidth - thumb.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [at]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (n < 2) return;
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else return;
    // Keeps the project tabs from switching too.
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={n > 1 ? 'media gal multi' : 'media gal'}
      role="group"
      aria-roledescription="gallery"
      aria-label={`${p.name} images`}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
    >
      {/* Opens the full-size image, since the panel scales it down to fit. */}
      <a className="shot" href={shotUrl(id)} target="_blank" rel="noreferrer" aria-label={`Open image ${at + 1} of ${p.name} full size`}>
        <img src={shotUrl(id)} alt={`${p.name}: ${p.project}${n > 1 ? `, image ${at + 1} of ${n}` : ''}`} decoding="async" />
      </a>
      <span className="cap2">
        {n > 1 ? `Image ${pad(at + 1)}/${pad(n)}` : 'Image'} · {p.file}
      </span>
      {n > 1 && (
        <>
          <button type="button" className="gal-arrow prev" onClick={() => step(-1)} aria-label="Previous image">
            ←
          </button>
          <button type="button" className="gal-arrow next" onClick={() => step(1)} aria-label="Next image">
            →
          </button>
          <div className="gal-bar">
            <button
              type="button"
              className="gal-play"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
              title={paused ? 'Play' : 'Pause'}
            >
              {paused ? '▶' : '❚❚'}
            </button>
            <div className="gal-thumbs" ref={thumbsRef}>
              {p.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  className={i === at ? 'on' : undefined}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === at ? 'true' : undefined}
                  onClick={() => setAt(i)}
                >
                  <img src={shotUrl(img)} alt="" loading="lazy" decoding="async" />
                  {/* Keyed by position so the line restarts on every slide. */}
                  {i === at && <span key={at} className={running ? 'gal-prog run' : 'gal-prog'} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectPanel({ list }: { list: Project[] }) {
  const [rawTab, setTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const len = list.length;
  // Fresh data from the API can shorten the list while a tab is selected.
  const tab = Math.min(rawTab, len - 1);
  const cur = list[tab];

  const go = (i: number, focus = false) => {
    const next = (i + len) % len;
    setTab(next);
    if (focus) tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') go(tab + 1, true);
    else if (e.key === 'ArrowLeft') go(tab - 1, true);
    else if (e.key === 'Home') go(0, true);
    else if (e.key === 'End') go(len - 1, true);
    else return;
    e.preventDefault();
  };

  return (
    <div className="ide">
      <div className="tabs" role="tablist" aria-label="Projects" onKeyDown={onKeyDown}>
        {list.map((p, i) => (
          <button
            key={p.name}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === tab}
            aria-controls="work-panel"
            tabIndex={i === tab ? 0 : -1}
            className={i === tab ? 'on' : undefined}
            onClick={() => setTab(i)}
          >
            <span className="no">{pad(i + 1)}</span>
            <b>{p.name}</b>
          </button>
        ))}
      </div>

      <div className="pane" role="tabpanel" id="work-panel" aria-labelledby={`tab-${tab}`}>
        <div className="spec">
          <span className="ix">
            <b>{pad(tab + 1)}/</b> {cur.kind}
          </span>
          <h4>{cur.headline}</h4>
          <p className="desc">{cur.desc}</p>
          <dl className="dl">
            <dt>Project</dt>
            <dd>{cur.project}</dd>
            <dt>Client</dt>
            <dd>{cur.client}</dd>
            <dt>Type</dt>
            <dd>{cur.type}</dd>
            <dt>Stack</dt>
            <dd>
              <StackChips stack={cur.stack} />
            </dd>
            <dt>Role</dt>
            <dd>{cur.role}</dd>
            {cur.url && (
              <>
                <dt>Domain</dt>
                <dd>
                  <a className="dom" href={cur.url} target="_blank" rel="noreferrer">
                    {displayHost(cur.url)}
                    <ArrowUpRight />
                  </a>
                </dd>
              </>
            )}
          </dl>
          {cur.duties.length > 0 && (
            <div className="act">
              <DutiesButton project={cur} />
            </div>
          )}
        </div>
        <div className="view">
          {cur.images.length > 0 ? (
            <Gallery key={`${tab}-${cur.name}`} project={cur} />
          ) : (
            <div className="media">
              <WorkPreview project={cur} />
              <span className="cap2">Sketch · {cur.file}</span>
            </div>
          )}
        </div>
      </div>

      <div className="stb">
        <span>{cur.file}</span>
        <span className="r">
          {len > 1 && (
            <span className="segs" aria-hidden="true">
              {list.map((p, i) => (
                <i key={p.name} className={i <= tab ? 'on' : undefined} />
              ))}
            </span>
          )}
          <span>
            {pad(tab + 1)} / {pad(len)}
          </span>
          {len > 1 && (
            <>
              <span className="hint">· tabs, or</span>
              <button type="button" className="navb" onClick={() => go(tab - 1)} aria-label="Previous project">
                ← prev
              </button>
              <button type="button" className="navb" onClick={() => go(tab + 1)} aria-label="Next project">
                next →
              </button>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/** Second step inside a discipline: choose professional or freelance work, then see its projects. */
function KindPicker({ list, id }: { list: Project[]; id: string }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const chosen = kind ? list.filter((p) => p.kind === kind) : [];
  const projectsId = `${id}-projects`;

  return (
    <>
      <div className="kinds">
        {kinds.map((k) => {
          const n = list.filter((p) => p.kind === k).length;
          const on = kind === k;
          return (
            <button
              key={k}
              type="button"
              className={on ? 'kind on' : 'kind'}
              disabled={n === 0}
              aria-expanded={n === 0 ? undefined : on}
              aria-controls={n === 0 ? undefined : projectsId}
              onClick={() => setKind(on ? null : k)}
            >
              <b>{k}</b>
              <span>{n === 0 ? 'No projects yet' : `${n} ${n === 1 ? 'project' : 'projects'}`}</span>
            </button>
          );
        })}
      </div>
      <div id={projectsId} className="kind-panel" hidden={chosen.length === 0}>
        {chosen.length > 0 && <ProjectPanel key={kind} list={chosen} />}
      </div>
    </>
  );
}

export default function Work({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState<Discipline | null>(null);
  const rowRefs = useRef<Partial<Record<Discipline, HTMLDivElement | null>>>({});

  // Closing the panel above moves the clicked row, so bring it back into view when needed.
  useEffect(() => {
    const row = open && rowRefs.current[open];
    if (!row) return;
    const { top, bottom } = row.getBoundingClientRect();
    const navHeight = parseFloat(getComputedStyle(row).scrollMarginTop);
    if (top < navHeight || bottom > window.innerHeight) row.scrollIntoView({ block: 'start' });
  }, [open]);

  return (
    <section id="work">
      <div className="wrap">
        <div className="shd">
          <div>
            <span className="ix">
              <b>01/</b> Selected work
            </span>
            <h2 className="hd">
              <span className="ln">{countLabel(projects.length)}</span>
              <span className="ln mu">one file each.</span>
            </h2>
          </div>
          <p>
            Main-job systems for Bank Mandiri and freelance builds for culture, government and
            private clients. Pick a discipline to open its projects.
          </p>
        </div>

        <div className="discs">
          {projects.length === 0 && <p className="disc-empty">No projects listed yet.</p>}
          {disciplines.map((d, i) => {
            const list = projects.filter((p) => p.discipline === d.name);
            if (list.length === 0) return null;
            const isOpen = open === d.name;
            const panelId = `discipline-${i}`;

            return (
              <div
                key={d.name}
                ref={(el) => {
                  rowRefs.current[d.name] = el;
                }}
                className={isOpen ? 'disc on' : 'disc'}
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : d.name)}
                  >
                    <span className="no">{pad(i + 1)}</span>
                    <span className="nm">{d.name}</span>
                    <span className="ct">
                      {list.length} {list.length === 1 ? 'project' : 'projects'}
                    </span>
                    <span className="st">{d.stack}</span>
                    <span className="mk" aria-hidden="true" />
                  </button>
                </h3>
                <div id={panelId} className="disc-panel" hidden={!isOpen}>
                  {isOpen && <KindPicker list={list} id={panelId} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
