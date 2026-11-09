export type Experience = {
  period: string;
  place: string;
  title: string;
  org: string;
  /** Marks the role that is still ongoing; the timeline highlights it. */
  current: boolean;
};

export const experience: Experience[] = [
  {
    period: 'Sep 2022 — Present',
    place: 'Jakarta',
    title: 'Frontend Engineer',
    org: 'PT. Bank Mandiri Tbk',
    current: true,
  },
  {
    period: '2017 — 2020',
    place: 'Bandung',
    title: 'Diploma in Civil Engineering',
    org: 'Politeknik Negeri Bandung · GPA 3.01 / 4.00',
    current: false,
  },
  {
    period: '2014 — 2017',
    place: 'Ciamis',
    title: 'High school',
    org: 'SMAN 1 Ciamis',
    current: false,
  },
];
