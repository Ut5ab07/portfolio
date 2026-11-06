// Builds everything the GPU needs from the dune field, off the main thread (see terrain.worker.js):
//   - a view-adapted mesh: rows spaced geometrically in depth (dense at the foreground, coarse at the horizon — a continuous
//     level of detail), columns spread to the frustum width at each depth;
//   - baked light for the fixed low sun, in three cascades (near / middle / far): soft cast shadows from a horizon sweep along
//     the sun direction (penumbra grows with distance from the occluder) and a cavity/ambient-occlusion term;
//   - crest samples where wind lifts sand off the dunes.
import { heightAt, heroCrests, SUN, SUN_U, WIND } from './duneField';

// Whole build in one call (main-thread fallback), or one independent job per worker so the cores share the work:
//   { job: 'mesh' } → mesh + crests;  { job: 'light', index } → one baked-light cascade.
export function buildTerrain(o) {
  const r = buildMesh(o); r.cascades = o.cascades.map(bakeLight); r.height = bakeHeight(o.height); return r;
}
export function runJob(o) {
  if (o.job === 'light') return { job: 'light', index: o.index, cascade: bakeLight(o.cascades[o.index]) };
  if (o.job === 'height') return { job: 'height', height: bakeHeight(o.height) };
  return Object.assign({ job: 'mesh' }, buildMesh(o));
}
// Height field of the near and middle ground, sampled by the wind-blown sand so the grains skim the real dune surface.
function bakeHeight(h) {
  const { x0, z0, size, res } = h, data = new Float32Array(res * res);
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) data[i * res + j] = heightAt(x0 + (j + 0.5) / res * size, z0 + (i + 0.5) / res * size);
  return { x0, z0, size, res, data };
}
function buildMesh(o) {
  const t0 = Date.now();
  const { rows, cols, near, far, tanH, originZ } = o;
  const N = rows * cols, pos = new Float32Array(N * 3), nor = new Float32Array(N * 3);
  const lnr = Math.log(far / near);
  for (let i = 0; i < rows; i++) {
    const d = near * Math.exp(lnr * i / (rows - 1)), z = originZ - d, half = d * tanH + 60;
    for (let j = 0; j < cols; j++) {
      const s = j / (cols - 1) * 2 - 1, x = Math.sign(s) * Math.pow(Math.abs(s), 1.25) * half;   // a little denser at the centre
      const k = (i * cols + j) * 3; pos[k] = x; pos[k + 1] = heightAt(x, z); pos[k + 2] = z;
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = (i * cols + Math.max(j - 1, 0)) * 3, b = (i * cols + Math.min(j + 1, cols - 1)) * 3;
    const c = (Math.max(i - 1, 0) * cols + j) * 3, e = (Math.min(i + 1, rows - 1) * cols + j) * 3;
    const tx = pos[b] - pos[a], ty = pos[b + 1] - pos[a + 1], tz = pos[b + 2] - pos[a + 2];
    const ux = pos[e] - pos[c], uy = pos[e + 1] - pos[c + 1], uz = pos[e + 2] - pos[c + 2];
    let nx = uy * tz - uz * ty, ny = uz * tx - ux * tz, nz = ux * ty - uy * tx; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const l = Math.hypot(nx, ny, nz) || 1, k = (i * cols + j) * 3; nor[k] = nx / l; nor[k + 1] = ny / l; nor[k + 2] = nz / l;
  }
  const idx = new Uint32Array((rows - 1) * (cols - 1) * 6); let q = 0;
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c;   // counter-clockwise seen from above
  }
  return { pos, nor, idx, crests: Float32Array.from(findCrests(o.crestStep || 5).flat()), ms: Date.now() - t0 };
}

// Sun-aligned grid: axis U (SUN_U) points horizontally towards the sun, V across it.
const TAN_E = SUN[1] / Math.hypot(SUN[0], SUN[2]);

function bakeLight({ cx, cz, size, res, aoRadius }) {
  const h = new Float32Array(res * res), U = SUN_U, V = [-U[1], U[0]], step = size / (res - 1);
  for (let iv = 0; iv < res; iv++) for (let iu = 0; iu < res; iu++) {
    const a = (iu / (res - 1) - 0.5) * size, b = (iv / (res - 1) - 0.5) * size;
    h[iv * res + iu] = heightAt(cx + U[0] * a + V[0] * b, cz + U[1] * a + V[1] * b);
  }
  const out = new Uint8Array(res * res * 4), drop = step * TAN_E, spread = Math.tan(2.2 * Math.PI / 180);   // dusty sun ≈ 2° disc
  for (let iv = 0; iv < res; iv++) {
    let env = -1e9, dist = 0;
    for (let iu = res - 1; iu >= 0; iu--) {             // march away from the sun; env = height of the shadow envelope
      const k = iv * res + iu, hh = h[k]; env -= drop; dist += step;
      const depth = env - hh, pen = 0.35 + dist * spread;
      out[k * 4] = Math.round(255 * (1 - smooth(-pen, pen, depth)));
      if (hh >= env) { env = hh; dist = 0; }
    }
  }
  // cavity AO: how far a cell sits below the local mean height (separable box blur of the heightfield)
  const r = Math.max(1, Math.round(aoRadius / step)), tmp = new Float32Array(res * res), avg = new Float32Array(res * res);
  for (let iv = 0; iv < res; iv++) { let s = 0; for (let iu = -r; iu <= r; iu++) s += h[iv * res + clampI(iu, res)];
    for (let iu = 0; iu < res; iu++) { tmp[iv * res + iu] = s / (2 * r + 1); s += h[iv * res + clampI(iu + r + 1, res)] - h[iv * res + clampI(iu - r, res)]; } }
  for (let iu = 0; iu < res; iu++) { let s = 0; for (let iv = -r; iv <= r; iv++) s += tmp[clampI(iv, res) * res + iu];
    for (let iv = 0; iv < res; iv++) { avg[iv * res + iu] = s / (2 * r + 1); s += tmp[clampI(iv + r + 1, res) * res + iu] - tmp[clampI(iv - r, res) * res + iu]; } }
  for (let k = 0; k < res * res; k++) { const cav = Math.max(0, avg[k] - h[k]) / (aoRadius * 0.45); out[k * 4 + 1] = Math.round(255 * clampF(1 - cav, 0.25, 1)); out[k * 4 + 3] = 255; }
  return { data: out, cx, cz, size, res };
}
function clampI(i, n) { return i < 0 ? 0 : i >= n ? n - 1 : i; }
function clampF(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(a, b, v) { const t = clampF((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

// Crest cells of the whole field: local maxima along the wind direction with a steep drop on the lee side.
function findCrests(step) {
  const out = heroCrests(step);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 9000 && out.length < 900; n++) {
    const d = 160 + rnd() * 1300, ang = (rnd() - 0.5) * 1.3, x = Math.sin(ang) * d, z = -Math.cos(ang) * d;
    const h0 = heightAt(x, z), up = heightAt(x - WIND[0] * 3, z - WIND[1] * 3), dn = heightAt(x + WIND[0] * 6, z + WIND[1] * 6);
    if (h0 > up + 0.15 && h0 - dn > 2.4 && h0 > 6) out.push([x, h0, z, Math.min(30, h0 - dn)]);
  }
  return out;
}
