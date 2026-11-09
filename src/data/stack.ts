/**
 * Technology catalogue from Simple Icons (https://simpleicons.org, CC0): names, brand
 * colours and SVG logos for about 3,500 brands, served by jsDelivr. The version is
 * pinned so a saved icon slug keeps pointing at the same file.
 */
const SIMPLE_ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@16.35.0';

/** One technology in a project's stack. `icon` is a Simple Icons slug; null for a custom entry. */
export type StackItem = { name: string; icon: string | null; hex: string | null };

export type CatalogueEntry = StackItem & { icon: string; hex: string; aliases: string[] };

export const ICON_SLUG = /^[a-z0-9]{1,80}$/;
export const HEX = /^[0-9A-F]{6}$/;

/** Most technologies one project can list. */
export const MAX_STACK = 20;

export const stackIconUrl = (slug: string) => `${SIMPLE_ICONS}/icons/${slug}.svg`;

/** Brand colours too close to a theme's background get the text colour there instead. */
export function hexTone(hex: string): 'dark' | 'light' | 'mid' {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.06 ? 'dark' : lum > 0.7 ? 'light' : 'mid';
}

export const stackText = (stack: StackItem[]) => stack.map((s) => s.name).join(', ');

type RawIcon = { title: string; slug: string; hex: string; aliases?: { aka?: string[] } };

let catalogue: Promise<CatalogueEntry[]> | null = null;

/** Loads the catalogue once per page; a failed load can be retried. */
export function loadCatalogue(): Promise<CatalogueEntry[]> {
  catalogue ??= fetch(`${SIMPLE_ICONS}/data/simple-icons.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`The technology list could not be loaded (${res.status}).`);
      return res.json() as Promise<RawIcon[]>;
    })
    .then((icons) =>
      icons.map((i) => ({ name: i.title, icon: i.slug, hex: i.hex.toUpperCase(), aliases: i.aliases?.aka ?? [] })),
    )
    .catch((err: unknown) => {
      catalogue = null;
      throw err instanceof Error && err.message.startsWith('The technology') ? err : new Error('The technology list could not be loaded.');
    });
  return catalogue;
}

/** Ranks names that start with the query first, then other matches, then alias matches. */
export function searchCatalogue(list: CatalogueEntry[], query: string, exclude: Set<string>, limit = 40) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { e: CatalogueEntry; score: number }[] = [];
  for (const e of list) {
    if (exclude.has(e.icon)) continue;
    const name = e.name.toLowerCase();
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (e.aliases.some((a) => a.toLowerCase().includes(q))) score = 3;
    if (score >= 0) scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score || a.e.name.length - b.e.name.length || a.e.name.localeCompare(b.e.name));
  return scored.slice(0, limit).map((s) => s.e);
}
