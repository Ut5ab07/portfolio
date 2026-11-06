import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { nextTask } from '../../three/quiet';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Third-party assets (all CC0, from Poly Haven; see public/stack-assets/LICENSES.md) are served from <base>/stack-assets/.
// The base is Vite's BASE_URL, so the same code works in the portfolio ('/') and in the standalone build ('./').
const BASE = ((import.meta.env && import.meta.env.BASE_URL) || '/') + 'stack-assets/';

// Everything the scene loads. Downloading, decoding and parsing need no renderer, so they can start early (prefetchStackAssets,
// called by the loading queue while the visitor is still on earlier sections); the scene then picks the results up from here.
export const STACK_ASSETS = {
  pbr: ['rubber_tiles', 'metal_plate', 'cracked_red_ground'],
  hdri: ['empty_warehouse_01'],
  models: ['modular_airduct_rectangular_01', 'modular_airduct_circular_01', 'modular_industrial_pipes_01', 'industrial_wall_lamp',
    'security_camera_01', 'metal_tool_chest', 'rock_07', 'rock_09', 'namaqualand_boulder_02'],
};
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) { const p = make(); cache.set(key, p); p.catch(() => cache.delete(key)); } return cache.get(key); };
let tl, gl, hl;
const loaders = () => { if (!tl) { tl = new THREE.TextureLoader(); gl = new GLTFLoader(); hl = new RGBELoader().setDataType(THREE.UnsignedByteType); } };
const loadTex = (url) => once(url, () => new Promise((res, rej) => { loaders(); tl.load(url, res, undefined, rej); }));

// Binary files (.bin geometry, .hdr) are also published gzip-compressed by the portfolio build (vite.config.js), because most
// static hosts send application/octet-stream uncompressed: fetch the .gz and inflate it in the browser (DecompressionStream);
// fall back to the plain file when that is not possible or the host has already decoded it.
/* global __STACK_GZ__ */
const GZ = typeof __STACK_GZ__ !== 'undefined' && __STACK_GZ__ && typeof DecompressionStream === 'function';
async function fetchBinary(url) {
  if (GZ) {
    try {
      const r = await fetch(url + '.gz');
      if (r.ok) {
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf[0] !== 0x1f || buf[1] !== 0x8b) return buf.buffer;                 // already decoded on the way
        return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      }
    } catch { /* fall back to the plain file */ }
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.arrayBuffer();
}
const blobUrl = async (url) => URL.createObjectURL(new Blob([await fetchBinary(url)]));
// Some models list the same image file and sampler as separate textures for separate materials, and the loader would then decode and
// upload the image once for each. Materials point at the first one instead: same pixels, one copy on the GPU.
function shareTextures(json) {
  const first = new Map(), to = (json.textures || []).map((t, i) => {
    const k = `${json.images[t.source].uri}/${t.sampler}`;
    if (!first.has(k)) first.set(k, i);
    return first.get(k);
  });
  const fix = (info) => { if (info) info.index = to[info.index]; };
  for (const m of json.materials || []) {
    const p = m.pbrMetallicRoughness || {};
    [p.baseColorTexture, p.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture, m.emissiveTexture].forEach(fix);
  }
}
const loadModel = (slug) => once('m:' + slug, async () => {
  loaders();
  const dir = `${BASE}models/${slug}/`, r = await fetch(`${dir}${slug}.gltf`);
  if (!r.ok) throw new Error(`${slug}.gltf: HTTP ${r.status}`);
  const json = await r.json();
  shareTextures(json);
  const urls = await Promise.all((json.buffers || []).map(async (b) => (b.uri && !/^data:/.test(b.uri) ? (b.uri = await blobUrl(dir + b.uri)) : null)));
  try { return await new Promise((res, rej) => gl.parse(JSON.stringify(json), dir, (g) => res(g.scene), rej)); }
  finally { urls.forEach((u) => u && URL.revokeObjectURL(u)); }
});
const loadHdr = (name) => once('h:' + name, async () => {
  loaders();
  const u = await blobUrl(`${BASE}hdri/${name}_1k.hdr`);
  try { return await new Promise((res, rej) => hl.load(u, res, undefined, rej)); } finally { URL.revokeObjectURL(u); }
});

// download and parse every asset (one request after another per type, so the page's own requests are not crowded out)
export function prefetchStackAssets() {
  const jobs = [
    ...STACK_ASSETS.pbr.flatMap((slug) => ['diff', 'nor', 'arm'].map((f) => () => loadTex(`${BASE}textures/${slug}/${f}.jpg`))),
    ...STACK_ASSETS.hdri.map((n) => () => loadHdr(n)),
    ...STACK_ASSETS.models.map((m) => () => loadModel(m)),
  ];
  const lanes = [0, 1, 2].map(() => Promise.resolve());   // three requests in flight at a time
  jobs.forEach((job, i) => { lanes[i % 3] = lanes[i % 3].then(() => nextTask('stack')).then(job).catch(() => {}); });
  return Promise.all(lanes);
}

export function createLoaders(renderer, disposables) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // a PBR texture set: diff (sRGB), nor (OpenGL normal), arm (AO / roughness / metalness packed in R / G / B)
  function pbr(slug, repeat = 1) {
    const load = (f, srgb) => loadTex(`${BASE}textures/${slug}/${f}.jpg`).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = aniso;
      if (srgb) t.encoding = THREE.sRGBEncoding; disposables.push(t); return t;
    });
    return Promise.all([load('diff', true), load('nor', false), load('arm', false)]).then(([map, normalMap, arm]) => ({ map, normalMap, arm }));
  }
  function model(slug) {
    return loadModel(slug).then((scene) => {
      scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = o.receiveShadow = true; disposables.push(o.geometry);
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) { disposables.push(m); for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) if (m[k]) { m[k].anisotropy = aniso; disposables.push(m[k]); } }
        }
      });
      return scene;
    });
  }
  function hdri(name) {
    return loadHdr(name).then((t) => { disposables.push(t); return t; });
  }
  return { pbr, model, hdri };
}

// ---- procedural surface textures (canvas) ----
// height field -> tangent-space normal map
function heightToNormal(h, w, hh, strength) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const x = c.getContext('2d'), img = x.createImageData(w, hh);
  const H = (i, j) => h[((j + hh) % hh) * w + ((i + w) % w)];
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) {
    const dx = (H(i + 1, j) - H(i - 1, j)) * strength, dy = (H(i, j + 1) - H(i, j - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), k = (j * w + i) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// brushed metal: fine streaks along one axis
export function brushedNormal() {
  const w = 256, h = 256, f = new Float32Array(w * h), R = rnd(7);
  const rows = new Float32Array(h); for (let j = 0; j < h; j++) rows[j] = R();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) f[j * w + i] = rows[j] * 0.6 + R() * 0.08 + Math.sin(i * 0.05 + rows[j] * 6) * 0.05;
  return heightToNormal(f, w, h, 1.2);
}
// woven upholstery fabric
export function fabricNormal() {
  const w = 128, h = 128, f = new Float32Array(w * h), R = rnd(3);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const a = Math.sin(i * Math.PI / 2) * 0.5 + 0.5, b = Math.sin(j * Math.PI / 2) * 0.5 + 0.5;
    f[j * w + i] = ((((i >> 1) + (j >> 1)) & 1) ? a : b) + R() * 0.15;
  }
  return heightToNormal(f, w, h, 1.6);
}
// perforated metal / mesh: round holes on a staggered grid (alpha map: white = solid)
export function perforated(holes = 10) {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); x.fillStyle = '#000';
  const step = s / holes, r = step * 0.3;
  for (let j = 0; j < holes; j++) for (let i = 0; i < holes; i++) { x.beginPath(); x.arc((i + (j % 2) * 0.5 + 0.25) * step, (j + 0.5) * step, r, 0, 6.29); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// fine surface grain for laminates and painted composite: low-amplitude noise
export function grainNormal(seed = 11, strength = 0.6) {
  const w = 256, h = 256, f = new Float32Array(w * h), R = rnd(seed);
  for (let i = 0; i < f.length; i++) f[i] = R();
  for (let pass = 0; pass < 2; pass++) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {         // soften to a mottle
    const k = j * w + i; f[k] = (f[k] * 2 + f[j * w + (i + 1) % w] + f[((j + 1) % h) * w + i]) / 4;
  }
  return heightToNormal(f, w, h, strength);
}
// soft contact shadow (alpha falloff toward the edges of a rounded rectangle)
export function contactTexture() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'), img = x.createImageData(s, s);
  for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
    const u = Math.abs(i / (s - 1) * 2 - 1), v = Math.abs(j / (s - 1) * 2 - 1);
    const d = Math.pow(Math.pow(u, 4) + Math.pow(v, 4), 0.25), a = Math.pow(Math.max(0, 1 - d), 1.6);
    const k = (j * s + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 0; img.data[k + 3] = a * 255;
  }
  x.putImageData(img, 0, 0); return new THREE.CanvasTexture(c);
}
// keycaps for a keyboard top
export function keyboardTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d'); x.fillStyle = '#121314'; x.fillRect(0, 0, 512, 160);
  const rows = [15, 15, 14, 13, 12], kw = 512 / 15.5;
  rows.forEach((n, r) => { for (let i = 0; i < n; i++) { const w = i === n - 1 && r ? kw * (15 - n + 1) : kw; const px = 6 + i * kw; x.fillStyle = '#26282b'; x.fillRect(px + 2, 8 + r * 29 + 2, (i === n - 1 && r ? kw * (16 - n) : kw) - 5, 24); } });
  x.fillStyle = '#26282b'; x.fillRect(150, 8 + 4 * 29 + 2, 200, 24);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
// a rack server front: drive bays, vents and a status strip
export function serverFrontTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#1d1f22'; x.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 8; i++) { x.fillStyle = '#2b2e32'; x.fillRect(20 + i * 34, 10, 30, 44); x.fillStyle = '#121315'; x.fillRect(24 + i * 34, 14, 22, 3); }
  x.fillStyle = '#0d0e0f'; for (let i = 0; i < 26; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(312 + i * 7, 16 + j * 11, 2.2, 0, 6.29); x.fill(); }
  x.fillStyle = '#9aa3a8'; x.fillRect(8, 26, 4, 12); x.fillRect(500, 26, 4, 12);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
