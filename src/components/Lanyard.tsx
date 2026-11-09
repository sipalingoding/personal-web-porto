import { useEffect, useId, useRef, type PointerEvent } from 'react';

type Point = { x: number; y: number; px: number; py: number };
type Field = { label: string; value: string };

/* A strap is a Verlet rope: each point keeps its last position, so velocity is implicit
   and a released card swings on by itself. The card hangs from the last point and
   turns with the last strap segment. Values are per frame at ~60 fps. */
const SEGMENTS = 14;
const GRAVITY = 0.6;
const DAMPING = 0.975;
const MAX_TILT = 0.9; // radians; a card on a strap never flips sideways
const ITERATIONS = 24;
const ANCHOR_Y = -16; // the strap enters from above the frame
const CARD_RATIO = 1.64; // card height incl. clip, as a multiple of its width

export default function Lanyard({ fields, strapText }: { fields: Field[]; strapText: string }) {
  const box = useRef<HTMLDivElement>(null);
  const strap = useRef<SVGPathElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pathId = `strap-${useId().replace(/:/g, '')}`;
  const sim = useRef({
    pts: [] as Point[],
    seg: 0,
    w: 0,
    cardW: 0,
    raf: 0,
    still: 0,
    drag: null as null | { x: number; y: number; ox: number; oy: number },
    run: () => {},
  });

  useEffect(() => {
    const el = box.current!;
    const s = sim.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layout = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      const cardW = Math.min(w * 0.46, 220);
      const length = Math.max(h * 0.2, h * 0.92 - cardW * CARD_RATIO - ANCHOR_Y);
      s.w = w;
      s.cardW = cardW;
      s.seg = length / SEGMENTS;
      el.style.setProperty('--cw', `${cardW}px`);
      s.pts = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
        const y = ANCHOR_Y + i * s.seg;
        return { x: w / 2, y, px: w / 2, py: y };
      });
    };

    const draw = () => {
      const p = s.pts;
      const n = p.length - 1;
      let d = `M ${p[0].x} ${p[0].y}`;
      for (let i = 1; i < n; i++) {
        d += ` Q ${p[i].x} ${p[i].y} ${(p[i].x + p[i + 1].x) / 2} ${(p[i].y + p[i + 1].y) / 2}`;
      }
      d += ` L ${p[n].x} ${p[n].y}`;
      strap.current!.setAttribute('d', d);
      const raw = Math.atan2(-(p[n].x - p[n - 1].x), p[n].y - p[n - 1].y);
      const angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, raw));
      card.current!.style.transform = `translate(${p[n].x - s.cardW / 2}px, ${p[n].y}px) rotate(${angle}rad)`;
    };

    const step = () => {
      const p = s.pts;
      const n = p.length - 1;
      let moved = 0;
      for (let i = 1; i <= n; i++) {
        if (i === n && s.drag) continue;
        const vx = (p[i].x - p[i].px) * DAMPING;
        const vy = (p[i].y - p[i].py) * DAMPING;
        p[i].px = p[i].x;
        p[i].py = p[i].y;
        p[i].x += vx;
        p[i].y += vy + GRAVITY;
        moved = Math.max(moved, Math.abs(vx) + Math.abs(vy));
      }
      if (s.drag) {
        // Keep the target within reach of the strap so it never stretches.
        let tx = s.drag.x - s.drag.ox;
        let ty = s.drag.y - s.drag.oy;
        const reach = SEGMENTS * s.seg;
        const dist = Math.hypot(tx - s.w / 2, ty - ANCHOR_Y);
        if (dist > reach) {
          tx = s.w / 2 + ((tx - s.w / 2) * reach) / dist;
          ty = ANCHOR_Y + ((ty - ANCHOR_Y) * reach) / dist;
        }
        p[n].px = p[n].x;
        p[n].py = p[n].y;
        p[n].x = tx;
        p[n].y = ty;
        moved = 1;
      }
      for (let k = 0; k < ITERATIONS; k++) {
        p[0].x = s.w / 2;
        p[0].y = ANCHOR_Y;
        for (let i = 0; i < n; i++) {
          const a = p[i];
          const b = p[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const diff = (dist - s.seg) / dist;
          // The anchor never moves; the card end is heavier, or held while dragged.
          const wa = i === 0 ? 0 : 1;
          const wb = i + 1 === n ? (s.drag ? 0 : 0.35) : 1;
          const total = wa + wb;
          if (!total) continue;
          a.x += (dx * diff * wa) / total;
          a.y += (dy * diff * wa) / total;
          b.x -= (dx * diff * wb) / total;
          b.y -= (dy * diff * wb) / total;
        }
      }
      return moved;
    };

    // The loop stops once the card is at rest, so an idle page costs nothing.
    const tick = () => {
      const moved = step();
      draw();
      s.still = s.drag || moved > 0.05 ? 0 : s.still + 1;
      s.raf = s.still > 90 ? 0 : requestAnimationFrame(tick);
    };
    s.run = () => {
      s.still = 0;
      if (!s.raf) s.raf = requestAnimationFrame(tick);
    };

    layout();
    draw();

    const resize = new ResizeObserver(() => {
      layout();
      draw();
    });
    resize.observe(el);

    // When the card first scrolls into view it drops in from the side and settles.
    const intro = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        intro.disconnect();
        if (reduceMotion) return;
        const n = s.pts.length - 1;
        s.pts.forEach((pt, i) => {
          const t = i / n;
          pt.x += s.w * 0.2 * t * t;
          pt.y -= s.seg * 2 * t * t;
          pt.px = pt.x;
          pt.py = pt.y;
        });
        s.run();
      },
      { threshold: 0.4 },
    );
    intro.observe(el);

    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      resize.disconnect();
      intro.disconnect();
    };
  }, []);

  const local = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const s = sim.current;
    const last = s.pts[s.pts.length - 1];
    const { x, y } = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    s.drag = { x, y, ox: x - last.x, oy: y - last.y };
    s.run();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = sim.current;
    if (!s.drag) return;
    const { x, y } = local(e);
    s.drag.x = x;
    s.drag.y = y;
  };

  const release = () => {
    sim.current.drag = null;
  };

  const [first, ...rest] = fields;

  return (
    <div className="lanyard" ref={box}>
      <svg className="lanyard-strap" aria-hidden="true">
        <path id={pathId} ref={strap} />
        <text dy="0.32em">
          <textPath href={`#${pathId}`}>{`${strapText} · `.repeat(6)}</textPath>
        </text>
      </svg>
      <div
        className="idcard"
        ref={card}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span className="idcard-clip" aria-hidden="true" />
        <div className="idcard-face">
          <span className="idcard-slot" aria-hidden="true" />
          <span className="idcard-top">ID card</span>
          <dl>
            <div className="lead">
              <dt>{first.label}</dt>
              <dd>{first.value}</dd>
            </div>
            {rest.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
