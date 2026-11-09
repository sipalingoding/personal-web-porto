import type { StackItem } from './stack.js';

export type Discipline = 'Frontend' | 'Backend' | 'UI/UX Designer';

export const disciplines: { name: Discipline; stack: string }[] = [
  { name: 'Frontend', stack: 'React, Angular, Next.js' },
  { name: 'Backend', stack: '.NET, MySQL, SSIS' },
  { name: 'UI/UX Designer', stack: 'Figma, design systems' },
];

/** How the work was done; the second choice inside a discipline. */
export const kinds = ['Professional work', 'Freelance'] as const;
export type Kind = (typeof kinds)[number];

export type Project = {
  name: string;
  discipline: Discipline;
  file: string;
  kind: Kind;
  client: string;
  /** Result headline shown large in the spec panel. */
  headline: string;
  project: string;
  desc: string;
  type: string;
  stack: StackItem[];
  role: string;
  /** Uploaded images shown in place of the sketch, in order; each served at `${API_URL}/shot/<id>`. Empty shows the sketch. */
  images: string[];
  /** Job description: what the work involved, one task per item. Empty hides the button. */
  duties: string[];
  /** Live address of the project, linked in the details; null hides the row. */
  url: string | null;
};

export const projects: Project[] = [
  {
    name: 'MCAP',
    discipline: 'Frontend',
    file: 'mcap.component.ts',
    kind: 'Professional work',
    client: 'Bank Mandiri',
    headline: 'Collateral appraisal, in real time, out in the field',
    project: 'Mobile appraisal platform with maps',
    desc: 'A mobile platform field appraisers use to assess collateral in real time, with map integration built in.',
    type: 'Mobile web app',
    stack: [
      { name: 'Angular', icon: 'angular', hex: '0F0F11' },
      { name: 'Tailwind CSS', icon: 'tailwindcss', hex: '06B6D4' },
      { name: 'Angular Maps', icon: null, hex: null },
    ],
    role: 'Frontend engineer',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'ORP',
    discipline: 'Frontend',
    file: 'orp.tsx',
    kind: 'Professional work',
    client: 'Bank Mandiri',
    headline: 'Operational requests, managed in one place',
    project: 'Operational request management platform',
    desc: 'Centralised state and an enterprise UI for raising, tracking and approving operational requests.',
    type: 'Enterprise web app',
    stack: [
      { name: 'React', icon: 'react', hex: '61DAFB' },
      { name: 'Tailwind CSS', icon: 'tailwindcss', hex: '06B6D4' },
      { name: 'Ant Design', icon: 'antdesign', hex: '0170FE' },
      { name: 'Redux', icon: 'redux', hex: '764ABC' },
    ],
    role: 'Frontend engineer',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'CMS',
    discipline: 'Backend',
    file: 'cms.cs',
    kind: 'Professional work',
    client: 'Enterprise, internal',
    headline: 'Collateral data and reporting, for the whole enterprise',
    project: 'Collateral management system',
    desc: 'An enterprise system for managing collateral asset data and producing the reports around it.',
    type: 'Enterprise system',
    stack: [
      { name: '.NET 4.8', icon: 'dotnet', hex: '512BD4' },
      { name: 'MySQL', icon: 'mysql', hex: '4479A1' },
    ],
    role: 'Developer',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'IRS',
    discipline: 'Backend',
    file: 'irs.sql',
    kind: 'Professional work',
    client: 'Enterprise, internal',
    headline: 'Cross-system financial checks, now automated',
    project: 'Internal data reconciliation system',
    desc: 'Automated validation of financial data across systems, replacing checks that used to be done by hand.',
    type: 'Data system',
    stack: [
      { name: 'MySQL', icon: 'mysql', hex: '4479A1' },
      { name: 'SSIS', icon: null, hex: null },
    ],
    role: 'Developer',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'Nonoman Galuh',
    discipline: 'Frontend',
    file: 'nonoman.tsx',
    kind: 'Freelance',
    client: 'Nonoman Galuh',
    headline: 'News, videos, a library and members, in one place',
    project: 'Cultural organisation platform',
    desc: 'A platform for a cultural organisation, with news, a YouTube channel, a digital library and member management.',
    type: 'Web platform',
    stack: [
      { name: 'Next.js', icon: 'nextdotjs', hex: '000000' },
      { name: 'Tailwind CSS', icon: 'tailwindcss', hex: '06B6D4' },
      { name: 'Supabase', icon: 'supabase', hex: '3FCF8E' },
    ],
    role: 'Design + build',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'PUKIS',
    discipline: 'Frontend',
    file: 'pukis.tsx',
    kind: 'Freelance',
    client: 'Freelance project',
    headline: 'Sundanese folklore, told on an interactive map',
    project: 'Interactive Sundanese folklore platform',
    desc: 'Sundanese folk stories organised on a regional map, with accounts for readers.',
    type: 'Web platform',
    stack: [
      { name: 'Next.js', icon: 'nextdotjs', hex: '000000' },
      { name: 'Tailwind CSS', icon: 'tailwindcss', hex: '06B6D4' },
      { name: 'shadcn/ui', icon: 'shadcnui', hex: '000000' },
      { name: 'Supabase', icon: 'supabase', hex: '3FCF8E' },
    ],
    role: 'Design + build',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'Wedding Invitation',
    discipline: 'Frontend',
    file: 'invite.tsx',
    kind: 'Freelance',
    client: 'Private client',
    headline: 'An invitation that tells the story as you scroll',
    project: 'Animated digital wedding invitation',
    desc: 'A digital wedding invitation with animation and illustrated storytelling.',
    type: 'Microsite',
    stack: [
      { name: 'Next.js', icon: 'nextdotjs', hex: '000000' },
      { name: 'Tailwind CSS', icon: 'tailwindcss', hex: '06B6D4' },
    ],
    role: 'Design + build',
    images: [],
    duties: [],
    url: null,
  },
  {
    name: 'PENTAGON',
    discipline: 'UI/UX Designer',
    file: 'pentagon.fig',
    kind: 'Freelance',
    client: 'Pemprov Gorontalo',
    headline: 'A design system for open government data',
    project: 'UI design and design system',
    desc: 'UI design and a design system for the Gorontalo Province open government data platform.',
    type: 'UI and design system',
    stack: [
      { name: 'Figma', icon: 'figma', hex: 'F24E1E' },
    ],
    role: 'Designer',
    images: [],
    duties: [],
    url: null,
  },
];
