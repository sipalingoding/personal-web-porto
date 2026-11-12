import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { behind, buildScene, proj, type RoomKey, type Shape, type Slot } from './isoScene';

/*
 * The isometric house on the dashboard's front page. The scene is built once; each part
 * is a material class (m-desk, m-shirt…) whose faces are shaded top (t), left (l), right (r),
 * so the colours follow the light and dark theme from CSS. Soft shadows, the light pools
 * on the floor and the screens use the filter and gradients defined here. One character
 * lives in the house and walks to whichever room is picked.
 */
export const scene = buildScene();

/** Whole days from today (in Jakarta) to 31 December of this year: 1 December gives 30. */
export function daysLeftInYear(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  const [y, m, d] = ymd.split('-').map(Number);
  return { days: Math.round((Date.UTC(y, 11, 31) - Date.UTC(y, m - 1, d)) / 86_400_000), year: y };
}

/** Rechecks every ten minutes so the count turns over at midnight. */
export function useDaysLeft() {
  const [left, setLeft] = useState(daysLeftInYear);
  useEffect(() => {
    const id = window.setInterval(() => setLeft(daysLeftInYear()), 600_000);
    return () => window.clearInterval(id);
  }, []);
  return left;
}

/** The countdown written on the screen: what it counts to, then the days left. */
function Countdown({ slot }: { slot: Slot }) {
  const { days, year } = useDaysLeft();
  const last = days === 0;
  const numW = String(days).length * 21;
  return (
    <g className="iso-count" transform={slot.matrix}>
      <title>{last ? `Hari terakhir ${year}` : `${days} hari lagi menuju ${year + 1}`}</title>
      <g transform="translate(20 19)">
        <circle className="iso-count-face" r="6.5" />
        <path className="iso-count-hands" d="M0 -3.8V0L2.6 1.8" />
      </g>
      <text className="iso-count-cap" x="31" y="22.5">
        {last ? `AKHIR ${year}` : `MENUJU ${year + 1}`}
      </text>
      {last ? (
        <text className="iso-count-num" x="13" y="56" style={{ fontSize: 20 }}>
          Hari terakhir
        </text>
      ) : (
        <>
          <text className="iso-count-num" x="13" y="60">
            {days}
          </text>
          <text className="iso-count-tx" x={13 + numW + 6} y="59">
            hari lagi
          </text>
        </>
      )}
    </g>
  );
}

/** Walking speed in world units per second; a walk takes at most 2.4 seconds. */
const SPEED = 340;

type Walk = { id: number; to: RoomKey; pts: [number, number][] };

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * The house with the character in `room`. When the room changes, the pose in the old room
 * goes and the character walks over through the doorways, then sits (or stands) down there.
 * While walking, the figure is moved between the scene's groups every frame, so whatever
 * stands in front of it on the floor hides it.
 */
export default function IsoHouse({ room, onArrive }: { room: RoomKey; onArrive?: (room: RoomKey) => void }) {
  const id = useId().replace(/:/g, '');
  const ref = (name: string) => `url(#${id}-${name})`;
  const [shown, setShown] = useState<RoomKey | null>(room);
  const [walk, setWalk] = useState<Walk | null>(null);
  const last = useRef(room);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  const svg = useRef<SVGSVGElement>(null);
  const walker = useRef<SVGGElement>(null);
  const facing = useRef<SVGGElement>(null);

  // A new room: plan the walk (or, without motion, just move).
  useEffect(() => {
    const from = last.current;
    last.current = room;
    if (from === room) return;
    if (reducedMotion()) {
      setWalk(null);
      setShown(room);
      arrive.current?.(room);
      return;
    }
    setShown(null);
    setWalk((w) => ({ id: (w?.id ?? 0) + 1, to: room, pts: scene.route(from, room) }));
  }, [room]);

  // Walk it frame by frame: position along the path, facing, and place in the drawing order.
  useEffect(() => {
    const el = walker.current;
    const root = svg.current;
    if (!walk || !el || !root) return;
    const { pts } = walk;
    const lens = [0];
    for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const total = lens[lens.length - 1];
    const ms = Math.min(2400, (total / SPEED) * 1000);
    const groups = Array.from(root.querySelectorAll<SVGGElement>(':scope > g.iso-group'));
    let at = -1;
    let frame = 0;
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const d = Math.min(1, ms ? (now - t0) / ms : 1) * total;
      let k = 1;
      while (k < pts.length - 1 && lens[k] < d) k++;
      const [ax, ay] = pts[k - 1];
      const [bx, by] = pts[k];
      const f = lens[k] > lens[k - 1] ? (d - lens[k - 1]) / (lens[k] - lens[k - 1]) : 1;
      const x = ax + (bx - ax) * f;
      const y = ay + (by - ay) * f;
      const [px, py] = proj(x, y, 0);
      el.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)})`);
      // Facing down-right by default; mirrored when the leg heads left on screen.
      facing.current?.setAttribute('transform', bx - by < ax - ay ? 'scale(-1 1)' : '');
      const me = { minX: x - 5, maxX: x + 5, minY: y - 8, maxY: y + 8 };
      let slot = 0;
      scene.groups.forEach((g, i) => {
        if (g.b && behind(g.b, me)) slot = i;
      });
      if (slot !== at) {
        at = slot;
        root.insertBefore(el, groups[slot + 1] ?? null);
      }
      if (d < total) frame = requestAnimationFrame(step);
      else {
        setWalk(null);
        setShown(walk.to);
        arrive.current?.(walk.to);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [walk]);

  const draw = (s: Shape, i: number): ReactNode => {
    if (s.k === 'slot') return <Countdown key={i} slot={s} />;
    if (s.k === 'actor') {
      return (
        <g key={i} className={`iso-actor${shown === s.room ? ' on' : ''}`}>
          {s.shapes.map(draw)}
        </g>
      );
    }
    const cls = `${s.m} ${s.f}`;
    if (s.k === 'poly') return <polygon key={i} className={cls} points={s.points} />;
    if (s.k === 'path') return <path key={i} className={cls} d={s.d} />;
    return <ellipse key={i} className={cls} cx={s.cx.toFixed(1)} cy={s.cy.toFixed(1)} rx={s.rx.toFixed(1)} ry={s.ry.toFixed(1)} />;
  };

  const start = walk ? proj(walk.pts[0][0], walk.pts[0][1], 0) : null;
  return (
    <svg
      ref={svg}
      className="iso"
      viewBox={scene.viewBox}
      aria-hidden="true"
      focusable="false"
      style={{ ['--iso-blur' as string]: ref('blur'), ['--iso-glow' as string]: ref('glow'), ['--iso-screen' as string]: ref('screen'), ['--iso-lamp' as string]: ref('lamp') }}
    >
      <defs>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" style={{ stopColor: 'var(--iso-light)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--iso-light)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stopColor="#ffc94a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc94a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a63c9" />
          <stop offset="1" stopColor="#1b2a52" />
        </linearGradient>
      </defs>
      {scene.groups.map((g, gi) => (
        <g key={gi} className="iso-group">
          {g.shapes.map(draw)}
        </g>
      ))}
      {walk && start && (
        <g key={walk.id} ref={walker} className="iso-walker" transform={`translate(${start[0].toFixed(1)} ${start[1].toFixed(1)})`}>
          <g ref={facing}>
            <g className="iso-bob">
              <g className="iso-step a">{scene.walk.a.map(draw)}</g>
              <g className="iso-step b">{scene.walk.b.map(draw)}</g>
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}
