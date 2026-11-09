import type { CSSProperties } from 'react';
import { hexTone, stackIconUrl, type StackItem } from '../data/stack';

/** A technology's logo in its brand colour, drawn as a mask so the colour can adapt to the theme. */
export function StackIcon({ item }: { item: StackItem }) {
  if (!item.icon || !item.hex) return null;
  const style = { '--si': `url("${stackIconUrl(item.icon)}")`, '--hex': `#${item.hex}` } as CSSProperties;
  return <span className="sti" data-tone={hexTone(item.hex)} style={style} aria-hidden="true" />;
}

export default function StackChips({ stack }: { stack: StackItem[] }) {
  return (
    <ul className="stk">
      {stack.map((s, i) => (
        <li key={`${s.name}-${i}`}>
          <StackIcon item={s} />
          {s.name}
        </li>
      ))}
    </ul>
  );
}
