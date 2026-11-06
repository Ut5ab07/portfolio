// Device-adaptive render resolution, shared by every scene.
//
// Each scene starts at the screen's own pixel density (up to the scene's cap) with every effect on. While it is on screen this
// measures what a frame actually costs on this device and, if it is over budget, lowers only the internal render resolution,
// in small steps and never below a floor; with headroom it climbs back. Effects, geometry, fog, shadows and particles are never
// switched off, the canvas keeps its CSS size and the camera its framing: the browser scales the image to the page.
//
// Measurement: GPU time per frame from EXT_disjoint_timer_query_webgl2 where the browser offers it (precise and unaffected by
// main-thread work, so it can adjust both ways at any time); otherwise the median frame interval, taken only while the scene is
// calibrating (background preparation of other scenes is held back meanwhile), and only ever downward.
import { quiet } from './quiet';

const TIME_ELAPSED = 0x88bf, GPU_DISJOINT = 0x8fbb, QUERY_RESULT = 0x8866, QUERY_RESULT_AVAILABLE = 0x8867;
const BUDGET = 13.5;          // ms of GPU per frame: leaves room for the compositor and the rest of the page within 16.7 ms
const SLOW_FRAME = 18.5;      // ms between frames that means a 60 Hz display is missing frames
const round = (x) => Math.round(x * 20) / 20;

// Where the last scene settled, as a fraction of its starting pixel ratio. A new scene starts there instead of at full
// density: on a device where the scenes need ~0.8x, entering the next one does not re-allocate its buffers mid-scroll (a
// ~90 ms freeze for a scene with post-processing). Kept for the browsing session, so a reload starts right too.
const KEY = 'pf-render-scale';
let lastScale = (() => { try { const v = +sessionStorage.getItem(KEY); return v > 0.3 && v <= 1 ? v : 1; } catch (e) { return 1; } })();
function remember(f) { lastScale = f; try { sessionStorage.setItem(KEY, f.toFixed(3)); } catch (e) { /* storage unavailable */ } }

/**
 * Whether this device is genuinely constrained, from what it reports about itself rather than from its screen size: a phone
 * with a modern GPU builds the same scenes as a desktop. Constrained = at most 2 GB of memory (where the browser reports it),
 * at most 2 CPU cores, or a GPU limited to small textures. Scenes use it only for build-time sizes (texture and mesh
 * resolution, instance counts); everything else adapts at run time through createRenderScale.
 */
let constrained = null;
export function isConstrainedDevice(R) {
  if (constrained !== null) return constrained;
  const mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
  const maxTex = R && R.capabilities ? R.capabilities.maxTextureSize : 4096;
  constrained = (mem !== undefined && mem <= 2) || (cores !== undefined && cores <= 2) || maxTex < 4096;
  return constrained;
}

/**
 * createRenderScale(renderer, { cap, floor, apply })
 *   cap   : highest pixel ratio for this scene (default 1.5)
 *   floor : lowest pixel ratio it may drop to (default: 80 % of 1x on standard screens, 60 % of the start on dense ones)
 *   apply : (pixelRatio) => void, sets the renderer's pixel ratio and re-sizes its targets
 * Per frame: frame(now, partial) before rendering, then gpuBegin() / gpuEnd() around the frame's GPU work; partial = only part
 * of the frame is being drawn (createViewClip), so it is not a measure of a full frame and is skipped.
 * resume() when the loop restarts after a pause (the gap is not a frame). dispose() releases the queries.
 */
export function createRenderScale(R, { cap = 1.5, floor, apply } = {}) {
  const base = Math.min(window.devicePixelRatio || 1, cap);
  const lo = Math.min(base, floor != null ? floor : Math.max(base * 0.6, Math.min(base, 1) * 0.8));
  let pr = round(Math.max(lo, base * lastScale));
  const gl = R.getContext();
  const ext = R.capabilities.isWebGL2 ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;

  // ---- GPU timer path ----
  const pending = [], free = [], gpu = [];
  let open = null, wentDown = false, lowWindows = 0;
  // Results arrive a few frames late. Query availability is asynchronous in browsers, but reading GPU_DISJOINT is a synchronous
  // round trip to the GPU process, so it is read once per batch of results (and only when there are any), never per query.
  function poll() {
    let n = 0;
    while (n < pending.length && gl.getQueryParameter(pending[n], QUERY_RESULT_AVAILABLE)) n++;
    if (!n) return;
    const disjoint = gl.getParameter(GPU_DISJOINT);
    for (const q of pending.splice(0, n)) { if (!disjoint) gpu.push(gl.getQueryParameter(q, QUERY_RESULT) / 1e6); free.push(q); }
  }

  // ---- frame-interval path ----
  let last = 0, seen = 0, steps = 0, settled = false, triedUp = false;
  const iv = [];

  let skip = 15;                       // frames to ignore after a start, a resume or a change (uploads, re-allocation)
  function set(next) {
    next = round(Math.min(base, Math.max(lo, next)));
    if (Math.abs(next - pr) < 0.04) return false;
    pr = next; apply(pr); skip = 15; gpu.length = 0; iv.length = 0; seen = 0;
    remember(pr / base);
    return true;
  }

  return {
    get pixelRatio() { return pr; },
    get base() { return base; },
    get measured() { return ext ? 'gpu' : 'frames'; },
    resume() { last = 0; skip = Math.max(skip, 8); gpu.length = 0; iv.length = 0; seen = 0; },
    frame(now, partial = false) {
      if (partial) { gpu.length = 0; last = 0; return; }
      if (ext) {
        poll();
        if (skip > 0) { skip--; gpu.length = 0; return; }
        if (gpu.length < 30) return;
        const s = gpu.splice(0).sort((a, b) => a - b), g = s[s.length >> 1];
        if (g > BUDGET * 1.08 && pr > lo) { wentDown = true; lowWindows = 0; set(pr * Math.max(0.8, Math.min(0.94, Math.sqrt(BUDGET / g)))); }
        else if (g < BUDGET * 0.6 && pr < base) {
          // climb back only with clear headroom twice in a row, and never straight after having had to come down from there
          if (++lowWindows >= 2) { lowWindows = 0; if (!wentDown || g < BUDGET * 0.45) set(pr * Math.min(1.15, Math.sqrt((BUDGET * 0.85) / g))); }
        } else lowWindows = 0;
        return;
      }
      if (settled) return;
      quiet(250);
      if (last && ++seen > skip) iv.push(now - last);
      last = now;
      if (iv.length < 45) return;
      const s = iv.splice(0).sort((a, b) => a - b), m = s[s.length >> 1];
      seen = 0;
      if (m > SLOW_FRAME && pr > lo && steps < 4) { steps++; set(pr * 0.86); }
      // started below full density (inherited from the previous scene) and keeping up: try one step back up, once
      else if (m < 17.5 && pr < base && !triedUp && !steps) { triedUp = true; set(pr / 0.86); }
      else settled = true;
    },
    gpuBegin() { if (!ext || open) return; open = free.pop() || gl.createQuery(); gl.beginQuery(TIME_ELAPSED, open); },
    gpuEnd() { if (!open) return; gl.endQuery(TIME_ELAPSED); pending.push(open); open = null; },
    dispose() { if (open) { gl.endQuery(TIME_ELAPSED); open = null; } for (const q of pending.concat(free)) gl.deleteQuery(q); pending.length = free.length = 0; },
  };
}

/**
 * createViewClip(renderer, canvas, { margin }) — while a scene's canvas is only partly on screen (a section scrolling in or
 * out, with its neighbour also rendering), draw only the band that is visible, plus a margin above and below for scrolling that
 * runs ahead of the page's scripts. Pixels inside the band are exactly what a full render produces; the rest is off screen.
 * The visible band comes from an IntersectionObserver (no layout reads per frame). Call update() before each render; it
 * returns whether this frame is clipped.
 */
const STEPS = Array.from({ length: 41 }, (_, i) => i / 40);
export function createViewClip(R, canvas, { margin = 0.3 } = {}) {
  let top = 0, bottom = 1, on = false;            // visible band, as fractions of the canvas height (0 = its top edge)
  const io = new IntersectionObserver(([e]) => {
    const h = e.boundingClientRect.height;
    if (!h || !e.isIntersecting) { top = 0; bottom = 1; return; }
    top = (e.intersectionRect.top - e.boundingClientRect.top) / h; bottom = top + e.intersectionRect.height / h;
  }, { threshold: STEPS });
  io.observe(canvas);
  return {
    update() {
      const m = margin * window.innerHeight / Math.max(1, canvas.clientHeight);
      const t = Math.max(0, top - m), b = Math.min(1, bottom + m);
      const clip = b - t < 0.999;
      if (clip) { const H = canvas.clientHeight, W = canvas.clientWidth; R.setScissor(0, (1 - b) * H, W, (b - t) * H); }
      if (clip !== on) { on = clip; R.setScissorTest(clip); }
      return clip;
    },
    get partial() { return on; },
    dispose() { io.disconnect(); if (on) R.setScissorTest(false); },
  };
}
