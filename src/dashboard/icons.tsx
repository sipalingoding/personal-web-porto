import type { ButtonHTMLAttributes } from 'react';

/* Icon-only buttons for the dashboard. Every button keeps its name for screen readers
   (aria-label) and shows it as a tooltip on hover (title). */

const paths = {
  close: 'M4 4l8 8M12 4l-8 8',
  plus: 'M8 3v10M3 8h10',
  check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
  trash: 'M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.75 6.75v4.5M9.25 6.75v4.5',
  pencil: 'M10.5 3 13 5.5 6 12.5H3.5V10z',
  back: 'M13 8H3M7 4 3 8l4 4',
  retry: 'M13 8a5 5 0 1 1-1.5-3.55M13 2.5V5h-2.5',
  unlock: 'M4 7.5h8a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 .5-.5zM5.5 7.5V5.25a2.5 2.5 0 0 1 4.9-.7',
  link: 'M6.75 9.25a2.75 2.75 0 0 0 3.9 0l2-2a2.75 2.75 0 0 0-3.9-3.9l-.75.75M9.25 6.75a2.75 2.75 0 0 0-3.9 0l-2 2a2.75 2.75 0 0 0 3.9 3.9l.75-.75',
  note: 'M4 2.5h5.5L12.5 5.5V13a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5zM9.5 2.5v3h3M5.75 8.25h4.5M5.75 10.75h3',
  columns: 'M2.5 3h11v10h-11zM6.17 3v10M9.83 3v10',
  rows: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5',
} as const;

export type GlyphName = keyof typeof paths;

export function Glyph({ name }: { name: GlyphName }) {
  return (
    <svg className="glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

/** Rotating arc shown in place of the icon while a request runs. */
function Spinner() {
  return (
    <svg className="glyph spin" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5a5.5 5.5 0 1 1-5.5 5.5" />
    </svg>
  );
}

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: GlyphName;
  label: string;
  /** p: black, g: white, del: red, ghost: no background. */
  tone?: 'p' | 'g' | 'del' | 'ghost';
  busy?: boolean;
  size?: 'sm' | 'md';
};

export function IconButton({ icon, label, tone = 'g', busy = false, size = 'md', className, disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      {...rest}
      type={type}
      className={['ib', tone, size, className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
    >
      {busy ? <Spinner /> : <Glyph name={icon} />}
    </button>
  );
}
