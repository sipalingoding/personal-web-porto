import { experience, type Experience } from './experience';
import { projects, type Project } from './projects';

export type Stats = { projectsDelivered: number; coreFrameworks: number };

export type CvInfo = { filename: string; sizeBytes: number; updatedAt: string };

/** `logo` is a file id served at `${API_URL}/logo/<id>`; without one the name is shown. */
export type Partner = { name: string; logo: string | null };

/** Id of an uploaded logo or project image: a random UUID plus the detected format. */
export const IMAGE_ID = /^[0-9a-f-]{36}\.(svg|png|webp|jpg)$/;

/** Most images one project can hold. */
export const MAX_PROJECT_IMAGES = 12;

/** Most job-description lines one project can hold. */
export const MAX_PROJECT_DUTIES = 20;

/** Everything the public site reads from the API in one request. */
export type Content = {
  stats: Stats;
  partners: Partner[];
  projects: Project[];
  experience: Experience[];
  cv: CvInfo | null;
};

export const partners: Partner[] = ['Bank Mandiri', 'Lawencon Internasional', 'Nonoman Galuh', 'Pemprov Gorontalo'].map(
  (name) => ({ name, logo: null }),
);

export const stats: Stats = { projectsDelivered: 8, coreFrameworks: 2 };

/** Seed data for the database, and what the site shows until the API answers or if it fails. */
export const fallbackContent: Content = { stats, partners, projects, experience, cv: null };
