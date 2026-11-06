import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeScreen } from './screens';
import { createLoaders } from './assets';
import { ROOM, createMaterials, makeBuilders, buildRoom, monitor, chair, desk, tower, keyboard, mug, rack } from './facility';
import { buildMars } from './mars';
import { compileAsync, deferCompile, uploadTextures, nextTask } from '../../three/compileAsync';
import { reportProgress } from '../../three/quiet';
import { createRenderScale, createViewClip } from '../../three/adaptive';

/**
 * Mission Control on Mars: a research facility interior with a wide observation window over the Martian desert. Three
 * physical stations are the navigation: 01 software workstation (left), 02 analysis console and video wall (centre, against
 * the window), 03 operations partition with server rack (right). Stations are picked with a raycaster against proxy volumes.
 *
 * createStackScene(canvas, { onReady, onError, onHover(id|null), onSelect(id), onMiss(), onAnchors({id: {x, y, on, behind}}) })
 *   -> { setVisible(bool), setHover(id|null), setSelected(id|null), dispose() }
 * Assets (CC0, Poly Haven) load asynchronously; onReady fires after the first complete frame.
 */
export const STATION_IDS = ['software', 'ai', 'tools'];

export function createStackScene(canvas, opts = {}) {
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // resolution adapts to the measured cost of a frame on this device (src/three/adaptive.js); nothing else is ever reduced
  const scale = createRenderScale(R, { cap: 1.5, apply: (p) => { R.setPixelRatio(p); if (built) size(); } });
  R.setPixelRatio(scale.pixelRatio);
  const clip = createViewClip(R, canvas);           // only the visible band while the section scrolls in or out
  R.outputEncoding = THREE.sRGBEncoding;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
  R.physicallyCorrectLights = true;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  RectAreaLightUniformsLib.init();

  const S = new THREE.Scene();
  const C = new THREE.PerspectiveCamera(42, 1, 0.1, 9000);
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };
  const L = createLoaders(R, disposables);

  // ---- state shared with the interaction / loop code below ----
  const st = {}, screens = [], leds = [];
  let built = false, dead = false, fan = null, mars = null;

  // the environment-map shaders compile in the background while the assets download
  const pmrem = deferCompile(R, () => { const g = new THREE.PMREMGenerator(R); g.compileEquirectangularShader(); return g; });
  const isDead = () => dead;

  let fetched = 0;
  const asset = (p) => p.then((v) => { reportProgress(canvas, 'Assets', ++fetched, 13); return v; });
  const ready = Promise.all([
    L.pbr('rubber_tiles'), L.pbr('metal_plate'), L.pbr('cracked_red_ground'), L.hdri('empty_warehouse_01'),
    L.model('modular_airduct_rectangular_01'), L.model('modular_airduct_circular_01'), L.model('modular_industrial_pipes_01'),
    L.model('industrial_wall_lamp'), L.model('security_camera_01'), L.model('metal_tool_chest'),
    L.model('rock_07'), L.model('rock_09'), L.model('namaqualand_boulder_02'),
  ].map(asset)).then(async ([floor, plate, ground, hdr, ductRect, ductRound, pipes, lamp, camera, chest, rock07, rock09, boulder]) => {
    await pmrem.done;
    if (dead) return;
    // reflections and soft indirect light from a real interior (HDRI), used as the environment only
    const pm = pmrem.result; const env = pm.fromEquirectangular(hdr); pm.dispose();
    S.environment = env.texture; disposables.push(env);
    // rock scans: matte, dark iron-stained Martian stone
    for (const r of [rock07, rock09, boulder]) r.traverse((m) => { if (m.isMesh) { m.material.roughness = 0.95; m.material.envMapIntensity = 0.1; m.material.color.setRGB(0.52, 0.25, 0.17); } });
    await nextTask(canvas); if (dead) return;
    await build({ floor, plate, ground }, { ductRect, ductRound, pipes, lamp, camera, chest }, { rock07, rock09, boulder });
  });

  // built in steps (one task each), so the page keeps responding while the facility is assembled
  async function build(tex, kits, rocks) {
    const M = createMaterials(tex, keep), H = makeBuilders(S, M, keep);
    buildRoom(S, M, H, kits);
    await nextTask(canvas); if (dead) return;
    mars = buildMars(S, { ground: tex.ground }, rocks, keep, small);
    await nextTask(canvas); if (dead) return;

    // ---- screens: emissive content behind a slightly reflective glass surface ----
    const screenMat = (kind, w, h, seed, station) => {
      const sc = makeScreen(kind, w, h, seed); disposables.push(sc);
      const m = keep(new THREE.MeshStandardMaterial({ color: 0x040506, emissive: 0xffffff, emissiveMap: sc.tex, emissiveIntensity: 0.85, roughness: 0.42, metalness: 0, envMapIntensity: 0.25 }));
      screens.push({ sc, mat: m, station, base: 0.85 }); return m;
    };
    const ledMat = (hex) => keep(new THREE.MeshStandardMaterial({ color: 0x050505, emissive: hex, emissiveIntensity: 2 }));
    const ledG = keep(new THREE.BoxGeometry(0.01, 0.006, 0.004));
    const led = (parent, x, y, z, hex, rate) => { const m = new THREE.Mesh(ledG, ledMat(hex)); m.userData.dynamic = true; m.position.set(x, y, z); parent.add(m); leds.push({ m, rate, ph: Math.random() * 10, base: 2 }); return m; };
    const glowMat = () => keep(new THREE.MeshBasicMaterial({ color: 0xbfd6dd, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, map: M.contact.map, toneMapped: false }));
    const floorGlow = (x, z, w, d, ry = 0) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d)), glowMat()); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.006, z); m.renderOrder = 2; S.add(m); return m; };
    const proxy = (group, w, h, d, x, y, z) => { const m = new THREE.Mesh(H.rbox(w, h, d, 0.01), M.edge); m.position.set(x, y, z); m.visible = false; group.add(m); return m; };
    const world = (g, x, y, z) => { g.updateMatrixWorld(true); return new THREE.Vector3(x, y, z).applyMatrix4(g.matrixWorld); };

    // ---- STATION 01: software & backend workstation, left foreground ----
    {
      const g = new THREE.Group(); g.position.set(-2.5, 0, 2.2); g.rotation.y = 0.48; S.add(g);
      desk(H, M, g, 2.4, 0.85);
      // triple monitors on a pole-mounted arm
      H.cyl(0.02, 0.5, M.steel, g, 0, 0.99, -0.33);
      H.B(1.3, 0.04, 0.04, 0.012, M.gunmetal, g, 0, 1.2, -0.31);
      monitor(H, M, g, screenMat('code', 512, 300, 3, 'software'), 0.6, 0.35, { stand: false, x: 0, y: 1.2, z: -0.26 });
      monitor(H, M, g, screenMat('term', 512, 300, 5, 'software'), 0.6, 0.35, { stand: false, x: -0.62, y: 1.2, z: -0.18, ry: 0.32 });
      monitor(H, M, g, screenMat('db', 512, 300, 7, 'software'), 0.6, 0.35, { stand: false, x: 0.62, y: 1.2, z: -0.18, ry: -0.32 });
      keyboard(H, M, g, -0.05, 0.765, 0.12, 0);
      mug(H, M, g, 0.75, 0.756, 0.15);
      H.B(0.21, 0.004, 0.3, 0.002, M.panelLight, g, -0.75, 0.758, 0.1, 0, 0.2);           // notepad
      tower(H, M, g, 0.85, -0.05, 0);
      chair(H, M, g, -0.05, 0.75, Math.PI + 0.15);
      H.contact(g, 0, 0, 2.6, 1.1, 0.5);
      for (let i = 0; i < 3; i++) led(g, 0.79 + i * 0.03, 0.49, 0.183, i === 2 ? 0xd39a5f : 0x8fb59a, i === 2 ? 0.7 : 0);
      st.software = { group: g, anchor: world(g, 0, 1.95, -0.25), proxy: proxy(g, 2.6, 1.5, 1.5, 0, 0.75, 0.25), glow: floorGlow(...[world(g, 0, 0, 0.3)].map((v) => [v.x, v.z])[0], 3.4, 2.4, 0.5) };
    }
    await nextTask(canvas); if (dead) return;
    // ---- STATION 02: curved analysis console with a 2x2 video wall, centre, against the window ----
    {
      const g = new THREE.Group(); g.position.set(0.7, 0, -5.2); S.add(g);
      const R0 = 3.6, A = 0.42;                      // arc radius (m) and half-angle: the console curves around its operators
      const sector = (r0, r1) => { const s = new THREE.Shape(); s.absarc(0, 0, r1, Math.PI / 2 - A, Math.PI / 2 + A, false); s.absarc(0, 0, r0, Math.PI / 2 + A, Math.PI / 2 - A, true); s.closePath(); return s; };
      const ext = (shape, depth, bevel) => { const e = keep(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 48 })); e.rotateX(-Math.PI / 2); return e; };   // shape y -> -z, extrusion -> up
      const arc = new THREE.Group(); arc.position.set(0, 0, R0 + 0.45); g.add(arc);        // arc centre lies toward the room
      H.add(ext(sector(R0 - 0.02, R0 + 0.78), 0.03, 0.008), M.laminate, arc, 0, 0.738, 0);                       // desk top
      H.add(ext(sector(R0 + 0.06, R0 + 0.72), 0.68, 0), M.gunmetal, arc, 0, 0.04, 0);                            // body
      H.add(ext(sector(R0 + 0.03, R0 + 0.07), 0.6, 0), M.panelDark, arc, 0, 0.08, 0);                            // front fascia
      H.add(ext(sector(R0 + 0.06, R0 + 0.72), 0.04, 0), M.rubber, arc, 0, 0, 0);                                  // plinth
      for (let i = 0; i < 4; i++) {                    // four monitors along the arc, facing its centre
        const a = (i - 1.5) * 0.2, r = R0 + 0.55, px = Math.sin(a) * r, pz = -Math.cos(a) * r;
        monitor(H, M, arc, screenMat(i % 2 ? 'telemetry' : 'analysis', 512, 300, 11 + i, 'ai'), 0.6, 0.35, { x: px, y: 1.05, z: pz, ry: -a });
      }
      for (let i = 0; i < 5; i++) led(arc, Math.sin((i - 2) * 0.05) * (R0 + 0.1), 0.5, -Math.cos((i - 2) * 0.05) * (R0 + 0.1) + 0.05, i % 2 ? 0x8fb59a : 0x86b3bf, i % 2 ? 0 : 1.1);
      // video wall on a steel frame behind the console: four panels with fine seams
      const vw = new THREE.Group(); vw.position.set(0, 0, -0.9); g.add(vw);
      for (const s of [-1, 1]) { H.B(0.08, 3.3, 0.08, 0.01, M.steel, vw, s * 1.75, 1.65, -0.08); H.B(0.5, 0.03, 0.5, 0.008, M.steel, vw, s * 1.75, 0.015, -0.08); }
      H.B(3.5, 0.08, 0.08, 0.01, M.steel, vw, 0, 3.2, -0.08);
      H.B(3.36, 1.92, 0.06, 0.008, M.plastic, vw, 0, 2.2, -0.04);
      const wall = new THREE.Mesh(H.rbox(3.28, 1.84, 0.002, 0.0005), screenMat('analysis', 1024, 576, 13, 'ai')); wall.position.set(0, 2.2, -0.005); vw.add(wall);
      H.B(3.28, 0.006, 0.004, 0.001, M.plastic, vw, 0, 2.2, -0.002, 0, 0, 0, false); H.B(0.006, 1.84, 0.004, 0.001, M.plastic, vw, 0, 2.2, -0.002, 0, 0, 0, false);
      chair(H, M, g, -0.6, 0.5, Math.PI - 0.15); chair(H, M, g, 0.75, 0.45, Math.PI + 0.2);
      H.contact(g, 0, -0.1, 3.8, 1.5, 0.5);
      st.ai = { group: g, anchor: world(g, 0, 3.55, -0.9), proxy: proxy(g, 3.8, 3.4, 2.2, 0, 1.7, -0.4), glow: floorGlow(0.7, -4.8, 4.6, 2.6) };
    }
    await nextTask(canvas); if (dead) return;
    // ---- STATION 03: operations partition with its display, a server rack and a terminal, right ----
    {
      const g = new THREE.Group(); g.position.set(5.4, 0, -2.3); g.rotation.y = -0.8; S.add(g);
      for (const s of [-1, 1]) H.B(0.1, 3.4, 0.16, 0.01, M.structure, g, s * 1.85, 1.7, -0.12);
      H.B(3.8, 0.1, 0.16, 0.01, M.structure, g, 0, 3.4, -0.12);
      for (const [y0, y1, mat] of [[0.05, 1.0, M.panelDark], [1.04, 3.34, M.panel]]) for (let i = 0; i < 3; i++) H.B(1.18, y1 - y0, 0.06, 0.008, mat, g, -1.2 + i * 1.2, (y0 + y1) / 2, -0.14);
      H.B(3.6, 0.04, 0.03, 0.008, M.accent, g, 0, 1.02, -0.1);
      monitor(H, M, g, screenMat('ops', 768, 432, 17, 'tools'), 2.4, 1.35, { stand: false, x: 0, y: 2.15, z: -0.06 });
      const k = new THREE.Group(); k.position.set(-0.7, 0, 0.95); k.rotation.y = 0.25; g.add(k);
      H.B(0.34, 0.95, 0.26, 0.03, M.panelLight, k, 0, 0.475, 0);
      H.B(0.4, 0.04, 0.32, 0.015, M.plastic, k, 0, 0.97, 0.02, -0.25);
      monitor(H, M, k, screenMat('telemetry', 384, 240, 19, 'tools'), 0.4, 0.26, { stand: false, x: 0, y: 1.22, z: -0.02, rx: -0.15 });
      H.contact(g, -0.7, 0.95, 0.6, 0.5, 0.5);
      rack(H, M, g, 2.5, 0.35, 0, (p, x, y, z, i) => led(p, x, y, z, i % 4 ? 0x8fb59a : 0xd39a5f, i % 3 ? 0 : 0.6 + (i % 4) * 0.3));
      if (kits.chest) { const c = kits.chest.clone(); c.position.set(-2.4, 0, 0.4); c.rotation.y = 0.3; c.scale.setScalar(0.95); g.add(c); H.contact(g, -2.4, 0.4, 0.9, 0.6, 0.5); }
      H.contact(g, 0, -0.05, 3.9, 0.5, 0.45);
      const gp = world(g, 0.2, 0, 1.0);
      st.tools = { group: g, anchor: world(g, 0, 3.7, 0), proxy: proxy(g, 5.4, 3.5, 2.0, 0.3, 1.75, 0.4), glow: floorGlow(gp.x, gp.z, 4.4, 2.4, -0.8) };
    }

    // ---- light: low sun through the window, the window's own soft sky light, hemisphere bounce, ceiling fixtures ----
    const sun = new THREE.DirectionalLight(0xe8a07c, 3.6);
    sun.position.copy(mars.SUN_DIR).multiplyScalar(60); sun.target.position.set(0, 0, -2);
    sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 12, bottom: -12, near: 10, far: 140 });
    sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.025;
    S.add(sun, sun.target);
    const win = new THREE.RectAreaLight(0xcf8f6e, 3.6, 15, 3.1); win.position.set(0, 2.5, ROOM.ZB + 0.35); win.lookAt(0, 2.0, 0); S.add(win);
    S.add(new THREE.HemisphereLight(0xa9b4bf, 0x2a221d, 0.22));          // cool interior fill against the warm sun
    for (const [x, z] of [[-2.0, 2.4], [2.6, -2.2]]) { const p = new THREE.PointLight(0xffe9d2, 5, 10, 2); p.position.set(x, ROOM.H - 0.4, z); S.add(p); }

    // the fan of a ventilation unit (round duct kit) turning slowly
    let fanSrc = null; kits.ductRound.traverse((o) => { if (!fanSrc && o.name && o.name.includes('circular_fan')) fanSrc = o; });
    if (fanSrc) { fan = fanSrc.clone(); fan.userData.dynamic = true; fan.position.set(6.4, ROOM.H - 0.5, ROOM.ZB + 0.6); S.add(fan); }

    await nextTask(canvas); if (dead) return;
    bakeStatic(S);
    // the sun and the room are static: render the shadow map once instead of every frame
    R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = true;
    size();
    for (const s of screens) s.sc.update(0, true);
    // textures go to the GPU and every shader compiles in the background first, so the first frame does not freeze the page
    await uploadTextures(R, S, { isDead });
    if (!(await compileAsync(R, S, C, { isDead }))) return;
    built = true; size();
    draw(0);
    if (opts.onReady) requestAnimationFrame(() => { if (!dead) opts.onReady(); });
    sync();
  }

  // ---- camera framing: a 44-60 degree lens at eye height, all three stations in view ----
  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fpos: new THREE.Vector3(), flook: new THREE.Vector3() };
  let W = 1, H = 1;
  function frameFor() {
    if (C.aspect < 0.9) { cam.pos.set(0.7, 2.9, 9.4); cam.look.set(0.7, 1.15, -4.5); C.fov = 62; }       // portrait: a little higher, looking down on the stations
    else if (C.aspect < 1.4) { cam.pos.set(0.6, 1.75, 9.6); cam.look.set(0.7, 1.45, -5); C.fov = 50; }
    else { cam.pos.set(0.5, 1.65, 9.0); cam.look.set(0.6, 1.5, -5); C.fov = 44; }
    C.updateProjectionMatrix();
  }
  function size() {
    const r = canvas.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    R.setSize(W, H, false); C.aspect = W / H; frameFor(); invalidate();
  }

  // ---- interaction: hover + click picking against the station proxies ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, selected = null, extHover = null, down = null;
  function pick(clientX, clientY) {
    if (!built) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, C);
    let best = null, bd = Infinity;
    for (const id of STATION_IDS) { const p = st[id].proxy; p.updateMatrixWorld(); const h = ray.intersectObject(p, false)[0]; if (h && h.distance < bd) { bd = h.distance; best = id; } }
    return best;
  }
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const onMove = (e) => {
    if (e.pointerType === 'mouse') { const id = pick(e.clientX, e.clientY); if (id !== hover) { hover = id; canvas.style.cursor = id ? 'pointer' : ''; if (opts.onHover) opts.onHover(id); invalidate(); } }
    ptr.x = (e.clientX / window.innerWidth) * 2 - 1; ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const onLeave = () => { if (hover) { hover = null; canvas.style.cursor = ''; if (opts.onHover) opts.onHover(null); invalidate(); } };
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, id: pick(e.clientX, e.clientY) }; };
  const onUp = (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8, id = pick(e.clientX, e.clientY);
    if (!moved && id && id === down.id && opts.onSelect) opts.onSelect(id);
    else if (!moved && !id && !down.id && opts.onMiss) opts.onMiss();
    down = null;
  };
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', onLeave, { passive: true });
  canvas.addEventListener('pointerdown', onDown, { passive: true });
  canvas.addEventListener('pointerup', onUp, { passive: true });
  const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // ---- per-frame ----
  let lastAnch = '';
  const tmp = new THREE.Vector3();
  function anchors() {
    const out = {}; let key = '';
    for (const id of STATION_IDS) {
      tmp.copy(st[id].anchor).project(C);
      const x = (tmp.x * 0.5 + 0.5) * W, y = (0.5 - tmp.y * 0.5) * H, on = tmp.z < 1 && x >= 0 && x <= W && y >= 0 && y <= H;
      out[id] = { x, y, on, behind: tmp.z >= 1 }; key += `${x | 0},${y | 0},${on};`;
    }
    if (key !== lastAnch && opts.onAnchors) { lastAnch = key; opts.onAnchors(out); }
  }
  const level = { software: 0, ai: 0, tools: 0 };
  let t = 0, last = 0, raf = 0, running = false, visible = false;
  function invalidate() { if (!running && !dead && built) requestAnimationFrame(() => { if (!running && built && !dead) draw(0); }); }
  function draw(dt) {
    for (const id of STATION_IDS) {
      const want = id === selected ? 1 : id === hover || id === extHover ? 0.75 : 0;
      level[id] = reduce || dt === 0 ? want : level[id] + (want - level[id]) * Math.min(1, dt * 6);
      st[id].glow.material.opacity = 0.22 * level[id];
    }
    for (const s of screens) s.mat.emissiveIntensity = s.base + (s.station ? 0.45 * level[s.station] : 0);
    if (!reduce) for (const s of screens) s.sc.update(t);
    for (const l of leds) if (l.rate) l.m.material.emissiveIntensity = reduce ? l.base : (Math.sin(t * l.rate * 6.28 + l.ph) > -0.2 ? l.base : 0.1);
    if (fan && !reduce) fan.rotation.z = t * 1.2;
    mars.skyMat.uniforms.uTime.value = t; mars.dust.material.uniforms.uTime.value = t;
    const k = reduce ? 0 : 1;
    ptr.sx += (ptr.x - ptr.sx) * 0.05; ptr.sy += (ptr.y - ptr.sy) * 0.05;
    const fp = cam.pos.clone(), fl = cam.look.clone();
    if (selected) { const a = st[selected].anchor; fl.lerp(tmp.set(a.x, a.y - 1.4, a.z), 0.28); fp.lerp(tmp.set(a.x, cam.pos.y, a.z + 7), 0.1); }
    if (dt === 0 || reduce) { cam.fpos.copy(fp); cam.flook.copy(fl); }
    else { const e = 1 - Math.exp(-dt * 2.2); cam.fpos.lerp(fp, e); cam.flook.lerp(fl, e); }
    C.position.copy(cam.fpos).add(tmp.set(k * (Math.sin(t * 0.11) * 0.04 + (fine ? ptr.sx * 0.14 : 0)), k * (Math.sin(t * 0.083) * 0.02 - (fine ? ptr.sy * 0.06 : 0)), 0));
    C.lookAt(cam.flook);
    mars.sky.position.copy(C.position);
    R.render(S, C);
    anchors();
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; t += dt;
    scale.frame(now, clip.update());
    scale.gpuBegin(); draw(dt); scale.gpuEnd();
  }
  function sync() {
    const go = visible && built && !document.hidden && !reduce && !dead;
    if (go && !running) { running = true; last = 0; scale.resume(); raf = requestAnimationFrame(loop); }
    if (!go && running) { running = false; cancelAnimationFrame(raf); }
  }
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => { if (built) size(); }); ro.observe(canvas);
  ready.catch((err) => { if (!dead && opts.onError) opts.onError(err); });

  return {
    setVisible(v) { visible = v; sync(); if (v) invalidate(); },
    setHover(id) { extHover = id; invalidate(); },
    setSelected(id) { selected = id; invalidate(); if (reduce && built) draw(0); },
    dispose() {
      dead = true; running = false; cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis); ro.disconnect();
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp);
      canvas.style.cursor = '';
      disposables.forEach((d) => d && d.dispose && d.dispose());
      pmrem.result.dispose(); scale.dispose(); clip.dispose();
      R.dispose(); R.forceContextLoss();
    },
  };
}

// Merge every static, opaque mesh that shares a material (and shadow setting) into one mesh: hundreds of bevelled parts become
// a few dozen draw calls, in the main pass and the shadow pass. Screens, status lights, the fan, picking proxies, transparent
// overlays and anything marked userData.noBake (the terrain and the rock scans) are left alone.
function bakeStatic(scene) {
  scene.updateMatrixWorld(true);
  const groups = new Map(), merged = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || o.userData.noBake || o.userData.dynamic || o.children.length) return;   // (a mesh with children keeps them)
    const m = o.material;
    if (!m || Array.isArray(m) || m.transparent || m.isShaderMaterial) return;
    let up = o.parent, skip = false; while (up) { if (up.userData.noBake || up.userData.dynamic) skip = true; up = up.parent; }
    if (skip) return;
    const key = m.id + (o.castShadow ? '+s' : '');                    // material ids are unique counters (uuids are random)
    if (!groups.has(key)) groups.set(key, { mat: m, cast: o.castShadow, geos: [], meshes: [] });
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const keepA = m.aoMap ? ['position', 'normal', 'uv', 'uv2'] : ['position', 'normal', 'uv'];
    for (const n of Object.keys(g.attributes)) if (!keepA.includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (m.aoMap && !g.attributes.uv2) g.setAttribute('uv2', g.attributes.uv.clone());
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    groups.get(key).geos.push(g); groups.get(key).meshes.push(o);
  });
  for (const { mat, cast, geos, meshes } of groups.values()) {
    if (meshes.length < 2) { geos.forEach((g) => g.dispose()); continue; }
    const geo = BufferGeometryUtils.mergeBufferGeometries(geos, false); geos.forEach((g) => g.dispose());
    if (!geo) continue;
    for (const o of meshes) o.parent.remove(o);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); merged.push(geo);
  }
  return merged;
}
