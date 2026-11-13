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
  work: 'M2.5 5.5h11v7.5h-11zM6 5.5v-2h4v2M2.5 8.5h11',
  book: 'M8 4.5C6.5 3.3 4.5 3 2.5 3.3v9c2-.3 4 0 5.5 1.2 1.5-1.2 3.5-1.5 5.5-1.2v-9C11.5 3 9.5 3.3 8 4.5zM8 4.5v9',
  tv: 'M2.5 4.5h11v7h-11zM6 13.5h4M6 2.5l2 2 2-2',
  pray: 'M8 1.75v1.5M4.25 13.5V8.75a3.75 3.75 0 0 1 7.5 0v4.75M2.5 13.5h11M6.75 13.5v-2.25a1.25 1.25 0 0 1 2.5 0v2.25',
  vocab: 'M1.75 12.5 5 3.75l3.25 8.75M2.85 9.5h4.3M14 8.5v4M14 10.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  door: 'M3.5 13.5h9M4.5 13.5V2.5h7v11M9.25 8.25h.01',
  key: 'M10.25 2.5a3.25 3.25 0 1 1-2.9 4.72L2.5 12.1v1.4h1.75v-1.25H5.5V11h1.25l1.33-1.33A3.25 3.25 0 0 1 10.25 2.5zM11 5.25h.01',
  shoe: 'M1.5 12.5h13M1.5 12.5V6.5l3.5-.5L7 8.5l4 1 2.5 1a1 1 0 0 1 1 1v1M7.5 8.75l1-1.5M9.5 9.25l1-1.5',
  sound: 'M2.5 6.25h2.25L8 3.5v9L4.75 9.75H2.5zM10.5 6a2.75 2.75 0 0 1 0 4M12.25 4a5.5 5.5 0 0 1 0 8',
  film: 'M2.5 3h11v10h-11zM5.25 3v10M10.75 3v10M2.5 6.33h2.75M2.5 9.67h2.75M10.75 6.33h2.75M10.75 9.67h2.75',
  music: 'M6 11.5v-8l7-1.5v8M6 11.5a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0zM13 10a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0z',
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
