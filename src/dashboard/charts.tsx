import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { boardStatuses, statusLabel, type BoardTask } from '../data/board';
import { countsOf, doneByDay, yearProgress, type BurnPoint, type Counts, type DayCount } from './stats';

/*
 * The dashboard's graphics: a counting number, a progress ring, a status bar, daily bars,
 * a running-total line chart, per-feature bars and the year strip. Each one plays its
 * entrance once, when it first scrolls into view (class "in"), and shows its final state
 * straight away when the visitor prefers reduced motion.
 */

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** True from the first time the element is on screen. */
export function useSeen<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** A number that counts up to its value when `run` turns true, and from the old value when it changes. */
export function Count({ value, run = true, suffix = '' }: { value: number; run?: boolean; suffix?: string }) {
  const [shown, setShown] = useState(() => (reduced() ? value : 0));
  const from = useRef(shown);
  useEffect(() => {
    if (!run) return;
    if (reduced()) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    let frame = 0;
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const k = Math.min(1, (now - t0) / 900);
      const v = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      from.current = v;
      setShown(v);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, run]);
  return (
    <span className="ch-num">
      {/* Screen readers get the final figure, not the counting. */}
      <span aria-hidden="true">
        {shown}
        {suffix}
      </span>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
    </span>
  );
}

/** A ring that sweeps round to `pct` percent, with whatever is passed in its middle. */
export function Ring({ pct, size = 96, stroke = 8, label, children }: { pct: number | null; size?: number; stroke?: number; label: string; children?: ReactNode }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const value = seen ? (pct ?? 0) : 0;
  return (
    <div ref={ref} className={pct === 100 ? 'ch-ring full' : 'ch-ring'} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ch-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ch-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={len}
          strokeDashoffset={len * (1 - value / 100)}
          style={{ opacity: value > 0 ? 1 : 0 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ch-ring-in">{children ?? (pct === null ? '–' : <Count value={pct} run={seen} suffix="%" />)}</div>
    </div>
  );
}

/** One bar split by status, with the three counts named under it. */
export function StatusBar({ counts }: { counts: Counts }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className={seen ? 'ch-status in' : 'ch-status'}>
      <div className="ch-status-bar" aria-hidden="true">
        {counts.total === 0 ? <span className="none" /> : boardStatuses.map((s) => counts[s] > 0 && <span key={s} className={s} style={{ flexGrow: counts[s] }} />)}
      </div>
      <dl className="ch-status-key">
        {boardStatuses.map((s) => (
          <div key={s}>
            <dt>
              <span className={`kb-check ${s}`} aria-hidden="true" />
              {statusLabel[s]}
            </dt>
            <dd>
              <Count value={counts[s]} run={seen} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Small label that follows the pointer inside a chart: above the mark, or beside a crosshair when a side is given. */
export function Tip({ x, side, children }: { x: number; side?: 'l' | 'r'; children: ReactNode }) {
  return (
    <div className={side ? `ch-tip ${side}` : 'ch-tip'} style={{ left: `${x}%` }} role="presentation">
      {children}
    </div>
  );
}

/** A bar per day; the tallest carries its value, the rest show theirs on hover. */
export function DayBars({ data, label }: { data: DayCount[]; label: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const [at, setAt] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.n));
  const peak = data.reduce((best, d, i) => (d.n > data[best].n ? i : best), 0);
  const total = data.reduce((sum, d) => sum + d.n, 0);
  return (
    <div ref={ref} className={seen ? 'ch-days in' : 'ch-days'}>
      <div className="ch-days-plot" role="img" aria-label={`${label}: ${total} task. ${data.filter((d) => d.n > 0).map((d) => `${d.label} ${d.n}`).join(', ')}`} onPointerLeave={() => setAt(null)}>
        {data.map((d, i) => (
          <div key={d.key} className={at === i ? 'ch-day on' : 'ch-day'} onPointerEnter={() => setAt(i)} onPointerDown={() => setAt(i)}>
            {d.n > 0 && i === peak && at === null && <span className="ch-day-n">{d.n}</span>}
            <i className={d.n === 0 ? 'zero' : undefined} style={{ height: d.n === 0 ? undefined : `${(d.n / max) * 100}%`, ['--i' as string]: i } as CSSProperties} />
          </div>
        ))}
        {at !== null && (
          <Tip x={((at + 0.5) / data.length) * 100}>
            <b>{data[at].n} selesai</b>
            <span>{at === data.length - 1 ? 'Hari ini' : data[at].label}</span>
          </Tip>
        )}
      </div>
      <div className="ch-axis" aria-hidden="true">
        <span>{data[0]?.label}</span>
        <span>Hari ini</span>
      </div>
    </div>
  );
}

export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return w;
}

/** Top of the scale: the next round count above the data. */
export function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = v <= 10 ? 2 : v <= 20 ? 5 : v <= 50 ? 10 : v <= 100 ? 20 : 50;
  return Math.ceil(v / step) * step;
}

/**
 * Tasks added and tasks finished as running totals: two stepped lines on one scale, the
 * gap between them being what is still open. Moving over it reads off any day.
 */
export function BurnChart({ points }: { points: BurnPoint[] }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const w = useWidth(ref);
  const [at, setAt] = useState<number | null>(null);
  const H = 176;
  const m = { l: 30, r: 12, t: 10, b: 24 };
  const last = points[points.length - 1];
  const top = niceMax(last?.created ?? 0);
  const iw = Math.max(1, w - m.l - m.r);
  const ih = H - m.t - m.b;
  const x = (i: number) => m.l + (points.length > 1 ? (i / (points.length - 1)) * iw : 0);
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const stepped = (pick: (p: BurnPoint) => number) => points.map((p, i) => (i === 0 ? `M${x(0)} ${y(pick(p))}` : `H${x(i)}V${y(pick(p))}`)).join('');
  const done = stepped((p) => p.done);

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left - m.l) / iw) * (points.length - 1));
    setAt(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div ref={ref} className={seen ? 'ch-burn in' : 'ch-burn'}>
      <ul className="ch-legend">
        <li>
          <i className="done" aria-hidden="true" />
          Selesai <b>{last.done}</b>
        </li>
        <li>
          <i className="made" aria-hidden="true" />
          Dibuat <b>{last.created}</b>
        </li>
      </ul>
      <div className="ch-burn-plot">
        {w > 0 && (
          <svg
            width={w}
            height={H}
            role="img"
            aria-label={`Sejak ${points[0].label}: ${last.created} task dibuat, ${last.done} selesai.`}
            onPointerMove={move}
            onPointerDown={move}
            onPointerLeave={() => setAt(null)}
          >
            {[0, top / 2, top].map((v) => (
              <g key={v}>
                <line className="ch-grid" x1={m.l} x2={w - m.r} y1={y(v)} y2={y(v)} />
                <text className="ch-tick" x={m.l - 8} y={y(v) + 4} textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            <path className="ch-area" d={`${done}V${y(0)}H${x(0)}Z`} />
            <path className="ch-line made" d={stepped((p) => p.created)} pathLength={1} />
            <path className="ch-line done" d={done} pathLength={1} />
            {at !== null && (
              <g>
                <line className="ch-cross" x1={x(at)} x2={x(at)} y1={m.t} y2={m.t + ih} />
                <circle className="ch-dot made" cx={x(at)} cy={y(points[at].created)} r="4" />
                <circle className="ch-dot done" cx={x(at)} cy={y(points[at].done)} r="4" />
              </g>
            )}
            <text className="ch-tick" x={m.l} y={H - 6}>
              {points[0].label}
            </text>
            <text className="ch-tick" x={w - m.r} y={H - 6} textAnchor="end">
              Hari ini
            </text>
          </svg>
        )}
        {at !== null && w > 0 && (
          <Tip x={(x(at) / w) * 100} side={x(at) > w / 2 ? 'l' : 'r'}>
            <span>{at === points.length - 1 ? 'Hari ini' : points[at].label}</span>
            <b>{points[at].done} selesai</b>
            <b>{points[at].created} dibuat</b>
          </Tip>
        )}
      </div>
    </div>
  );
}

export type FeatureRow = { name: string; done: number; total: number; muted?: boolean };

/** Finished over total for each feature, as a bar that fills to its share. */
export function FeatureBars({ rows }: { rows: FeatureRow[] }) {
  const [ref, seen] = useSeen<HTMLUListElement>();
  return (
    <ul ref={ref} className={seen ? 'ch-feat in' : 'ch-feat'}>
      {rows.map((f, i) => (
        <li key={f.name} className={f.muted ? 'muted' : undefined}>
          <span className="ch-feat-name">{f.name}</span>
          <span className="ch-feat-n">
            {f.done}/{f.total}
          </span>
          <span className="ch-track" role="progressbar" aria-label={`${f.name}: ${f.done} dari ${f.total} task selesai`} aria-valuemin={0} aria-valuemax={f.total} aria-valuenow={f.done}>
            <i style={{ width: `${f.total ? (f.done / f.total) * 100 : 0}%`, ['--i' as string]: i } as CSSProperties} />
          </span>
        </li>
      ))}
    </ul>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** The year as twelve cells that fill up to today. */
export function YearStrip() {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const [yp, setYp] = useState(yearProgress);
  useEffect(() => {
    const id = window.setInterval(() => setYp(yearProgress()), 600_000);
    return () => window.clearInterval(id);
  }, []);
  const now = yp.months.findIndex((f) => f < 1);
  return (
    <div ref={ref} className={seen ? 'ch-year in' : 'ch-year'}>
      <p className="ch-year-top">
        <b>
          <Count value={yp.left} run={seen} />
        </b>
        <span>{yp.left === 0 ? `hari terakhir ${yp.year}` : `hari lagi menuju ${yp.year + 1}`}</span>
      </p>
      <div className="ch-year-cells" role="img" aria-label={`Hari ke-${yp.day} dari ${yp.total} di tahun ${yp.year}`}>
        {yp.months.map((f, i) => (
          <span key={i} className={i === now ? 'now' : undefined} title={MONTHS[i]}>
            <i style={{ width: `${f * 100}%`, ['--i' as string]: i } as CSSProperties} />
          </span>
        ))}
      </div>
      <div className="ch-axis" aria-hidden="true">
        <span>Jan</span>
        <span>
          Hari ke-{yp.day} dari {yp.total}
        </span>
        <span>Des</span>
      </div>
    </div>
  );
}

/** How the work stands across a set of tasks: share finished, split by status, and the last two weeks. */
export function WorkSummary({ tasks, ringSize = 96 }: { tasks: BoardTask[]; ringSize?: number }) {
  const counts = countsOf(tasks);
  const days = doneByDay(tasks, 14);
  const fortnight = days.reduce((sum, d) => sum + d.n, 0);
  return (
    <div className="ws">
      <div className="ws-top">
        <Ring pct={counts.pct} size={ringSize} label={counts.pct === null ? 'Belum ada task' : `${counts.pct}% task selesai`} />
        <p className="ws-lead">
          {counts.total === 0 ? (
            'Belum ada task.'
          ) : (
            <>
              <b>{counts.done}</b> dari <b>{counts.total}</b> task selesai
            </>
          )}
        </p>
      </div>
      <StatusBar counts={counts} />
      <figure className="ws-fig">
        <figcaption>
          Selesai per hari, 14 hari terakhir <b>{fortnight}</b>
        </figcaption>
        <DayBars data={days} label="Task selesai per hari, 14 hari terakhir" />
      </figure>
    </div>
  );
}
