// Shared pacing for background scene preparation (no three.js dependency, so the page's entry bundle can use it).
//
// While a visible scene is calibrating (timing its first frames to pick its render resolution, src/three/adaptive.js), background
// preparation of the other scenes waits, so it cannot make that scene look slower than it is. Calibration calls quiet(ms) on
// each of those frames.
let quietUntil = 0;
export function quiet(ms) { quietUntil = Math.max(quietUntil, performance.now() + ms); }
export function isQuiet() { return performance.now() < quietUntil; }

// Which scene the visitor is waiting for (set by src/navigation/sceneQueue.js). Preparation that names its scene pauses at its next
// step while another scene has this priority, or while the visitor is scrolling, and carries on from there afterward.
let focus = null, inputUntil = 0;
const owners = new WeakMap();
const ownerOf = (o) => {
  if (!o || typeof o === 'string') return o || null;
  if (!owners.has(o)) { const s = o.closest && o.closest('section'); owners.set(o, s ? s.id : null); }
  return owners.get(o);
};
export function setFocus(id) { focus = id; }
export function noteInput() { inputUntil = performance.now() + 200; }
export const hasFocus = (o) => !!focus && ownerOf(o) === focus;
const held = (o) => { const id = ownerOf(o); return !!id && id !== focus && (!!focus || performance.now() < inputUntil); };

// yield to the browser (input, rendering, other work) between preparation steps; waits out a quiet period. `owner` (the scene's
// canvas or section id) lets this step give way to the scene the visitor is waiting for.
export const nextTask = (owner) => new Promise((resolve) => {
  const go = () => {
    const d = quietUntil - performance.now();
    if (d > 0) setTimeout(go, d); else if (held(owner)) setTimeout(go, 100); else setTimeout(resolve, 0);
  };
  go();
});

// What a scene is doing right now, counted in real steps, for its loading mark (src/components/SceneLoader.jsx).
export const SCENE_PROGRESS = 'scene-progress';
export function reportProgress(canvas, stage, done, total) {
  canvas.dispatchEvent(new CustomEvent(SCENE_PROGRESS, { bubbles: true, detail: { stage, done, total } }));
}
