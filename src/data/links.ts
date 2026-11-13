/**
 * Ruang Lampiran in /mydashboard: links saved from social media (the posts one would
 * otherwise leave in each app's "saved"), kept on one page and sorted into categories.
 */

/** Offered in the form; any other category can be typed in. */
export const linkCategories = ['Kuliner', 'Programmer', 'Wisata', 'Event', 'Lainnya'] as const;

export type SavedLink = { id: number; url: string; title: string; category: string; createdAt: string };
export type LinksData = { items: SavedLink[] };

export const LINK_LIMITS = { url: 1000, title: 200, category: 40, items: 5000 } as const;

/** Where a link comes from, read from its address. `icon` is a Simple Icons slug. */
export const linkSources = [
  { key: 'threads', name: 'Threads', icon: 'threads', hosts: ['threads.net', 'threads.com'] },
  { key: 'x', name: 'X (Twitter)', icon: 'x', hosts: ['twitter.com', 'x.com', 't.co'] },
  { key: 'instagram', name: 'Instagram', icon: 'instagram', hosts: ['instagram.com', 'instagr.am'] },
  { key: 'tiktok', name: 'TikTok', icon: 'tiktok', hosts: ['tiktok.com'] },
] as const;

export type LinkSource = { key: string; name: string; icon: string | null };
const OTHER_SOURCE: LinkSource = { key: 'other', name: 'Situs lain', icon: null };

export function sourceOf(url: string): LinkSource {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return OTHER_SOURCE;
  }
  return linkSources.find((s) => s.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? OTHER_SOURCE;
}
