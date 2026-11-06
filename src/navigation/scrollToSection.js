import { prioritizeScene } from './sceneQueue';

// Jump to a section's top. Once the page has come to rest there, the section receives a `portfolio:navigate` event so it
// can reset any internal state to its starting point. No section currently needs it; sections may ignore it.
//   instant: jump without the smooth scroll (opening a section link, Back / Forward).
//   history: 'push' adds a browser history entry (nav links, so Back and Forward work), 'none' leaves the URL alone (the URL
//            already says where to go: page load, Back / Forward, a hash typed in the address bar).
export const NAVIGATE_EVENT = 'portfolio:navigate';

let pending = 0;
const listeners = new Set();
/** Called with the section id whenever a navigation starts (src/navigation/hashNavigation.js stops holding its arrival). */
export const onNavigate = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function scrollToSection(id, { instant = false, history: mode = 'push' } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  listeners.forEach((fn) => fn(id));
  prioritizeScene(id);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = Math.round(el.getBoundingClientRect().top + window.pageYOffset);
  window.scrollTo({ top: target, behavior: reduce || instant ? 'auto' : 'smooth' });
  if (mode === 'push' && window.location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);

  // Wait until scrolling settles (works whether or not the browser supports `scrollend`), then notify the section.
  cancelAnimationFrame(pending);
  let lastY = -1, still = 0;
  const started = performance.now();
  const watch = () => {
    const y = window.pageYOffset;
    still = Math.abs(y - lastY) < 0.5 ? still + 1 : 0;
    lastY = y;
    if (still >= 6 || performance.now() - started > 4000) { el.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { id } })); return; }
    pending = requestAnimationFrame(watch);
  };
  pending = requestAnimationFrame(watch);
}
