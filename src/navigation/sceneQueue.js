// Progressive loading of the five 3D scenes.
//
//   - Home starts at once; nothing else competes with it until it is ready.
//   - Nothing else is built or downloaded until the visitor does something meaningful: a scroll, a touch or a click, or using a
//     nav link. A mouse passing over the page does not count. Someone who only reads Home never pays for the other four scenes.
//   - After that, how far ahead scenes are prepared depends on the device:
//       Desktop class (a mouse-like pointer, not a mobile browser, with data and memory to spare): every scene in page order, one at
//       a time, when the browser is idle. Stack's models and textures start downloading when Projects starts preparing.
//       Everything else: only the next scene after the one the visitor is on (the section crossing the middle of the screen).
//       Staying on Home prepares Profile and nothing more; on Profile, Projects is prepared; and so on.
//       Save-data, a slow connection or low memory: one step ahead too, and Stack's large downloads wait until it is approached.
//   - The destination always comes first. A nav link, or a section that stays on screen unprepared, starts at once at full speed;
//     other preparation pauses at its next step and no new scene starts until that one is ready, then the device's strategy
//     resumes from where the visitor now is. Sections a nav jump merely scrolls past are not built on the way.
//   - A link to a section (/#stack) makes that section the destination from the start: it is built first, and Home waits until
//     it is ready (Home is not on screen); then the device's strategy runs as usual.
//   - Background preparation also gives way while the visitor is scrolling.
//   - A prepared scene is built, its textures uploaded and its shaders compiled, but it does not render until it is on screen,
//     and it is kept for the rest of the visit.
//
// A section registers itself with registerScene(id, { start, prefetch }) and must call ready() once its scene is usable or
// has failed (so the queue moves on). Sections that are never registered are skipped.
import { isQuiet, noteInput, setFocus } from '../three/quiet';

const ORDER = ['home', 'profile', 'projects', 'stack', 'contact'];
const entries = new Map();
let homeReady = false, scheduled = false, activated = false, active = 0, listening = false;
let focused = null, navUntil = 0, navTimer = 0, focusTimer = 0, seenTimer = 0, fadeUntil = 0;
const NAV_MS = 4000;        // the longest a nav jump's scroll takes (src/navigation/scrollToSection.js)
const FADE_MS = 1600;       // a scene on screen fades in for up to this long; the next one's build does not start over it
const FOCUS_MS = 45000;     // safety net: a scene that never reports back cannot hold up the others for good

// the section a link opened the page on (src/navigation/hashNavigation.js scrolls there before the first paint)
const LINKED = (() => { const id = window.location.hash.slice(1); return id !== 'home' && ORDER.includes(id) ? id : null; })();
let homeWaiting = null;     // Home's entry while it waits for the linked section
const waiters = new Map();  // id -> callbacks for whenSceneReady
// a scene is ready or failed: whoever waits for it can go on (Home's build does not start over the linked section's fade-in)
function settled(id, fade) {
  if (id === LINKED) setTimeout(startHome, fade);
  (waiters.get(id) || []).forEach((fn) => fn()); waiters.delete(id);
}
function startHome() { const h = homeWaiting; homeWaiting = null; if (h && !h.ready) { begin(h); pump(); } }

const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
const saveData = () => !!(navigator.connection && navigator.connection.saveData);
// little to spare: data saver, a slow connection, or low memory (each only where the browser reports it)
const conserve = () => {
  const c = navigator.connection;
  return saveData() || !!(c && /^(slow-2g|2g|3g)$/.test(c.effectiveType || '')) || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2);
};
// capability rather than screen size; a browser that cannot say is treated as the lighter case
const desktopClass = () => !(navigator.userAgentData && navigator.userAgentData.mobile) && !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
const oneStep = () => !desktopClass() || conserve();
const isNextUp = (e) => ORDER.indexOf(e.id) === active + 1;
const busy = () => !!focused || performance.now() < navUntil || performance.now() < fadeUntil;     // the visitor is waiting for a scene, a nav jump is on its way, or a scene is fading in

function begin(e) { if (e.started) return; e.started = true; try { e.start(); } catch (err) { console.warn(err); e.ready = true; if (focused === e) setFocused(null); settled(e.id, 0); pump(); } }

function setFocused(e) {
  clearTimeout(focusTimer);
  focused = e; setFocus(e ? e.id : null);
  if (e) focusTimer = setTimeout(() => { if (focused === e) { setFocused(null); pump(); } }, FOCUS_MS);
}

// the section on screen that is not ready yet, if any, has the visitor's attention (a nav jump's destination keeps it until it arrives)
function refocus() {
  if (performance.now() < navUntil) return;
  if (focused && focused.visible && !focused.ready) return;
  const on = [...entries.values()].filter((e) => e.visible && !e.ready).sort((a, b) => b.seenAt - a.seenAt)[0] || null;
  if (on !== focused) setFocused(on);
  if (on) begin(on);
  pump();
}

// A nav link was used: this scene first, whatever else was under way (src/navigation/scrollToSection.js).
export function prioritizeScene(id) {
  activate();
  const e = entries.get(id);
  navUntil = performance.now() + NAV_MS;
  clearTimeout(navTimer); navTimer = setTimeout(() => { navUntil = 0; refocus(); }, NAV_MS);
  setFocused(e && !e.ready ? e : null);
  if (e && !e.ready) begin(e);
}

// on one-step devices only the section ahead counts as "near": landing on a section must not build the one behind it
const nearCounts = (e) => !oneStep() || isNextUp(e);

function nextScene() {
  if (oneStep()) {
    const e = entries.get(ORDER[active + 1]);
    if (!e || e.ready || e.started) return null;
    return conserve() && e.prefetch && !e.near ? null : e;   // large downloads wait for the visitor's approach
  }
  const e = ORDER.map((id) => entries.get(id)).find((x) => x && !x.ready);
  return e && !e.started ? e : null;
}

function pump() {
  if (!homeReady || !activated || busy()) return;
  for (const e of entries.values()) if (e.near && nearCounts(e)) begin(e);       // sections that came near before the queue was allowed to run
  if (!conserve()) for (const e of entries.values()) {
    const before = entries.get(ORDER[ORDER.indexOf(e.id) - 1]);  // downloads overlap the scene before, so they are there when the turn comes
    if (e.prefetch && !e.prefetched && (oneStep() ? isNextUp(e) : !before || before.started)) { e.prefetched = true; e.prefetch(); }
  }
  if (scheduled) return;
  const next = nextScene();
  if (!next) return;   // all done, still preparing, or not needed yet
  scheduled = true;
  idle(() => {
    scheduled = false;
    if (isQuiet() || busy()) { setTimeout(pump, 300); return; }      // a visible scene is calibrating its quality, or the visitor is waiting for another: start nothing new yet
    if (nextScene() === next) begin(next);
    pump();
  });
}

const INTENT = ['scroll', 'wheel', 'touchstart', 'pointerdown'];   // a key that moves the page arrives as a scroll; a nav link activates through prioritizeScene
function activate() {
  if (activated) return;
  activated = true;
  for (const t of INTENT) window.removeEventListener(t, activate, true);
  pump();
}
function listen() {
  if (listening) return;
  listening = true;
  listenForInput();
  // a restored scroll position or a link to a section counts: the visitor is already past Home
  if (window.scrollY > 0 || window.location.hash) { activated = true; return; }
  for (const t of INTENT) window.addEventListener(t, activate, { capture: true, passive: true });
}
function listenForInput() {
  for (const t of ['scroll', 'wheel', 'touchmove']) window.addEventListener(t, noteInput, { capture: true, passive: true });
}

export function registerScene(id, { start, prefetch } = {}) {
  const e = { id, start, prefetch, started: false, ready: false, near: false, prefetched: false, visible: false, seenAt: 0 };
  entries.set(id, e);
  listen();
  if (id === 'home') {
    if (LINKED) { homeWaiting = e; setTimeout(startHome, FOCUS_MS); } else begin(e);
  } else if (!entries.has('home')) homeReady = true;   // a page without Home (standalone previews): no gate
  const el = document.getElementById(id), index = ORDER.indexOf(id);
  const seen = el && new IntersectionObserver(([en]) => {
    e.visible = en.isIntersecting;
    if (e.visible) {
      e.seenAt = performance.now();
      if (e === focused && performance.now() < navUntil) { clearTimeout(navTimer); navUntil = 0; }   // the jump's destination has arrived
    }
    clearTimeout(seenTimer); seenTimer = setTimeout(refocus, 400);   // a section only scrolled past does not take over
  }, { rootMargin: '-1px 0px' });        // a section merely touching the viewport's edge has not been reached
  if (seen) seen.observe(el);
  if (id === LINKED) prioritizeScene(id);   // registered after the jump to it was made: start it now
  // the section crossing the middle of the screen is the one the visitor is on: one-step devices prepare the next one after it
  const middle = el && new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { active = index; pump(); }
  }, { rootMargin: '-50% 0px -50% 0px' });
  if (middle) middle.observe(el);
  pump();
  return {
    // the scene is usable (or failed): let the queue continue
    ready() {
      if (e.ready) return; e.ready = true;
      if (id === 'home') homeReady = true;
      if (focused === e) setFocused(null);
      if (e.visible) { fadeUntil = performance.now() + FADE_MS; setTimeout(pump, FADE_MS); }
      settled(id, e.visible ? FADE_MS : 0);
      refocus();
      pump();
    },
    // the visitor is about to reach this section: start now, unless they have not moved yet (Profile always sits within a screen
    // of Home, so "near" alone is not a reason to build it)
    urgent() { e.near = true; if (nearCounts(e) && activated && (homeReady || window.scrollY > 0) && !busy()) begin(e); },
    unregister() { if (seen) seen.disconnect(); if (middle) middle.disconnect(); if (focused === e) setFocused(null); if (entries.get(id) === e) entries.delete(id); pump(); },
  };
}

/** Resolves once the section's scene is ready (or has failed). */
export function whenSceneReady(id) {
  const e = entries.get(id);
  if (e && e.ready) return Promise.resolve();
  return new Promise((res) => { if (!waiters.has(id)) waiters.set(id, []); waiters.get(id).push(res); });
}

// Calls onNear() once the element has stayed within one viewport of the screen for `dwell` ms (0: as soon as it is).
export function whenNear(el, onNear, dwell = 400) {
  let timer = 0;
  const io = new IntersectionObserver(([en]) => {
    clearTimeout(timer);
    if (en.isIntersecting) timer = setTimeout(() => { io.disconnect(); onNear(); }, dwell);
  }, { rootMargin: '100% 0px' });
  io.observe(el);
  return () => { clearTimeout(timer); io.disconnect(); };
}
