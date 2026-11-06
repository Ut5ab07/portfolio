// Arrakis dune field — the single source of truth for terrain height. Pure functions, no three.js, so the worker (mesh + baked
// light) and the main thread (wind-blown sand on crests) evaluate exactly the same landscape.
//
// The landscape is composed, not noise: two authored hero dunes (a near dune whose dark slip face holds the title, and a
// monumental ridge that leads the eye from the left middle ground towards the horizon) sit on a compound dune sea:
//   - megadunes (draas, 1.7 km wavelength, up to ~230 m) that form the layered silhouettes in the distance,
//   - two crossing transverse fields with asymmetric profiles (long windward slope, knife-edge crest, ~33° slip face),
//     sinuous crests from domain warping and crest breaks from amplitude modulation, merged with a smooth max into
//     star-like junctions instead of parallel waves,
//   - low swells and fine wind-carved ridging.
// Units are metres. Camera looks down -z from the origin; the sun stands low, front-right; the wind blows towards the
// camera's left, so crests cross the view diagonally and slip faces turn their shadowed side towards the viewer.

export const SUN = (() => { const az = 28 * Math.PI / 180, el = 8.5 * Math.PI / 180; return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]; })();
// horizontal axis pointing towards the sun (the baked-light grids are aligned to it)
export const SUN_U = (() => { const l = Math.hypot(SUN[0], SUN[2]); return [SUN[0] / l, SUN[2] / l]; })();
export const WIND = (() => { const x = -1, z = 0.45, l = Math.hypot(x, z); return [x / l, z / l]; })();   // direction the wind blows TO

// ---- value noise ---------------------------------------------------------------------------------------------------
function hash(ix, iy) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 - 9.7; a *= 0.5; }
  return s / n;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function smax(a, b, k) { const h = clamp(0.5 + 0.5 * (a - b) / k, 0, 1); return b + (a - b) * h + k * h * (1 - h); }

// ---- transverse dune field -----------------------------------------------------------------------------------------
// Phase runs downwind; each cycle = gentle concave windward rise to a sharp crest, then a near-linear slip face.
// `r` = crest rounding radius in metres; grows with distance so a crest never gets sharper than the mesh can carry (no stair-stepping).
function smin(a, b, k) { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
function field(x, z, f, r) {
  const dx = f.dir[0], dz = f.dir[1];
  const w = (fbm(x / f.warpScale + f.seed, z / f.warpScale - f.seed, 2) - 0.5) * 2 * f.warp;
  const a = (x * dx + z * dz) / f.lambda + w;
  const u = a - Math.floor(a);
  const rise = Math.pow(u / f.crest, 1.35), fall = Math.pow(Math.max(0, 1 - (u - f.crest) / (1 - f.crest)), 1.12);
  const p = Math.max(0, smin(rise, fall, Math.min(0.35, 5 * r / f.lambda)));
  const m = fbm(x / f.ampScale - f.seed * 0.7, z / f.ampScale + f.seed * 1.3, 2);
  return f.amp * p * (0.12 + 0.88 * smooth(0.3, 0.72, m));
}
function rot(v, deg) { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; }
const F_SMALL = { dir: WIND, lambda: 250, crest: 0.84, amp: 32, warp: 0.85, warpScale: 480, ampScale: 520, seed: 3.1 };
const F_CROSS = { dir: rot(WIND, 58), lambda: 420, crest: 0.8, amp: 44, warp: 0.75, warpScale: 820, ampScale: 760, seed: 11.7 };
const F_MEGA = { dir: rot(WIND, -18), lambda: 1500, crest: 0.8, amp: 340, warp: 0.5, warpScale: 2300, ampScale: 2100, seed: 23.3 };
// horizon range: the farthest, largest draas — layered, broken silhouettes that disappear into the dust
const F_RANGE = { dir: rot(WIND, 12), lambda: 2600, crest: 0.78, amp: 520, warp: 0.55, warpScale: 3800, ampScale: 3000, seed: 41.9 };

// ---- authored hero dunes -------------------------------------------------------------------------------------------
// Crest polylines [x, z, height]; `slip` = side (+1 left of travel direction, -1 right) that carries the steep slip face.
// Catmull-Rom densification: crests are smooth curves, never straight facets.
function spline(pts, n) {
  const out = [], P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) {
    const t = k / n, t2 = t * t, t3 = t2 * t, a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
    out.push([0, 1, 2].map((j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t3)));
  }
  out.push(pts[pts.length - 1]); return out;
}
// Points given as [azimuth°, distance, height] from the camera — composed in screen terms, stored in world xz.
function polar(pts) { return pts.map(([az, d, h]) => [Math.sin(az * Math.PI / 180) * d, -Math.cos(az * Math.PI / 180) * d, h]); }
const SUB = 8;
function dune(points, slip, windward, repose) {
  const coarse = [];
  for (let i = 0; i < points.length - 1; i++) { const [ax, az] = points[i], [bx, bz] = points[i + 1], ex = bx - ax, ez = bz - az; coarse.push({ ax, az, ex, ez, L2: ex * ex + ez * ez }); }
  points = spline(points, SUB);
  const segs = []; let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, maxH = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az, ah] = points[i], [bx, bz, bh] = points[i + 1], ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
    segs.push({ ax, az, ah, bh, ex, ez, L2, L: Math.sqrt(L2), s0: segs.length ? segs[segs.length - 1].s0 + segs[segs.length - 1].L : 0,
      x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz) });
  }
  points.forEach(([x, z, h]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z); maxH = Math.max(maxH, h); });
  const pad = Math.max(windward, maxH / repose) + 10;
  return { points, segs, coarse, slip, windward, repose, seed: points.length * 1.37, bb: [minx - pad, maxx + pad, minz - pad, maxz + pad] };
}
// near dune: crest runs across the lower left of the frame, its steep slip face turned to the camera (in shadow, behind the title)
const HERO_NEAR = dune([[-340, -60, 6], [-255, -100, 29], [-165, -126, 35], [-80, -140, 31], [-5, -165, 22], [55, -205, 12], [95, -265, 0]], 1, 240, 0.68);
// monumental ridge: enters high on the left, then a sinuous knife-edge falls away to the right, towards the sun and the horizon.
// Its sweep alternates between facing the sun (lit) and facing the camera (shadowed), so the crest reads as a light/dark seam.
const HERO_RIDGE = dune(polar([[-48, 430, 18], [-36, 520, 62], [-27, 610, 96], [-20, 700, 112], [-13, 790, 116], [-7, 930, 110], [-1, 1080, 100], [4, 1230, 92], [9, 1420, 80], [13, 1650, 66], [17, 1930, 50], [21, 2300, 30], [24, 2700, 8]]), 1, 300, 0.66);
const HEROES = [HERO_NEAR, HERO_RIDGE];

function heroHeight(x, z, d, r) {
  if (x < d.bb[0] || x > d.bb[1] || z < d.bb[2] || z > d.bb[3]) return 0;
  x += (noise(x / 70 + 1.7, z / 70) - 0.5) * 16; z += (noise(x / 70 - 4.1, z / 70 + 2.2) - 0.5) * 16;   // small crest sinuosity
  // coarse-to-fine: nearest control segment first, then only the spline pieces around it
  let cb = 1e18, ci = 0;
  for (let i = 0; i < d.coarse.length; i++) {
    const c = d.coarse[i], px = x - c.ax, pz = z - c.az, t = clamp((px * c.ex + pz * c.ez) / c.L2, 0, 1), qx = px - c.ex * t, qz = pz - c.ez * t, dd = qx * qx + qz * qz;
    if (dd < cb) { cb = dd; ci = i; }
  }
  const i0 = Math.max(0, (ci - 1) * SUB), i1 = Math.min(d.segs.length, (ci + 2) * SUB);
  let best = 1e18, side = 0, H = 0, endFade = 1;
  for (let i = i0; i < i1; i++) {
    const s = d.segs[i];
    const ox = x < s.x0 ? s.x0 - x : x > s.x1 ? x - s.x1 : 0, oz = z < s.z0 ? s.z0 - z : z > s.z1 ? z - s.z1 : 0;
    if (ox * ox + oz * oz >= best) continue;                                             // cannot beat the nearest so far
    const px = x - s.ax, pz = z - s.az;
    let t = (px * s.ex + pz * s.ez) / s.L2; const tc = clamp(t, 0, 1);
    const qx = px - s.ex * tc, qz = pz - s.ez * tc, dd = qx * qx + qz * qz;
    if (dd < best) {
      best = dd; side = s.ex * pz - s.ez * px > 0 ? 1 : -1; H = s.ah + (s.bh - s.ah) * tc;
      const arc = s.s0 + s.L * tc; H *= 0.86 + 0.28 * noise(arc / 140 + d.seed, d.seed);       // peaks and saddles along the crest
      endFade = (i === 0 && t < 0) || (i === d.segs.length - 1 && t > 1) ? 0.6 : 1;       // rounded horns at the ends
    }
  }
  const dist = Math.sqrt(best + r * r) - r;                                          // rounded crest of radius ~r
  // gentle, slightly concave windward flank; near-linear slip face at the angle of repose with a rounded toe
  const prof = side === d.slip ? Math.max(0, 1 - dist * d.repose / H * endFade) : Math.pow(Math.max(0, 1 - dist / d.windward), 1.6);
  return H * Math.pow(prof, side === d.slip ? 1.08 : 1);
}

// ---- terrain height -------------------------------------------------------------------------------------------------
export function heightAt(x, z) {
  // camera vantage + immediate foreground stay low so the near dune reads as the first big form
  const dCam = Math.hypot(x * 0.8, z + 20);
  const nearCalm = smooth(60, 230, dCam);
  const far = smooth(-500, -2600, z);                                                   // 0 near the camera → 1 deep in the field

  const r = 0.4 + Math.hypot(x, z) * 0.0068;                                             // LOD crest rounding (≈ mesh spacing)
  const swell = (fbm(x / 1400 + 5.2, z / 1400 - 3.3, 3) - 0.5) * 34;
  const mega = smax(field(x, z, F_MEGA, r) * (0.1 + 0.9 * smooth(-900, -3400, z)), field(x, z, F_RANGE, r) * smooth(-2600, -5200, z), 40);
  const small = smax(field(x, z, F_SMALL, r), field(x, z, F_CROSS, r) * 0.9, 9);
  const scale = (0.35 + 0.65 * nearCalm) * (1 - 0.35 * far);                            // superimposed dunes shrink with distance

  let h = swell + mega + small * scale;
  // carved ridging: small, wind-aligned
  const rib = Math.abs(noise((x * WIND[0] + z * WIND[1]) / 38 + 3.3, (z * WIND[0] - x * WIND[1]) / 140) - 0.5);
  h += (0.5 - rib) * 1.4 * nearCalm * (1 - smooth(120, 320, Math.hypot(x, z)));   // foreground only
  for (let i = 0; i < HEROES.length; i++) { const hh = heroHeight(x, z, HEROES[i], r); if (hh > 0) h = smax(h, hh + swell * 0.4, 6); }
  return h * (0.15 + 0.85 * smooth(25, 110, dCam)) - 4;
}

// Crest samples for the wind-blown sand: the two hero crests, plus crest cells found in the procedural field.
export function heroCrests(step) {
  const out = [];
  HEROES.forEach((d) => d.segs.forEach((s, i) => {
    const n = Math.max(1, Math.round(s.L / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, x = s.ax + s.ex * t, z = s.az + s.ez * t, hw = s.ah + (s.bh - s.ah) * t;
      if (hw > 8) out.push([x, heightAt(x, z), z, hw]);
    }
  }));
  return out;
}
