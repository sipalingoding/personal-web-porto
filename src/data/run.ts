/**
 * Running in /mydashboard's Ruang Lari: the runs that were logged (date, distance, time,
 * an optional route) and the two dates the training plan is worked out from.
 */

/** A point of a route: latitude, longitude. */
export type RunPoint = [number, number];

/** Dates are calendar days in Jakarta, "2026-11-13". */
export type Run = { id: number; date: string; km: number; seconds: number | null; note: string; route: RunPoint[] | null };

/** The birthday the plan aims at, and the day the plan starts. Null until they are set. */
export type RunSettings = { birthday: string; start: string };

export type RunData = { settings: RunSettings | null; runs: Run[] };

export const RUN_LIMITS = { km: 200, seconds: 172_800, note: 500, routePoints: 400, runs: 5000 } as const;
