/**
 * Project board in /mydashboard, separate from the portfolio's own projects.
 * Projects hold the details; the board's columns show their tasks by status.
 */

export const boardStatuses = ['not_started', 'in_progress', 'done'] as const;
export type BoardStatus = (typeof boardStatuses)[number];

export const statusLabel: Record<BoardStatus, string> = {
  not_started: 'Not started',
  in_progress: 'On progress',
  done: 'Selesai',
};

export const boardKinds = ['Professional', 'Freelance'] as const;
export type BoardKind = (typeof boardKinds)[number];

/** A link on a project (repo, live site, design file…); the label is optional. */
export type BoardLink = { label: string; url: string };

export type BoardProject = { id: number; title: string; kind: BoardKind; description: string; links: BoardLink[] };

/** A feature of a project (e.g. "Login"), used to group its tasks. */
export type BoardFeature = { id: number; projectId: number; name: string };

export type BoardTask = { id: number; projectId: number; featureId: number | null; title: string; status: BoardStatus };

/** A dated note on a project, read and written in the notes dialog. */
export type BoardNote = { id: number; projectId: number; body: string; createdAt: string; updatedAt: string };

export type Board = { projects: BoardProject[]; features: BoardFeature[]; tasks: BoardTask[]; notes: BoardNote[] };

/** Task ids per column, top to bottom. */
export type BoardOrder = Record<BoardStatus, number[]>;

export const BOARD_LIMITS = { projectTitle: 120, description: 2000, taskTitle: 200, noteBody: 5000, featureName: 60, linkLabel: 60, linkUrl: 500, linksPerProject: 20, featuresPerProject: 100, projects: 200, tasks: 2000, notesPerProject: 500 } as const;
