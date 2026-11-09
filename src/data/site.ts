import { API_URL } from './api';

export const site = {
  name: 'Salman Faris Siddiq',
  email: 'salman.faris.siddiq@gmail.com',
  // Served by the API from Neon Object Storage; upload a new one at /data-project.
  cv: API_URL ? `${API_URL}/cv` : '/CV_Salman_Faris_Siddiq.pdf',
  linkedin: 'https://www.linkedin.com/in/salman-faris-siddiq',
  instagram: 'https://www.instagram.com/salmanfsiddiq',
};

export const navLinks = [
  { n: '01', label: 'Work', href: '#work' },
  { n: '02', label: 'Skills', href: '#skills' },
  { n: '03', label: 'Experience', href: '#experience' },
  { n: '04', label: 'About', href: '#about' },
];
