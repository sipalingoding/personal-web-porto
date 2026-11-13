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

/** `watchedOn` is the day it was finished ("2026-11-13"), kept only for finished titles. */
export type TvItem = { id: number; title: string; kind: TvKind; platform: string; status: TvStatus; rating: number | null; watchedOn: string | null; note: string };

export type TvData = { items: TvItem[] };

export const TV_LIMITS = { title: 200, platform: 40, note: 500, items: 5000 } as const;
