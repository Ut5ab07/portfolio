// The mobile edition's view of the portfolio content. Everything comes from the files the cinematic edition already uses, so
// there is one source of truth; this file only reshapes it. Nothing here is new information, except where noted.
import { PROFILE } from '../components/profile/profileData';
import { PROJECTS } from '../components/projects/projectsData';
import { STATIONS } from '../components/stack/stackData';
import { CONTACT } from '../components/contact/ContactConfig';
import portrait from '../assets/profile/portrait.webp';
import portraitSmall from '../assets/profile/portrait-320.webp';

export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'profile', label: 'About & Education' },   // the same id as the cinematic edition, so section links work in both
  { id: 'projects', label: 'Projects' },
  { id: 'stack', label: 'Technical Stack' },
  { id: 'contact', label: 'Contact' },
];

export const PERSON = {
  name: PROFILE.name,
  role: PROFILE.role,
  based: CONTACT.based,
  origin: CONTACT.origin,
  // the opening introduction, as supplied in the brief for the mobile edition
  intro: 'AI Engineering student interested in data science, machine learning, intelligent systems, and software development. I enjoy building projects that explore how data and technology can solve real-world problems.',
  // About: the opening paragraph (set large) and the paragraph beside the portrait, as supplied for this edition
  lead: 'I am an AI Engineering student with a strong interest in data science, machine learning, and intelligent systems. I enjoy exploring how technology can be used to understand complex problems, uncover useful insights, and build solutions that make a difference.',
  about: [
    'I am curious about how things work and enjoy learning beyond what I already know. My interests include artificial intelligence, large language models, data analytics, and software development. I value hands-on learning, logical thinking, and continuous improvement. I believe in building a strong foundation, staying open to new ideas, and growing through every challenge.',
  ],
  education: PROFILE.education,
  interests: PROFILE.interests,
  resume: '/' + PROFILE.resume,
  portrait: { src: portrait, small: portraitSmall, w: 469, h: 586 },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const WORK = PROJECTS.map((p) => ({
  slug: slug(p.title),
  title: p.title,
  motif: p.motif,
  desc: p.desc,
  overview: p.purpose,
  problem: p.problem,
  approach: p.workflow || [],
  features: p.features || [],
  tech: p.tech || [],
  repo: p.href,
  demo: p.demo,
}));

export const STACK = STATIONS.map((s, i) => ({
  key: String.fromCharCode(65 + i),
  id: s.id,
  title: s.title,
  desc: s.desc,
  groups: s.groups.map((g) => ({ name: g.name, items: g.items.map(([name, icon, mono]) => ({ name, icon, mono })) })),
  count: s.groups.reduce((n, g) => n + g.items.length, 0),
}));

export { CONTACT };
export { gmailCompose } from '../components/contact/ContactConfig';
export const instaHandle = (url) => '@' + url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
export const short = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
