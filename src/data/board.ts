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

export type BoardProject = { id: number; title: string; kind: BoardKind; description: string };

export type BoardTask = { id: number; projectId: number; title: string; status: BoardStatus };

export type Board = { projects: BoardProject[]; tasks: BoardTask[] };

/** Task ids per column, top to bottom. */
export type BoardOrder = Record<BoardStatus, number[]>;

export const BOARD_LIMITS = { projectTitle: 120, description: 2000, taskTitle: 200, projects: 200, tasks: 2000 } as const;
