/**
 * Ruang TV in /mydashboard: the films and series that were watched, are being watched,
 * or are waiting to be, each with the platform it is on.
 */

export const tvKinds = ['Film', 'Series'] as const;
export type TvKind = (typeof tvKinds)[number];

export const tvStatuses = ['watching', 'planned', 'done'] as const;
export type TvStatus = (typeof tvStatuses)[number];

export const tvStatusLabel: Record<TvStatus, string> = { watching: 'Sedang ditonton', planned: 'Ingin ditonton', done: 'Selesai' };

/** Offered in the form; any other name can be typed in. */
export const tvPlatforms = ['Netflix', 'Apple TV+', 'Disney+ Hotstar', 'Prime Video', 'HBO Max', 'Vidio', 'Viu', 'WeTV', 'YouTube', 'Bioskop'] as const;

/**
 * `watchedOn` is the day it was finished ("2026-11-13"), kept only for finished titles.
 * A title picked from the TMDB search also carries its TMDB id, year and poster; a platform
 * known to TMDB carries its logo. Poster and logo are TMDB image paths ("/abc.jpg").
 */
export type TvItem = {
  id: number;
  title: string;
  kind: TvKind;
  platform: string;
  status: TvStatus;
  rating: number | null;
  watchedOn: string | null;
  note: string;
  year: number | null;
  poster: string | null;
  tmdbId: number | null;
  platformLogo: string | null;
};

export type TvData = { items: TvItem[] };

export const TV_LIMITS = { title: 200, platform: 40, note: 500, items: 5000 } as const;

/** A title found by the search. */
export type TvHit = { tmdbId: number; kind: TvKind; title: string; year: number | null; poster: string | null };

/** A streaming platform as TMDB knows it. */
export type TvPlatform = { name: string; logo: string | null };

/** A TMDB image path: a slash, a file name, an image extension. */
export const TMDB_IMAGE = /^\/[A-Za-z0-9_-]{1,80}\.(jpg|png|svg)$/;

/** Address of a TMDB image at a width TMDB serves (w45, w92, w154, w185…). */
export const tmdbImage = (path: string, width: 45 | 92 | 154 | 185) => `https://image.tmdb.org/t/p/w${width}${path}`;
