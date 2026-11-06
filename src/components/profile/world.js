// The Contact Zone landscape: one height function shared by the terrain mesh and the placement of every object, and the
// layout of the alien structure, the research outpost and the observation equipment. World units are metres; the camera
// stands on a low rise at the origin and looks down -z across a wide valley toward the structure.

export const SHELL = { x: -180, y: 410, z: -2600, w: 150, h: 335, t: 56, rot: 0.55 };   // centre, half extents, yaw
export const PAD = { x: -40, z: -410, y: 1.2 };                                          // flattened ground under the outpost
export const SUN = (() => {                                                               // low, hidden behind the overcast
  const az = 20 * Math.PI / 180, el = 16 * Math.PI / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
})();

// ---- deterministic value noise ----
function hash(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vn(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, o) {
  let s = 0, a = 0.5, n = 0;
  for (let k = 0; k < o; k++) { s += a * vn(x, z); n += a; const nx = x * 1.6 + z * 1.2 + 7.1; z = -x * 1.2 + z * 1.6 + 3.3; x = nx; a *= 0.5; }
  return s / n;
}
function ridged(x, z, o) {
  let s = 0, a = 0.5, n = 0;
  for (let k = 0; k < o; k++) { let r = 1 - Math.abs(2 * vn(x, z) - 1); r *= r; s += a * r; n += a; const nx = x * 1.7 + z * 1.1 + 2.3; z = -x * 1.1 + z * 1.7 + 5.9; x = nx; a *= 0.5; }
  return s / n;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// The access track from the observation post down to the outpost (the terrain shader draws the same curve).
export const pathX = (z) => 4 - 44 * smooth(-25, -390, z) + 9 * Math.sin(z * 0.011);

export function heightAt(x, z) {
  let h = 28 * Math.exp(-((x - 6) ** 2 + (z - 30) ** 2) / (2 * 125 * 125));               // the rise the camera stands on
  h += (fbm(x * 0.0035, z * 0.0035, 4) - 0.5) * 16 + (fbm(x * 0.03, z * 0.03, 2) - 0.5) * 1.6;  // meadow undulation
  h += 190 * Math.exp(-((x + 1900) ** 2) / (2 * 700 * 700) - ((z + 1500) ** 2) / (2 * 900 * 900));   // hills framing the valley
  h += 150 * Math.exp(-((x - 1700) ** 2) / (2 * 650 * 650) - ((z + 1100) ** 2) / (2 * 800 * 800));
  const m = smooth(2700, 6500, Math.hypot((x + 180) * 0.75, z + 2600));                    // the mountain ring round the valley
  if (m > 0) h += m * (150 + 1500 * ridged(x * 0.00032 + 3.1, z * 0.00032 + 1.7, 5) * (0.55 + 0.45 * fbm(x * 0.0002, z * 0.0002, 2)));
  const pad = smooth(330, 200, Math.hypot(x - PAD.x, z - PAD.z));                           // level pad for the outpost
  h += (PAD.y - h) * pad * 0.9;
  if (z < -15 && z > -430) h -= 0.25 * smooth(4, 2, Math.abs(x - pathX(z)));               // the track sits a little low
  return h;
}

// ---- the research outpost and the observation equipment ----
// Parts: { k: 'box' | 'prism' | 'cyl', x, z, y (base, metres above ground, default 0), w, h, d, ry (yaw), rx, rz (tilt), c: albedo, e: emissive }
const CANVAS = [0.46, 0.47, 0.46], WHITE = [0.5, 0.51, 0.5], OLIVE = [0.15, 0.16, 0.14], GREY = [0.26, 0.27, 0.27];
const STEEL = [0.18, 0.19, 0.2], DARK = [0.07, 0.075, 0.08], LAMP = [1.0, 0.86, 0.66];

export function outpostParts() {
  const P = [], L = [];                               // parts, lamp glows { x, y, z, s (size m), i (intensity) }
  const box = (x, z, w, h, d, c, o = {}) => P.push(Object.assign({ k: 'box', x, z, w, h, d, c }, o));

  // three large field tents (hangars), long side toward the structure
  [[-150, -600, 0.08], [-112, -640, 0.06], [-185, -665, 0.1]].forEach(([x, z, ry]) => {
    box(x, z, 18, 5, 34, CANVAS, { ry });
    P.push({ k: 'prism', x, z, y: 5, w: 18, h: 5.2, d: 34, ry, c: CANVAS });
  });
  // the command module: two stacked cabins with lit windows
  box(-20, -515, 13, 3, 6, WHITE, { ry: -0.05 });
  box(-20, -515, 13, 3, 6, WHITE, { y: 3, ry: -0.05 });
  for (let i = 0; i < 4; i++) box(-24.5 + i * 3, -511.95, 1.6, 0.9, 0.1, LAMP, { y: 4.4, ry: -0.05, e: 1.6 });
  for (let i = 0; i < 3; i++) box(-23 + i * 3.4, -511.95, 1.4, 0.8, 0.1, LAMP, { y: 1.4, ry: -0.05, e: i === 1 ? 1.3 : 0 });
  // a row of equipment containers and portable cabins
  for (let i = 0; i < 8; i++) {
    const c = i % 3 === 0 ? WHITE : i % 3 === 1 ? OLIVE : GREY;
    box(52 + (i % 2) * 0.6, -470 - i * 8.5, 2.5, 2.6, 6.1, c, { ry: Math.PI / 2 + 0.03 });
    if (i === 2 || i === 5) box(50.7, -470 - i * 8.5, 0.1, 0.7, 1.4, LAMP, { y: 1.3, e: 1.2 });
  }
  // vehicles parked by the command module
  for (let i = 0; i < 5; i++) box(-58 + i * 4.2, -470 - (i % 2) * 1.5, 2.2, 2.1 + (i % 2) * 0.5, 5.2, i % 2 ? GREY : OLIVE, { ry: 0.12 });
  // floodlight masts aimed at the structure
  [[-95, -500, 24], [92, -650, 26], [-205, -720, 22]].forEach(([x, z, h]) => {
    P.push({ k: 'cyl', x, z, w: 0.45, h, d: 0.45, c: STEEL });
    box(x, z - 0.6, 3.2, 1.2, 0.8, STEEL, { y: h - 0.4, rx: -0.3 });
    L.push({ x, y: h + 0.1, z: z - 1.1, s: 9, i: 0.9 });
  });
  // a lattice antenna tower
  const tx = 30, tz = -720, th = 36;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(tx + a * 1.6, tz + b * 1.6, 0.3, th, 0.3, STEEL, { rz: -a * 0.03, rx: b * 0.03 });
  for (let y = 3; y < th; y += 4) { box(tx, tz - 1.6, 3.4 - y * 0.05, 0.18, 0.18, STEEL, { y }); box(tx, tz + 1.6, 3.4 - y * 0.05, 0.18, 0.18, STEEL, { y }); }
  L.push({ x: tx, y: th + 0.6, z: tz, s: 3.2, i: 0.55 });
  // the forward observation platform and a dish aimed at the structure
  const ox = -34, oz = -265;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(ox + a * 3.6, oz + b * 3.6, 0.3, 5, 0.3, STEEL);
  box(ox, oz, 8.4, 0.35, 8.4, GREY, { y: 5 });
  box(ox - 1.2, oz + 1.2, 4.2, 2.6, 3.6, WHITE, { y: 5.35 });
  box(ox - 1.2, oz - 0.61, 2.6, 0.7, 0.08, LAMP, { y: 6.6, e: 1.4 });
  box(ox, oz - 4.1, 8.4, 1.0, 0.08, STEEL, { y: 5.35 });
  box(ox + 4.1, oz, 0.08, 1.0, 8.4, STEEL, { y: 5.35 });
  P.push({ k: 'cyl', x: 22, z: -300, w: 0.5, h: 4, d: 0.5, c: STEEL });
  P.push({ k: 'cyl', x: 22, z: -300.6, y: 4.2, w: 7, h: 0.5, d: 7, rx: 1.15, ry: -0.06, c: WHITE, seg: 20 });
  // the outpost was laid out 150 m further out; bring it (not the forward platform and dish) closer
  for (const p of P) if (p.z < -400) p.z += 150;
  for (const l of L) if (l.z < -400) l.z += 150;
  // small lamps along the access track
  for (let z = -60; z > -380; z -= 50) L.push({ x: pathX(z) + 2.6, y: 2.6, z, s: 1.3, i: 0.55, post: true });

  // foreground: a survey instrument on a tripod, its case, and a sensor mast
  const fx = 2.6, fz = -21;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.3;
    box(fx + Math.sin(a) * 0.38, fz + Math.cos(a) * 0.38, 0.045, 1.55, 0.045, DARK, { rx: -Math.cos(a) * 0.26, rz: Math.sin(a) * 0.26 });
  }
  box(fx, fz, 0.32, 0.26, 0.5, GREY, { y: 1.5, ry: 0.15 });
  P.push({ k: 'cyl', x: fx - 0.04, z: fz - 0.33, y: 1.63, w: 0.16, h: 0.34, d: 0.16, rx: Math.PI / 2 - 0.12, ry: 0.15, c: DARK, seg: 12 });
  box(fx + 1.25, fz + 1.1, 0.62, 0.36, 0.42, OLIVE, { ry: 0.5 });
  box(fx + 1.25, fz + 1.1, 0.64, 0.04, 0.44, STEEL, { y: 0.24, ry: 0.5 });
  P.push({ k: 'cyl', x: fx + 3.6, z: fz - 4.2, w: 0.07, h: 2.6, d: 0.07, c: STEEL, seg: 6 });
  box(fx + 3.6, fz - 4.2, 0.36, 0.22, 0.22, WHITE, { y: 2.45 });
  box(fx + 3.6, fz - 4.33, 0.16, 0.06, 0.02, LAMP, { y: 2.5, e: 0.9 });
  return { parts: P, lamps: L };
}
