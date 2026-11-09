type IconProps = { className?: string };

export function ArrowRight({ className = 'ic' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 5h8M5.5 1.5 9 5 5.5 8.5" />
    </svg>
  );
}

export function ArrowDown({ className = 'ic' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 1v8M1.5 5.5 5 9l3.5-3.5" />
    </svg>
  );
}

export function ArrowUp({ className = 'ic' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 9V1M1.5 4.5 5 1l3.5 3.5" />
    </svg>
  );
}

export function ArrowUpRight({ className = 'ic' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1.5 8.5 8.5 1.5M3 1.5h5.5V7" />
    </svg>
  );
}

export function Trash() {
  return (
    <svg className="trash" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.75 6.75v4.5M9.25 6.75v4.5" />
    </svg>
  );
}

export function Sun() {
  return (
    <svg className="sun" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" />
    </svg>
  );
}

export function Moon() {
  return (
    <svg className="moon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.5 9.6A5.8 5.8 0 1 1 6.4 2.5a4.6 4.6 0 0 0 7.1 7.1z" />
    </svg>
  );
}
