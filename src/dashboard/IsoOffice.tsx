import { useEffect, useId, useState } from 'react';
import { buildScene, type Shape, type Slot } from './isoScene';

/*
 * The isometric office on the dashboard's front page. The scene is built once; each part
 * is a material class (m-desk, m-shirt…) whose faces are shaded top (t), left (l), right (r),
 * so the colours follow the light and dark theme from CSS. Soft shadows, the light pools
 * on the floor and the laptop screens use the filter and gradients defined here. Two
 * people do the rounds between the layers; their walk is a CSS animation.
 */
export const scene = buildScene();

/** Whole days from today (in Jakarta) to 31 December of this year: 1 December gives 30. */
function daysLeftInYear(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  const [y, m, d] = ymd.split('-').map(Number);
  return { days: Math.round((Date.UTC(y, 11, 31) - Date.UTC(y, m - 1, d)) / 86_400_000), year: y };
}

/** Rechecks every ten minutes so the count turns over at midnight. */
function useDaysLeft() {
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

function draw(s: Shape, i: number) {
  if (s.k === 'slot') return <Countdown key={i} slot={s} />;
  const cls = `${s.m} ${s.f}`;
  if (s.k === 'poly') return <polygon key={i} className={cls} points={s.points} />;
  if (s.k === 'path') return <path key={i} className={cls} d={s.d} />;
  return <ellipse key={i} className={cls} cx={s.cx.toFixed(1)} cy={s.cy.toFixed(1)} rx={s.rx.toFixed(1)} ry={s.ry.toFixed(1)} />;
}

export default function IsoOffice() {
  const id = useId().replace(/:/g, '');
  const ref = (name: string) => `url(#${id}-${name})`;
  return (
    <svg
      className="iso"
      viewBox={scene.viewBox}
      aria-hidden="true"
      focusable="false"
      style={{ ['--iso-blur' as string]: ref('blur'), ['--iso-glow' as string]: ref('glow'), ['--iso-screen' as string]: ref('screen') }}
    >
      <defs>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" style={{ stopColor: 'var(--iso-light)', stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: 'var(--iso-light)', stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a63c9" />
          <stop offset="1" stopColor="#1b2a52" />
        </linearGradient>
      </defs>
      {scene.layers.map((layer, li) => (
        <g key={li}>
          {layer.map(draw)}
          {scene.rounds
            .filter((r) => r.layer === li)
            .map((r, ri) => (
              <g
                key={ri}
                className={`iso-rounds n${li}`}
                style={{ ['--dx' as string]: `${r.dx.toFixed(1)}px`, ['--dy' as string]: `${r.dy.toFixed(1)}px` }}
              >
                <g className="iso-walk">
                  <g className="iso-bob">
                    <g className="iso-step a">{r.poses.a.map(draw)}</g>
                    <g className="iso-step b">{r.poses.b.map(draw)}</g>
                  </g>
                </g>
                <g className="iso-look">{r.poses.look.map(draw)}</g>
              </g>
            ))}
        </g>
      ))}
    </svg>
  );
}
