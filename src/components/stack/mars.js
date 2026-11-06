import * as THREE from 'three';
import { SKY_VS, SKY_FS, DUST_VS, DUST_FS } from './marsShaders';

// The Martian landscape beyond the window: a polar heightfield (finest near the facility, out to 6 km) shaped by eroded
// ridges, rocky outcrops, terraced mesas with layered strata, a broad basin and scattered craters; textured with the CC0
// cracked-ground scan sampled at two scales to hide tiling and tinted per vertex: iron red, terracotta, dusty brown and
// maroon, with dark basalt on steep faces; CC0 rock scans placed as boulders near the window, larger blocks further out and
// cliff faces in the distance; a dark, dusty sky, aerial haze and blowing dust. No lights, passes or textures of its own.

function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, o) { let s = 0, a = 0.5, n = 0; for (let k = 0; k < o; k++) { s += a * vn(x, z); n += a; const nx = x * 1.73 + z * 1.07 + 3.1; z = -x * 1.07 + z * 1.73 + 1.3; x = nx; a *= 0.5; } return s / n; }
function ridged(x, z, o) { let s = 0, a = 0.5, n = 0; for (let k = 0; k < o; k++) { let r = 1 - Math.abs(vn(x, z) * 2 - 1); r *= r; s += a * r; n += a; const nx = x * 1.9 + z * 0.9 + 7.7; z = -x * 0.9 + z * 1.9 + 2.2; x = nx; a *= 0.5; } return s / n; }
const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const CRATERS = [[-260, -620, 70], [420, -980, 120], [-900, -1500, 160], [150, -380, 26], [-120, -230, 14]];

// ground height (m) in facility coordinates; the facility floor is at 0, the ground outside lies ~1.6 m below
export function marsH(x, z) {
  const d = Math.hypot(x, z + 10);
  // domain warp keeps the shapes from repeating
  const wx = x + (fbm(x * 0.0012, z * 0.0012, 3) - 0.5) * 900, wz = z + (fbm(x * 0.0012 + 7, z * 0.0012 + 3, 3) - 0.5) * 900;
  let h = (fbm(wx * 0.004, wz * 0.004, 5) - 0.5) * 9;                               // rolling ground
  // each term is computed only within the range where it has any effect
  if (d < 300) h += (fbm(x * 0.05, z * 0.05, 4) - 0.5) * 2.2 * (1 - sm(80, 300, d));   // near-field roughness
  if (d > 25 && d < 1000) h += ridged(x * 0.014, z * 0.014, 3) * 6 * sm(25, 110, d) * (1 - sm(450, 1000, d));   // rocky outcrops
  if (d > 400) h += ridged(wx * 0.0011, wz * 0.0011, 5) * 55 * sm(400, 1400, d);       // eroded ridges
  if (d > 900) {                                                                       // mesas: flat tops with stepped, layered flanks
    const ms = fbm(wx * 0.0009 + 11, wz * 0.0009, 4), mesa = sm(0.55, 0.62, ms) * sm(900, 2200, d);
    const tiers = Math.floor(ms * 14) / 14 + sm(0, 1, (ms * 14) % 1) / 14 * 0.35;
    h += mesa * (30 + 110 * tiers);
  }
  if (d > 2500) h += sm(2500, 5500, d) * 320 * Math.pow(fbm(wx * 0.0004, wz * 0.0004 + 5, 4), 1.6);  // far ranges, low on the horizon
  for (const [cx, cz, r] of CRATERS) {                                                 // craters: a bowl and a raised rim
    const q = Math.hypot(x - cx, z - cz) / r;
    if (q < 1.6) h += -r * 0.22 * Math.max(0, 1 - q * q) + r * 0.09 * Math.exp(-((q - 1) * (q - 1)) / 0.06);
  }
  return h * sm(12, 40, d) - 1.6;
}

export function buildMars(scene, tex, models, keep, small) {
  const SUN_DIR = new THREE.Vector3(-0.46, 0.27, -0.85).normalize();

  // ---- terrain: polar grid around the window ----
  {
    const N = small ? 150 : 210, Mseg = small ? 200 : 300, a0 = -1.35, a1 = 1.35, r0 = 3, r1 = 6000;
    const pos = new Float32Array(N * Mseg * 3), col = new Float32Array(N * Mseg * 3), uv = new Float32Array(N * Mseg * 2);
    for (let i = 0; i < N; i++) {
      const r = r0 * Math.pow(r1 / r0, i / (N - 1));
      for (let j = 0; j < Mseg; j++) {
        const a = a0 + (a1 - a0) * j / (Mseg - 1), x = Math.sin(a) * r, z = -10 - Math.cos(a) * r, k = i * Mseg + j;
        const y = marsH(x, z); pos.set([x, y, z], k * 3); uv.set([x / 7, z / 7], k * 2);
        // macro colour, multiplied with the scan: large iron-red, terracotta and maroon patches, drifts of paler dusty brown
        // in the hollows and on the high ground
        const n = fbm(x * 0.006, z * 0.006, 3), p = vn(x * 0.031 + 5, z * 0.031), hh = Math.min(1, Math.max(0, (y + 2) / 300));
        const m = sm(0.34, 0.66, n), dustK = sm(0.55, 0.8, p) * 0.55 + hh * 0.3;
        const cr = 0.22 + 0.27 * m, cg = 0.066 + 0.08 * m, cb = 0.046 + 0.04 * m;
        col.set([cr + (0.42 - cr) * dustK, cg + (0.2 - cg) * dustK, cb + (0.125 - cb) * dustK], k * 3);
      }
    }
    const idx = new Uint32Array((N - 1) * (Mseg - 1) * 6); let q = 0;
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < Mseg - 1; j++) { const a = i * Mseg + j, b = a + 1, c2 = a + Mseg, d = c2 + 1; idx.set([a, b, c2, b, d, c2], q); q += 6; }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    // bare dark rock where the ground is too steep to hold dust
    const nrm = g.attributes.normal.array;
    for (let k = 0; k < N * Mseg; k++) {
      const rock = (1 - sm(0.82, 0.97, nrm[k * 3 + 1])) * 0.8;
      col[k * 3] += (0.17 - col[k * 3]) * rock; col[k * 3 + 1] += (0.07 - col[k * 3 + 1]) * rock; col[k * 3 + 2] += (0.055 - col[k * 3 + 2]) * rock;
    }
    const mat = keep(new THREE.MeshStandardMaterial({ map: tex.ground.map, normalMap: tex.ground.normalMap, roughness: 0.96, metalness: 0, vertexColors: true, normalScale: new THREE.Vector2(1.6, 1.6), envMapIntensity: 0.1 }));
    // break up the tiling: blend the scan at a second, rotated scale and let the near-field detail fade with distance
    mat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `
        vec2 uvB = mat2(0.8, -0.6, 0.6, 0.8) * vUv * 0.19 + vec2(0.37, 0.11);
        vec4 tA = texture2D(map, vUv), tB = texture2D(map, uvB);
        float far = smoothstep(30.0, 260.0, length(vViewPosition));
        vec4 texelColor = mapTexelToLinear(mix(mix(tA, tB, 0.45), tB, far));
        texelColor.rgb *= texelColor.rgb * 1.7 + 0.25;       // deeper cracks and crevices from the same two samples
        diffuseColor *= texelColor;`);
    };
    const t = new THREE.Mesh(g, mat); t.receiveShadow = true; t.userData.noBake = true; scene.add(t);
  }

  // ---- rocks: the CC0 scans, recoloured; boulders near the window, blocks further out, cliff faces in the distance ----
  const place = (src, x, z, s, ry, sink = 0.25, sy = 1) => {
    if (!src) return;
    const o = src.clone(); o.position.set(x, marsH(x, z) - s * sink, z); o.rotation.y = ry; o.scale.set(s, s * sy, s); o.userData.noBake = true;
    o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } });
    scene.add(o);
  };
  const R = (() => { let s = 1234567; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
  const kinds = [models.rock07, models.rock09];                         // the dense boulder scan only a few times
  for (let i = 0; i < (small ? 22 : 36); i++) {                        // near: within ~90 m of the window
    const a = (R() - 0.5) * 2.2, r = 6 + Math.pow(R(), 1.6) * 90;
    place(kinds[i % 2], Math.sin(a) * r, -10 - Math.cos(a) * r, 0.4 + R() * 1.6, R() * 6.28);
  }
  for (const [a, r, s] of [[-0.35, 26, 2.2], [0.42, 48, 3.0], [-0.8, 70, 3.6]]) place(models.boulder, Math.sin(a) * r, -10 - Math.cos(a) * r, s, a * 3);
  for (const [a, r, s, k] of [[-0.12, 34, 3.2, 0], [0.25, 22, 2.4, 1], [0.6, 60, 5.5, 0], [-0.5, 44, 4.2, 1], [0.05, 95, 7, 1], [-0.25, 140, 9, 0]]) place(kinds[k], Math.sin(a) * r, -10 - Math.cos(a) * r, s, a * 5, 0.35);   // a few large boulders for depth
  for (let i = 0; i < (small ? 10 : 18); i++) {                        // mid: big blocks 120-500 m out
    const a = (R() - 0.5) * 2.4, r = 120 + R() * 380;
    place(kinds[i % 2], Math.sin(a) * r, -10 - Math.cos(a) * r, 4 + R() * 9, R() * 6.28, 0.3);
  }
  let i2 = 0;
  for (const [a, r, s, ry, sy] of [[-0.62, 1900, 60, 0.4, 0.8], [-0.25, 2600, 90, 2.1, 0.7], [0.2, 2200, 75, 4.0, 0.9], [0.55, 3000, 110, 1.2, 0.7], [0.9, 1700, 55, 5.2, 0.8], [-0.95, 2400, 80, 3.3, 0.75]]) {
    place(i2++ % 2 ? models.rock07 : models.rock09, Math.sin(a) * r, -10 - Math.cos(a) * r, s, ry, 0.45, sy);    // distant buttes
  }

  // ---- sky, haze, dust ----
  const HAZE = new THREE.Color(0.42, 0.215, 0.15);
  scene.fog = new THREE.FogExp2(HAZE.clone().convertSRGBToLinear().getHex(), 0.00048);
  const skyMat = keep(new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN_DIR.clone() }, uTime: { value: 0 }, uHorizon: { value: HAZE.clone().convertSRGBToLinear() } } }));
  const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(100, 48, 24)), skyMat); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
  const n = small ? 240 : 480, dg = keep(new THREE.InstancedBufferGeometry());
  dg.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); dg.setIndex([0, 1, 2, 0, 2, 3]);
  const a = new Float32Array(n * 4); for (let i = 0; i < n; i++) a.set([Math.random() * 90, Math.random() * 14, Math.random() * 70, Math.random()], i * 4);
  dg.setAttribute('aD', new THREE.InstancedBufferAttribute(a, 4)); dg.instanceCount = n;
  const dust = new THREE.Mesh(dg, keep(new THREE.ShaderMaterial({ vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } } })));
  dust.frustumCulled = false; scene.add(dust);
  return { SUN_DIR, sky, skyMat, dust };
}
