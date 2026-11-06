// Arrakis: renderer, camera choreography and lifecycle for the Home section. Requires three@0.128.0.
// The terrain is generated in a worker (buildTerrain.js); until it arrives the section shows its CSS backdrop, so nothing shifts.
import * as THREE from 'three';
import { SUN, SUN_U, WIND } from './duneField';
import { SKY_VS, SKY_FS, TERRAIN_VS, TERRAIN_FS, SAND_VS, SAND_FS, TITLE_VS, TITLE_FS } from './shaders';
import { compileAsync, nextTask } from '../../three/compileAsync';
import { createRenderScale, createViewClip, isConstrainedDevice } from '../../three/adaptive';

// The name as a cinematic title at the horizon. Sized to the view: `span` of the visible width, centred on the view axis, with the
// letters' baseline at `base` of the screen height (portrait framings differ), just on the distant dune line. 6 km out, so the
// silhouettes in front overlap its lower edge.
const NAME = 'UTSAB RAJ ACHARYA', TITLE = { span: 0.88, base: 0.306, basePortrait: 0.352, dist: 6000, tall: 1.4 };

const SLICE_MS = 10;                 // the longest a build step runs before yielding to the page

export function createHomeScene(canvas, opts) {
  opts = opts || {};
  const calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const small = Math.min(window.innerWidth, window.innerHeight) < 600 || window.innerWidth < 760;

  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // resolution adapts to the measured cost of a frame on this device (src/three/adaptive.js); every sand streak stays
  const scale = createRenderScale(R, { cap: 1.5, apply: (p) => { R.setPixelRatio(p); size(); } });
  R.setPixelRatio(scale.pixelRatio);
  // build-time sizes follow the device's capability, not its screen size (small only shapes the title for legibility)
  const lite = isConstrainedDevice(R);
  const clip = createViewClip(R, canvas);           // only the visible band while the section scrolls in or out
  R.setClearColor(0x6a3c1c, 1);
  const S = new THREE.Scene();
  const C = new THREE.PerspectiveCamera(40, 1, 1, 14000);

  const shared = {
    uSun: { value: new THREE.Vector3().fromArray(SUN) }, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 },
    uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) }, uExposure: { value: 1.0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(12000, 48, 24),
    new THREE.ShaderMaterial({ uniforms: shared, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = 1; sky.frustumCulled = false; S.add(sky);      // drawn after the terrain: depth test skips sky pixels behind dunes

  let terrain = null, sand = null, textures = [], dead = false, ready = false, compiled = false, terrainData = null;
  let title = null;                                                 // the name, a cinematic title at the horizon
  // the terrain and sand materials are created up front (their textures arrive with the terrain) so that every shader can
  // compile in the background while the terrain is generated
  const tu = Object.assign({}, shared, { uSU: { value: new THREE.Vector2(SUN_U[0], SUN_U[1]) }, uDetail: { value: lite ? 0.75 : 1 } });
  for (let i = 0; i < 3; i++) { tu['uL' + i] = { value: null }; tu['uC' + i] = { value: new THREE.Vector3() }; }
  const terrainMat = new THREE.ShaderMaterial({ uniforms: tu, vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS });
  terrainMat.extensions.derivatives = true;
  const sandMat = calm ? null : new THREE.ShaderMaterial({
    uniforms: Object.assign({}, shared, {
      uH: { value: null }, uHB: { value: new THREE.Vector4() }, uRes: { value: new THREE.Vector2(1, 1) }, uPR: { value: 1 },
      uL0: tu.uL0, uL1: tu.uL1, uC0: tu.uC0, uC1: tu.uC1, uSU: tu.uSU,
    }),
    vertexShader: SAND_VS, fragmentShader: SAND_FS, transparent: true, depthWrite: false,
  });
  const params = {
    rows: lite ? 460 : 760, cols: lite ? 200 : 300, near: 6, far: 9000, tanH: Math.tan(37 * Math.PI / 180), originZ: 30, crestStep: 5,
    height: { x0: -1100, z0: -2160, size: 2200, res: lite ? 384 : 512 },    // sand height field: near and middle ground
    cascades: [
      { cx: -20, cz: -260, size: 760, res: lite ? 384 : 512, aoRadius: 14 },
      { cx: 0, cz: -1100, size: 2400, res: lite ? 320 : 512, aoRadius: 40 },
      { cx: 0, cz: -3800, size: 8000, res: lite ? 256 : 512, aoRadius: 140 },
    ],
  };

  // the scene goes live once both the terrain and the compiled shaders are there (whichever comes last)
  function onTerrain(r) { if (dead) return; terrainData = r; if (compiled) assemble(); }
  function onCompiled() { if (dead) return; compiled = true; place(0); shared.uCam.value.copy(C.position); R.render(S, C); if (terrainData) assemble(); }
  async function assemble() {
    const r = terrainData;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(r.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(r.nor, 3));
    geo.setIndex(new THREE.BufferAttribute(r.idx, 1));
    r.cascades.forEach((c, i) => {
      const t = new THREE.DataTexture(c.data, c.res, c.res, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
      textures.push(t); tu['uL' + i].value = t; tu['uC' + i].value.set(c.cx, c.cz, c.size);
    });
    for (let i = 0; i < r.cascades.length; i++) { await nextTask(); if (dead) return; R.initTexture(tu['uL' + i].value); }   // one upload per task
    await nextTask(); if (dead) return;
    terrain = new THREE.Mesh(geo, terrainMat); terrain.frustumCulled = false; S.add(terrain);
    if (!calm) { sand = await makeSand(r.crests, r.height); if (dead) return; size(); }   // size() sets the streak resolution
    await nextTask(); if (dead) return;
    ready = true; sync();
    requestAnimationFrame(() => { if (!dead && opts.onReady) opts.onReady(r.ms); });
  }

  // The name: thin, narrow capitals with generous tracking, drawn once into a texture from an available system face (no files):
  // Bahnschrift Light on Windows, Avenir Next / Helvetica Neue light elsewhere. Clean edges; a touch of softness for the haze.
  function makeTitle() {
    // phones: one weight up, so hairline strokes survive the small size
    const px = 200, track = 0.3 * px, font = (small ? '500 ' : '400 ') + px + 'px Bahnschrift, "Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif';
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = font;
    const widths = [...NAME].map((ch) => x.measureText(ch).width), tw = widths.reduce((a, b) => a + b, 0) + track * (NAME.length - 1);
    const cap = x.measureText('H').actualBoundingBoxAscent || px * 0.7;
    c.width = Math.ceil(tw + px * 0.4); c.height = Math.ceil(cap * 1.7);
    const baseY = Math.round(c.height / 2 + cap / 2);                                   // caps centred vertically
    x.font = font; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff';
    if ('filter' in x) x.filter = 'blur(0.8px)';                                      // a breath of atmospheric softness
    let cx = (c.width - tw) / 2; const centres = [];
    [...NAME].forEach((ch, i) => { x.fillText(ch, cx, baseY); if (ch !== ' ') centres.push((cx + widths[i] / 2) / c.width); cx += widths[i] + track; });
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; textures.push(t);
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, shared, { uText: { value: t }, uPos: { value: new THREE.Vector3() }, uSize: { value: new THREE.Vector2(1, 1) }, uCx: { value: centres }, uAlpha: { value: small ? 0.56 : 0.5 } }),
      vertexShader: TITLE_VS, fragmentShader: TITLE_FS, transparent: true, depthWrite: false,
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); q.frustumCulled = false; q.renderOrder = 3;
    q.userData.aspect = c.width / c.height; q.userData.baseFrac = baseY / c.height;    // baseline, from the top of the quad
    S.add(q); return q;
  }
  // Fit the title to the current framing: centred on the base view direction, `span` of the visible width, baseline on `base`.
  function placeTitle() {
    if (!title) return;
    const vf = C.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * C.aspect);
    const yaw = portrait ? 0.2 : 0.035, pitch = portrait ? -0.085 : -0.04, yB = portrait ? TITLE.basePortrait : TITLE.base;
    const w = 2 * TITLE.dist * Math.tan(hf / 2) * TITLE.span, h = w / title.userData.aspect * TITLE.tall;   // letters stretched taller
    const elBase = pitch + Math.atan((0.5 - yB) * 2 * Math.tan(vf / 2));
    const el = elBase + (title.userData.baseFrac - 0.5) * h / TITLE.dist;            // quad centre above the baseline
    const u = title.material.uniforms;
    u.uPos.value.set(Math.sin(yaw) * Math.cos(el), Math.sin(el), -Math.cos(yaw) * Math.cos(el)).multiplyScalar(TITLE.dist).add(new THREE.Vector3(0, 41, -8));
    u.uSize.value.set(w, h);
  }

  // Wind-blown sand: thousands of hairline streaks (instanced quads, stretched along their motion) skimming the dune surface.
  // Each grain reads a baked height field every frame, so it follows the real terrain; it is lit by the same baked sunlight.
  //   crest grains: start on detected crests, hop a little over the edge, then spill down the lee and fade
  //   surface grains: skim the near and middle ground, mostly visible on sunlit, windward slopes
  async function makeSand(crests, h) {
    let slice = performance.now();
    const pause = async () => { if (performance.now() - slice > SLICE_MS) { await nextTask(); slice = performance.now(); } };
    let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const A = [], B = [];
    // crest grains: concentrated on nearer crests (far ones are sub-pixel anyway); ±2.5 m jitter fills the 5 m crest spacing
    const nCrest = lite ? 4500 : 8500;
    const nCrests = crests.length / 4;
    for (let i = 0; i < nCrest;) {
      if (!(i & 255)) { await pause(); if (dead) return null; }
      const c = Math.floor(rnd() * nCrests) * 4, cx = crests[c], cz = crests[c + 2], d = Math.hypot(cx, cz);
      if (rnd() > Math.min(1, 420 / d)) continue;
      A.push(cx, cz, 1, (0.2 + rnd() * 0.8) * Math.min(1, crests[c + 3] / 8)); B.push(rnd(), rnd(), rnd(), rnd()); i++;
    }
    // surface lanes: narrow threads of grains spread over the whole near and middle ground (lighting decides how much they show)
    const hAt = (x, z) => { const j = Math.max(0, Math.min(h.res - 1, Math.floor((x - h.x0) / h.size * h.res))), i = Math.max(0, Math.min(h.res - 1, Math.floor((z - h.z0) / h.size * h.res))); return h.data[i * h.res + j]; };
    const lanes = lite ? 280 : 540, per = 22;
    for (let l = 0, tries = 0; l < lanes && tries < 40000; tries++) {
      if (!(tries & 31)) { await pause(); if (dead) return null; }
      const d = 30 + Math.pow(rnd(), 1.15) * 1300, a = -0.62 + rnd() * 1.4, x = Math.sin(a) * d, z = -Math.cos(a) * d;
      const gx = (hAt(x + 2, z) - hAt(x - 2, z)) / 4, gz = (hAt(x, z + 2) - hAt(x, z - 2)) / 4, nl = Math.hypot(gx, 1, gz);
      const nx = -gx / nl, ny = 1 / nl, nz = -gz / nl, ndl = nx * SUN[0] + ny * SUN[1] + nz * SUN[2];
      if (ndl < 0.05 && rnd() < 0.7) continue;                  // fewer lanes on the shadowed faces
      for (let k = 0; k < per; k++) { A.push(x, z, 0, 0); B.push(rnd(), rnd(), rnd(), rnd()); }
      l++;
    }
    const n = A.length / 4;
    await pause(); if (dead) return null;
    const Af = new Float32Array(A), Bf = new Float32Array(B);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));   // x: tail→head, y: side
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(Af, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(Bf, 4));
    g.instanceCount = n;
    const ht = new THREE.DataTexture(h.data, h.res, h.res, THREE.RedFormat, THREE.FloatType);
    ht.magFilter = ht.minFilter = THREE.NearestFilter; ht.wrapS = ht.wrapT = THREE.ClampToEdgeWrapping; ht.needsUpdate = true; textures.push(ht);
    sandMat.uniforms.uH.value = ht; sandMat.uniforms.uHB.value.set(h.x0, h.z0, h.size, h.res);
    const p = new THREE.Mesh(g, sandMat); p.frustumCulled = false; S.add(p); return p;
  }

  // Generate the terrain in parallel workers (mesh + one per light cascade); same code on the main thread as a fallback.
  const jobs = [{ job: 'mesh' }, { job: 'height' }].concat(params.cascades.map((c, i) => ({ job: 'light', index: i })));
  const parts = { cascades: [] }; let pending = jobs.length, failed = false, workers = [];
  function collect(r) {
    if (r.job === 'mesh') Object.assign(parts, r); else if (r.job === 'height') parts.height = r.height; else parts.cascades[r.index] = r.cascade;
    if (--pending === 0) { workers = []; onTerrain(parts); }
  }
  function stopWorkers() { workers.forEach((w) => w.terminate()); workers = []; }
  function buildHere() { if (failed) return; failed = true; stopWorkers(); import('./buildTerrain').then((m) => { if (!dead) onTerrain(m.buildTerrain(params)); }); }
  try {
    jobs.forEach((j) => {
      const w = new Worker(new URL('./terrain.worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { if (!failed) collect(e.data); }; w.onerror = buildHere;
      w.postMessage(Object.assign({}, params, j)); workers.push(w);
    });
  } catch (e) { buildHere(); }

  // ---- camera: a high vantage behind the near dune, long lens, very slow push-in and drift ----
  let w0 = 1, h0 = 1, portrait = false;
  function size() {
    w0 = canvas.clientWidth || window.innerWidth; h0 = canvas.clientHeight || window.innerHeight;
    R.setSize(w0, h0, false); C.aspect = w0 / h0; portrait = C.aspect < 0.9;
    C.fov = portrait ? 58 : C.aspect < 1.4 ? 46 : 40; C.updateProjectionMatrix();
    placeTitle();
    if (sand) { sand.material.uniforms.uRes.value.set(w0 * R.getPixelRatio(), h0 * R.getPixelRatio()); sand.material.uniforms.uPR.value = R.getPixelRatio(); }
  }
  const ro = new ResizeObserver(size); ro.observe(canvas); size();
  let tx = 0, ty = 0, px = 0, py = 0;
  function onMove(e) { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }
  if (!calm) window.addEventListener('pointermove', onMove, { passive: true });

  const look = new THREE.Vector3(), t0 = performance.now();
  function place(t) {
    const push = calm ? 0 : 16 * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI / 240));          // 0 → 16 m → 0 over four minutes
    const dx = calm ? 0 : Math.sin(t * 0.031) * 3.2, dy = calm ? 0 : Math.sin(t * 0.047) * 0.8;
    px += (tx - px) * 0.03; py += (ty - py) * 0.03;
    const yaw = (portrait ? 0.2 : 0.035) + px * 0.03 + (calm ? 0 : Math.sin(t * 0.023) * 0.006);
    const pitch = (portrait ? -0.085 : -0.04) - py * 0.016;
    C.position.set(dx, 41 + dy, -push);
    look.set(C.position.x + Math.sin(yaw) * 100, C.position.y + Math.sin(pitch) * 100, C.position.z - Math.cos(yaw) * 100);
    C.lookAt(look);
    sky.position.copy(C.position);
  }

  let raf = 0, vis = !document.hidden, vp = true, run = false, scrollK = 0;
  function sync() { const n = ready && vis && vp; if (n && !run) { run = true; scale.resume(); frame(); } else if (!n && run) { run = false; cancelAnimationFrame(raf); } }
  function onVis() { vis = !document.hidden; sync(); } document.addEventListener('visibilitychange', onVis);
  function frame() {
    if (!run) return; raf = requestAnimationFrame(frame);
    const now = performance.now(), t = calm ? 0 : (now - t0) / 1000;
    const part = clip.update();                    // drawing only the visible band: not a full frame to measure
    if (sand) scale.frame(now, part);
    place(t);
    shared.uTime.value = t; shared.uCam.value.copy(C.position);
    try { scale.gpuBegin(); R.render(S, C); scale.gpuEnd(); } catch (err) { run = false; cancelAnimationFrame(raf); if (opts.onError) opts.onError(err); }
  }
  // compile every shader in the background (sky, title, terrain, sand: stand-in meshes carry the last two), then render the sky
  // once so the canvas is never blank behind the backdrop
  nextTask().then(() => {
    if (dead) return false;
    title = makeTitle(); placeTitle();
    const warm = new THREE.Scene();
    warm.add(new THREE.Mesh(sky.geometry, sky.material), new THREE.Mesh(title.geometry, title.material), new THREE.Mesh(new THREE.BufferGeometry(), terrainMat));
    if (sandMat) warm.add(new THREE.Mesh(new THREE.InstancedBufferGeometry(), sandMat));
    return nextTask().then(() => compileAsync(R, warm, C, { isDead: () => dead }));
  }).then((ok) => { if (ok) onCompiled(); }, (err) => { if (opts.onError) opts.onError(err); });

  function dispose() {
    dead = true; run = false; cancelAnimationFrame(raf); stopWorkers();
    window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); ro.disconnect();
    S.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    terrainMat.dispose(); if (sandMat) sandMat.dispose(); scale.dispose(); clip.dispose();
    textures.forEach((t) => t.dispose()); R.dispose(); if (R.forceContextLoss) R.forceContextLoss();
  }
  return { setVisible(b) { vp = b; sync(); }, dispose, get scrollK() { return scrollK; } };
}
