import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { StackIcon } from '../components/StackChips';
import { MAX_STACK, loadCatalogue, searchCatalogue, type CatalogueEntry, type StackItem } from '../data/stack';

type Option = { kind: 'icon'; entry: CatalogueEntry } | { kind: 'custom'; name: string };

/** Multi-select for a project's stack: search the Simple Icons catalogue, or add a name of your own. */
export default function StackPicker({ value, onChange }: { value: StackItem[]; onChange: (v: StackItem[]) => void }) {
  const [catalogue, setCatalogue] = useState<CatalogueEntry[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const full = value.length >= MAX_STACK;

  useEffect(() => {
    let live = true;
    setLoadError('');
    loadCatalogue()
      .then((c) => live && setCatalogue(c))
      .catch((err: Error) => live && setLoadError(err.message));
    return () => {
      live = false;
    };
  }, [attempt]);

  const options = useMemo<Option[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const taken = new Set(value.flatMap((v) => (v.icon ? [v.icon] : [])));
    const found: Option[] = searchCatalogue(catalogue ?? [], q, taken).map((entry) => ({ kind: 'icon', entry }));
    const lower = q.toLowerCase();
    const exact = (catalogue ?? []).some((e) => e.name.toLowerCase() === lower);
    const chosen = value.some((v) => v.name.toLowerCase() === lower);
    if (!exact && !chosen) found.push({ kind: 'custom', name: q.slice(0, 60) });
    return found;
  }, [catalogue, query, value]);

  const shown = open && options.length > 0;
  const at = Math.min(active, options.length - 1);

  useEffect(() => {
    if (shown) listRef.current?.querySelector(`[data-i="${at}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [at, shown]);

  const pick = (o: Option) => {
    if (full) return;
    const item: StackItem = o.kind === 'icon' ? { name: o.entry.name, icon: o.entry.icon, hex: o.entry.hex } : { name: o.name, icon: null, hex: null };
    if (value.some((v) => v.name.toLowerCase() === item.name.toLowerCase())) return;
    onChange([...value, item]);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const remove = (i: number) => {
    onChange(value.filter((_, k) => k !== i));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length) {
      setOpen(true);
      setActive(shown ? (at + 1) % options.length : 0);
    } else if (e.key === 'ArrowUp' && shown) {
      setActive((at - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      if (shown) pick(options[at]);
    } else if (e.key === 'Escape' && shown) {
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1));
    } else return;
    e.preventDefault();
  };

  const optionId = (i: number) => `${id}-opt-${i}`;

  return (
    <div className="adm-field wide">
      <label htmlFor={id}>
        Stack ({value.length}/{MAX_STACK})
      </label>
      <div className="adm-stack" onClick={() => inputRef.current?.focus()}>
        {value.length > 0 && (
          <ul className="adm-stack-chips">
            {value.map((s, i) => (
              <li key={`${s.name}-${i}`}>
                <StackIcon item={s} />
                <span>{s.name}</span>
                {!s.icon && <span className="adm-stack-custom">custom</span>}
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${s.name}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={shown}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={shown ? optionId(at) : undefined}
          disabled={full}
          value={query}
          placeholder={
            full ? `At most ${MAX_STACK} technologies` : catalogue ? `Search ${catalogue.length.toLocaleString('en')} technologies, or type your own` : 'Type a technology'
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {shown && (
          <ul ref={listRef} id={`${id}-list`} role="listbox" className="adm-stack-list" aria-label="Technologies">
            {options.map((o, i) => (
              <li
                key={o.kind === 'icon' ? o.entry.icon : `custom-${o.name}`}
                id={optionId(i)}
                data-i={i}
                role="option"
                aria-selected={i === at}
                className={i === at ? 'on' : undefined}
                // Keeps focus in the input so the list does not close before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                {o.kind === 'icon' ? (
                  <>
                    <StackIcon item={o.entry} />
                    <span>{o.entry.name}</span>
                  </>
                ) : (
                  <span className="adm-stack-add">Add “{o.name}” as a custom entry</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {loadError && (
        <p className="adm-status error" role="status">
          {loadError} You can still add names of your own.{' '}
          <button type="button" className="navb" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
