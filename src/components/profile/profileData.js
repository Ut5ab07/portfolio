// Content of the Profile dossier. Everything here comes from the existing portfolio:
//   name, role, introduction ............ supplied for this section
//   based / origin ...................... Contact section (ContactConfig.js)
// Nothing has been invented. Fields set to null are shown as clearly marked placeholders ("To be added"): fill them in here.

import photo from '../../assets/profile/portrait.jpg';

export const PROFILE = {
  name: 'Utsab Raj Acharya',
  role: 'AI Engineering Student',
  record: 'CZ / UA',
  intro: 'I am an AI Engineering student interested in data science, machine learning, and intelligent systems. I enjoy exploring how data and technology can solve real-world problems through practical projects and experimentation.',

  // A 4:5 crop of at least 400 x 500 px works best. null shows the placeholder frame.
  photo,

  based: 'Bangalore, India',
  origin: 'Pokhara, Nepal',

  about: [
    'I explore data, machine learning, and intelligent systems to turn complex problems into meaningful solutions.',
    'So far that has meant five projects: football scouting with machine learning, semantic movie search with embeddings, graph-based recommendations, a REST backend for an AI learning platform, and an AI agent that analyses data with an LLM.',
  ],

  education: [
    { label: 'Programme', value: 'Computer Science and Engineering with Artificial Intelligence' },
    { label: 'Status', value: 'Currently studying' },
    { label: 'Institution', value: 'Jain (Deemed-to-be University)' },
    { label: 'Years', value: '3rd year' },
  ],

  interests: ['Data Science', 'LLMs and AI', 'Sports Analysis'],

  // Served from public/; visitors download it under this file name.
  resume: 'Utsab_Raj_Acharya_Resume.pdf',


};

export const TABS = [
  { id: 'about', label: 'About Me' },
  { id: 'education', label: 'Education' },
  { id: 'interests', label: 'Technical Interests' },
];
