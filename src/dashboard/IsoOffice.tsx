import { useId } from 'react';
import { buildScene } from './isoScene';

/*
 * The isometric office on the dashboard's front page. The scene is built once; each part
 * is a material class (m-desk, m-shirt…) whose faces are shaded top (t), left (l), right (r),
 * so the colours follow the light and dark theme from CSS. Soft shadows, the light pools
 * on the floor and the laptop screens use the filter and gradients defined here.
 */
export const scene = buildScene();

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
      {scene.shapes.map((s, i) => {
        const cls = `${s.m} ${s.f}`;
        if (s.k === 'poly') return <polygon key={i} className={cls} points={s.points} />;
        if (s.k === 'path') return <path key={i} className={cls} d={s.d} />;
        return <ellipse key={i} className={cls} cx={s.cx.toFixed(1)} cy={s.cy.toFixed(1)} rx={s.rx.toFixed(1)} ry={s.ry.toFixed(1)} />;
      })}
    </svg>
  );
}
