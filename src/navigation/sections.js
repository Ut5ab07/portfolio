import HomeSection from '../components/HomeSection';
import ProfileSection from '../components/ProfileSection';
import ProjectsSection from '../components/ProjectsSection';
import TechStackSection from '../components/TechStackSection';
import ContactSection from '../components/ContactSection';

// Single source of truth for page order, section ids, nav labels and the nav tint shown while each section is active.
// Ids are the stable mount points / anchors: to install the real Home or Profile, replace the component file (same default
// export, same `id` prop) — nothing here or in the other sections needs to change.
//   nav theme: fg = idle link, on = active link, shade = top gradient behind the bar, glow = optional text-shadow.
const NEUTRAL = { fg: '#6f757b', on: '#e6e9ec', shade: 'rgba(5,5,6,.8)', glow: 'none' };

export const SECTIONS = [
  { id: 'home', label: 'HOME', Component: HomeSection, nav: { fg: '#b8a283', on: '#f4e6cc', shade: 'rgba(28,19,11,.55)', glow: '0 1px 8px rgba(24,14,6,.55)' } },
  { id: 'profile', label: 'PROFILE', Component: ProfileSection, nav: { fg: '#8d969c', on: '#eceae4', shade: 'rgba(16,19,22,.6)', glow: '0 1px 6px rgba(10,14,18,.55)' } },
  { id: 'projects', label: 'PROJECTS', Component: ProjectsSection, nav: { fg: '#6f757b', on: '#e6e9ec', shade: 'rgba(5,5,6,.8)', glow: 'none' } },
  { id: 'stack', label: 'STACK', Component: TechStackSection, nav: { fg: '#9a8270', on: '#f0dcc4', shade: 'rgba(18,10,6,.66)', glow: '0 1px 6px rgba(10,6,4,.6)' } },
  { id: 'contact', label: 'CONTACT', Component: ContactSection, nav: { fg: '#a39e92', on: '#e8b56a', shade: 'rgba(10,13,18,.8)', glow: '0 1px 8px rgba(10,16,28,.7)' } },
];
