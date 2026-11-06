import { onNavigate, scrollToSection } from './scrollToSection';
import { whenSceneReady } from './sceneQueue';

// URL-driven navigation: /#profile, /#projects ... open that section, a refresh keeps it, and Back / Forward move between the
// sections visited through the nav (each nav jump adds a history entry, src/navigation/scrollToSection.js).
//
// Opening a section link: the jump happens before the first paint, so Home never flashes; the destination's scene is given
// priority at once (src/navigation/sceneQueue.js) and shows its own loader until it is ready. Section heights come from CSS and
// content, not from the scenes, so the position is right immediately; anything that still shifts the layout after that (web
// fonts, a section settling its height) is corrected by keeping the section aligned until its scene is ready, for as long as
// the visitor has not started moving the page themselves.

const HOLD_AFTER_READY_MS = 1500;   // keep aligned a little past ready: the scene's own layout pass and fade-in
const HOLD_MAX_MS = 60000;          // and never longer than this

let started = false;

function idFromHash(ids) {
  const id = window.location.hash.slice(1);      // section ids are plain words: no decoding needed (and a stray % cannot throw)
  return ids.includes(id) ? id : null;
}

// Keeps the screen `offset` px into section `id` while the layout settles; stops on the visitor's own input or any other navigation.
function hold(id, offset = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  let done = false, raf = 0;
  const align = () => {
    raf = 0;
    if (done) return;
    const y = Math.round(el.getBoundingClientRect().top + window.pageYOffset + offset);
    if (Math.abs(y - window.pageYOffset) > 1) window.scrollTo({ top: y, behavior: 'auto' });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(align); };
  const ro = new ResizeObserver(queue);
  for (const s of el.parentElement.children) ro.observe(s);     // the sections above it decide where it starts
  const INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  const stop = () => {
    if (done) return; done = true;
    ro.disconnect(); cancelAnimationFrame(raf); clearTimeout(cap); off();
    for (const t of INPUT) window.removeEventListener(t, stop, true);
  };
  for (const t of INPUT) window.addEventListener(t, stop, { capture: true, passive: true });
  const off = onNavigate(stop);
  const cap = setTimeout(stop, HOLD_MAX_MS);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  whenSceneReady(id).then(() => setTimeout(stop, HOLD_AFTER_READY_MS));
}

// Restoring the plain URL after a refresh (or Back / Forward into it from another site), as browsers normally do: the place is
// kept as a section and the distance into it, so it still lands right if a section's height has changed since.
const KEY = 'pf-scroll';
function remember(ids) {
  if (window.location.hash) { try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ } return; }   // section URLs land on their section
  // the last section whose top is at or above the top of the screen, and how far into it the screen is
  const id = [...ids].reverse().find((i) => { const el = document.getElementById(i); return el && el.getBoundingClientRect().top <= 1; });
  const offset = id ? -document.getElementById(id).getBoundingClientRect().top : window.pageYOffset;
  try { sessionStorage.setItem(KEY, JSON.stringify({ url: window.location.href, id, offset: Math.round(offset) })); } catch { /* storage unavailable */ }
}
function restorePlain(ids) {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!saved || saved.url !== window.location.href || !nav || !/^(reload|back_forward)$/.test(nav.type)) return;
  const el = ids.includes(saved.id) && document.getElementById(saved.id);
  const y = (el ? el.getBoundingClientRect().top + window.pageYOffset : 0) + (saved.offset || 0);
  if (y <= 0) return;
  window.scrollTo({ top: y, behavior: 'auto' });
  if (el) hold(saved.id, saved.offset || 0);
}

/** Call once, after the sections are in the document and before the first paint (App's layout effect). */
export function startHashNavigation(ids) {
  if (started) return;
  started = true;
  // The page decides where a load lands. The browser's own restoration cannot be relied on here: it runs while the page is
  // still being built (the sections are rendered by script), so it is often cut short to the top, and on a section URL it
  // would fight the jump.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const first = idFromHash(ids);
  if (!window.location.hash) restorePlain(ids);   // the plain URL: a refresh comes back to where the visitor was
  // noted shortly after each scroll comes to rest: measuring while the page unloads is unreliable on mobile (the layout
  // reported then can be a different one)
  let timer = 0;
  window.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(() => remember(ids), 150); }, { passive: true });
  if (first && first !== ids[0]) {
    scrollToSection(first, { instant: true, history: 'none' });
    hold(first);
  }

  // Back / Forward between nav entries, or a hash typed into the address bar. A traversal back to the entry with no hash
  // (the page as first opened) is the top of the page.
  window.addEventListener('hashchange', () => {
    const id = window.location.hash ? idFromHash(ids) : ids[0];
    if (id) scrollToSection(id, { instant: true, history: 'none' });
  });
}
