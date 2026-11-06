import * as THREE from 'three';
import { compileAsync, nextTask } from '../../three/compileAsync';
import { reportProgress } from '../../three/quiet';
import { createRenderScale, createViewClip, isConstrainedDevice } from '../../three/adaptive';
import { SHELL, SUN, heightAt, outpostParts } from './world';
import { noiseField } from './noiseField';
import { SKY_VS, SKY_FS, TERRAIN_VS, TERRAIN_FS, SHELL_VS, SHELL_FS, OBJ_VS, OBJ_FS, GLOW_VS, GLOW_FS, MOTE_VS, MOTE_FS } from './shaders';

/**
 * The Contact Zone: a fog-filled valley under an overcast sky, a vast dark ovoid standing on end above the valley floor,
 * mountains half lost in rolling cloud, a research outpost in the mist and a survey instrument in the foreground.
 * createProfileScene(canvas, { onReady, onError, onFrame(rect) }) -> { setVisible(bool), dispose() }
 * onFrame receives the structure's on-screen bounds (CSS px, relative to the canvas) whenever they change.
 */
const SLICE_MS = 25;                 // the longest a build step runs before yielding to the page

export function createProfileScene(canvas, opts = {}) {
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  const maxPR = 1.5;
  // build-time sizes follow the device's capability, not its screen size: phones get the full fog march and terrain
  const lite = isConstrainedDevice(R);
  const clip = createViewClip(R, canvas);           // only the visible band while the section scrolls in or out
  // resolution adapts to the measured cost of a frame on this device (src/three/adaptive.js); the fog itself never changes
  const scale = createRenderScale(R, { cap: maxPR, apply: (p) => { R.setPixelRatio(p); size(); } });
  R.setPixelRatio(scale.pixelRatio);
  R.setClearColor(0x8a9196, 1);

  const S = new THREE.Scene();
  const C = new THREE.PerspectiveCamera(42, 1, 1, 20000);
  const gl2 = R.capabilities.isWebGL2;
  const defines = Object.assign(lite ? { MIST_N: 8, FAR_N: 5, NEAR_N: 4 } : {}, gl2 ? {} : { NO_TEX3D: 1, MIST_N: 6, FAR_N: 4, NEAR_N: 3 });
  const disposables = [];
  const shared = {
    uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(...SUN) },
    uDrift: { value: new THREE.Vector2() }, uQ: { value: 1 },
  };
  const mat = (vs, fs, extra = {}, o = {}) => {
    const m = new THREE.ShaderMaterial(Object.assign({ uniforms: Object.assign({}, shared, extra), vertexShader: vs, fragmentShader: fs, defines }, o));
    disposables.push(m); return m;
  };
  const add = (geo, m, order = 0) => { const o = new THREE.Mesh(geo, m); o.frustumCulled = false; o.renderOrder = order; disposables.push(geo); S.add(o); return o; };

  // Everything that takes real time runs in slices, so the page stays responsive while this scene is prepared ahead of the visitor
  let sky = null, motes = null, noiseWorker = null;
  const build = async () => {
  reportProgress(canvas, 'Fog field');
  if (gl2) { const t = await noiseTexture3D(64, () => dead, (w) => { noiseWorker = w; }); noiseWorker = null; if (dead) return; disposables.push(t); shared.uNoise = { value: t }; }

  reportProgress(canvas, 'Terrain');
  // ---- terrain: a polar grid around the viewpoint, finest underfoot, ~12 km out to the mountains ----
  {
    const N = lite ? 170 : 240, M = lite ? 220 : 320, a0 = -1.9, a1 = 1.6, rMax = 12000, r0 = 2;
    const pos = new Float32Array(N * M * 3);
    let slice = performance.now();
    for (let i = 0; i < N; i++) {
      if (performance.now() - slice > SLICE_MS) { await nextTask(canvas); if (dead) return; slice = performance.now(); }
      const r = r0 * Math.pow(rMax / r0, i / (N - 1));
      for (let j = 0; j < M; j++) {
        const a = a0 + (a1 - a0) * j / (M - 1), x = Math.sin(a) * r, z = -Math.cos(a) * r, k = (i * M + j) * 3;
        pos[k] = x; pos[k + 1] = heightAt(x, z); pos[k + 2] = z;
      }
    }
    const idx = new Uint32Array((N - 1) * (M - 1) * 6);
    let q = 0;
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) {
      const a = i * M + j, b = a + 1, c = a + M, d = c + 1;
      idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    await nextTask(canvas); if (dead) return;
    g.computeVertexNormals();
    await nextTask(canvas); if (dead) return;
    add(g, mat(TERRAIN_VS, TERRAIN_FS, { uShell: { value: new THREE.Vector4(SHELL.x, SHELL.z, 260, 0.35) } }));
  }

  // ---- the structure ----
  add(new THREE.SphereGeometry(1, 128, 96), mat(SHELL_VS, SHELL_FS, {
    uPos: { value: new THREE.Vector3(SHELL.x, SHELL.y, SHELL.z) }, uExt: { value: new THREE.Vector3(SHELL.w, SHELL.h, SHELL.t) }, uRot: { value: SHELL.rot },
  }));

  // ---- the outpost and the equipment, merged into one vertex-coloured mesh ----
  const { parts, lamps } = outpostParts();
  {
    const P = [], Nn = [], Cc = [], E = [];
    const m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3(), e = new THREE.Euler(), qq = new THREE.Quaternion();
    const unit = { box: new THREE.BoxGeometry(1, 1, 1), cyl: {}, prism: prism() };
    const push = (geo, color, emit) => {
      const p = geo.attributes.position, n = geo.attributes.normal, ix = geo.index;
      const cnt = ix ? ix.count : p.count;
      for (let t = 0; t < cnt; t++) {
        const k = ix ? ix.getX(t) : t;
        v.fromBufferAttribute(p, k).applyMatrix4(m4); P.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, k).applyMatrix3(nm).normalize(); Nn.push(v.x, v.y, v.z);
        Cc.push(color[0], color[1], color[2]); E.push(emit);
      }
    };
    for (const o of parts) {
      let geo = unit.box, h = o.h, oy = 0.5;
      if (o.k === 'prism') { geo = unit.prism; oy = 0; }
      if (o.k === 'cyl') { const s = o.seg || 8; geo = unit.cyl[s] || (unit.cyl[s] = new THREE.CylinderGeometry(0.5, 0.5, 1, s)); }
      const gy = heightAt(o.x, o.z) + (o.y || 0);
      e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); qq.setFromEuler(e);
      m4.compose(new THREE.Vector3(o.x, gy, o.z), qq, new THREE.Vector3(o.w, h, o.d));
      m4.multiply(new THREE.Matrix4().makeTranslation(0, oy, 0));
      nm.getNormalMatrix(m4);
      push(geo, o.c, o.e || 0);
    }
    // lamp posts along the track
    for (const l of lamps) if (l.post) {
      const gy = heightAt(l.x, l.z);
      m4.compose(new THREE.Vector3(l.x, gy, l.z), new THREE.Quaternion(), new THREE.Vector3(0.08, l.y, 0.08));
      m4.multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0)); nm.getNormalMatrix(m4);
      push(unit.box, [0.16, 0.17, 0.18], 0);
    }
    unit.box.dispose(); unit.prism.dispose(); Object.values(unit.cyl).forEach((g) => g.dispose());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
    g.setAttribute('emit', new THREE.Float32BufferAttribute(E, 1));
    add(g, mat(OBJ_VS, OBJ_FS));
  }

  // ---- lamp glows ----
  {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const L = new Float32Array(lamps.length * 4), I = new Float32Array(lamps.length);
    lamps.forEach((l, i) => { L.set([l.x, heightAt(l.x, l.z) + l.y, l.z, l.s], i * 4); I[i] = l.i; });
    g.setAttribute('aLamp', new THREE.InstancedBufferAttribute(L, 4));
    g.setAttribute('aI', new THREE.InstancedBufferAttribute(I, 1));
    g.instanceCount = lamps.length;
    add(g, mat(GLOW_VS, GLOW_FS, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 2);
  }

  // ---- sky, after the opaque scene so only uncovered pixels pay for it ----
  sky = add(new THREE.SphereGeometry(100, 48, 24), mat(SKY_VS, SKY_FS, {}, { side: THREE.BackSide, depthWrite: false }), 1);

  // ---- motes ----
  if (!reduce) {
    const n = lite ? 140 : 260, g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) a.set([Math.random() * 60, Math.random() * 9, Math.random() * 50, Math.random()], i * 4);
    g.setAttribute('aM', new THREE.InstancedBufferAttribute(a, 4));
    g.instanceCount = n;
    motes = add(g, new THREE.ShaderMaterial({ uniforms: { uTime: shared.uTime, uPx: { value: 0.001 } }, vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false }), 3);
    disposables.push(motes.material);
  }
  };

  // ---- camera: on the rise, looking across the valley. Framing differs for wide and portrait screens ----
  const eye = new THREE.Vector3(0, heightAt(0, 0) + 2.1, 0);
  let portrait = false, W = 1, H = 1;
  const view = { yaw: 0, pitch: 0 };
  function size() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    R.setSize(W, H, false);
    C.aspect = W / H; portrait = C.aspect < 0.85;
    C.fov = portrait ? 60 : C.aspect < 1.3 ? 50 : 42;
    C.updateProjectionMatrix();
    // desktop: the structure right of centre, open ground on the left for the dossier; portrait: centred, high in the frame
    view.yaw = portrait ? -0.07 : C.aspect < 1.3 ? -0.14 : -0.2;
    view.pitch = portrait ? 0.02 : 0.05;
    if (motes) motes.material.uniforms.uPx.value = 2 * Math.tan(C.fov * Math.PI / 360) / H;
    if (ready && (reduce || !running)) render(lastT);
  }

  // pointer parallax (desktop pointers only): the foreground shifts against the distant structure
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const onPtr = (e) => { ptr.x = e.clientX / window.innerWidth * 2 - 1; ptr.y = e.clientY / window.innerHeight * 2 - 1; };
  if (fine && !reduce) window.addEventListener('pointermove', onPtr, { passive: true });

  const look = new THREE.Vector3(), corners = [], tmp = new THREE.Vector3();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push([sx, sy, sz]);
  let lastRect = '';
  function frameCamera(t) {
    const k = reduce ? 0 : 1;
    ptr.sx += (ptr.x - ptr.sx) * 0.04; ptr.sy += (ptr.y - ptr.sy) * 0.04;
    C.position.set(eye.x + k * (Math.sin(t * 0.05) * 0.9 + ptr.sx * 1.3), eye.y + k * (Math.sin(t * 0.037 + 1.0) * 0.25 - ptr.sy * 0.35), eye.z + k * Math.sin(t * 0.031) * 0.6);
    const yaw = view.yaw + k * Math.sin(t * 0.023) * 0.006, pitch = view.pitch + k * Math.sin(t * 0.029 + 2.0) * 0.003;
    look.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(3000).add(eye);
    C.lookAt(look);
    C.updateMatrixWorld();
    sky.position.copy(C.position);
    shared.uCam.value.copy(C.position);
    // where the structure sits on screen (for the interface's range bracket)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const c = Math.cos(SHELL.rot), s = Math.sin(SHELL.rot);
    for (const [a, b, d] of corners) {
      const lx = a * SHELL.w * 0.96, lz = d * SHELL.t;
      tmp.set(SHELL.x + c * lx + s * lz, SHELL.y + b * SHELL.h, SHELL.z - s * lx + c * lz).project(C);
      const px = (tmp.x * 0.5 + 0.5) * W, py = (0.5 - tmp.y * 0.5) * H;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    const key = [x0, y0, x1, y1].map(Math.round).join();
    if (key !== lastRect && opts.onFrame) { lastRect = key; opts.onFrame({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, dist: C.position.distanceTo(new THREE.Vector3(SHELL.x, SHELL.y, SHELL.z)) }); }
  }

  let lastT = reduce ? 40 : 0;
  function render(t) {
    shared.uTime.value = t;
    shared.uDrift.value.set(t * 4.2, t * 1.5);                    // wind: steady, slightly diagonal
    frameCamera(t);
    R.render(S, C);
  }

  // ---- loop: only while visible and the tab is shown; frozen frame for reduced motion ----
  let visible = false, running = false, raf = 0, t0 = 0, dead = false, ready = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = now - lastT * 1000;
    lastT = (now - t0) / 1000;
    scale.frame(now, clip.update());
    scale.gpuBegin(); render(lastT); scale.gpuEnd();
  }
  function sync() {
    const go = visible && !document.hidden && !reduce && !dead;
    if (go && !running) { running = true; t0 = 0; scale.resume(); raf = requestAnimationFrame(frame); }
    if (!go && running) { running = false; cancelAnimationFrame(raf); }
  }
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => size());
  ro.observe(canvas);

  // shaders compile in the background first; the first frame then renders without freezing the page
  build().then(() => {
    if (dead) return false;
    size();
    return compileAsync(R, S, C, { isDead: () => dead });
  }).then((ok) => {
    if (!ok) return;
    render(lastT);
    ready = true; sync();
    if (opts.onReady) requestAnimationFrame(() => { if (!dead) opts.onReady(); });
  }).catch((err) => { if (opts.onError) opts.onError(err); });

  return {
    setVisible(v) { visible = v; if (ready) sync(); },
    dispose() {
      dead = true; running = false; cancelAnimationFrame(raf);
      if (noiseWorker) noiseWorker.terminate();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onPtr);
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      scale.dispose(); clip.dispose();
      R.dispose();
      R.forceContextLoss();
    },
  };
}

// a unit triangular prism (tent roof): base 1 x 1 at y = 0, ridge along z at y = 1
function prism() {
  const L = -0.5, Rr = 0.5, F = 0.5, B = -0.5;
  const v = [
    L, 0, F, Rr, 0, F, 0, 1, F,          // gable ends
    Rr, 0, B, L, 0, B, 0, 1, B,
    L, 0, B, L, 0, F, 0, 1, F, L, 0, B, 0, 1, F, 0, 1, B,       // left slope
    Rr, 0, F, Rr, 0, B, 0, 1, B, Rr, 0, F, 0, 1, B, 0, 1, F,    // right slope
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

// The noise is the same on every build, so it is generated once per page and every texture made from the same bytes.
let noiseData = null;

function noiseInWorker(N, onStart) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('./noise.worker.js', import.meta.url), { type: 'module' });
    onStart(w);
    w.onmessage = (e) => { w.terminate(); resolve(e.data); };
    w.onerror = w.onmessageerror = (e) => { e.preventDefault(); w.terminate(); reject(e); };
    w.postMessage(N);
  });
}

// If a worker cannot run, the same generator runs here in slices; slower to finish, identical result.
async function noiseHere(N, isDead) {
  const steps = noiseField(N);
  let slice = performance.now();
  for (let r = steps.next(); ; r = steps.next()) {
    if (r.done) return r.value;
    if (performance.now() - slice > SLICE_MS) { await nextTask(); if (isDead()) return null; slice = performance.now(); }
  }
}

async function noiseTexture3D(N, isDead, onWorker) {
  if (!noiseData) {
    let data;
    try { data = await noiseInWorker(N, onWorker); }
    catch (err) { if (isDead()) return null; data = await noiseHere(N, isDead); }
    if (!data) return null;
    noiseData = data;
  }
  const t = new THREE.DataTexture3D(noiseData, N, N, N);
  t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}
