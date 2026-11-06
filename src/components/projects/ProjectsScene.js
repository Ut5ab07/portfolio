// Ex Machina–style research corridor: concrete + dark glass, controlled light, soft shadows, polished-floor reflections.
// Everything is built once; per-frame work is camera/light updates only. Requires three@0.128.0.
import * as THREE from 'three';
import { compileAsync, compileShadows, uploadTextures } from '../../three/compileAsync';
import { createRenderScale, createViewClip } from '../../three/adaptive';

export function createProjectsScene(canvas, opts) {
  opts = opts || {};
  var R = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  // resolution adapts to the measured cost of a frame on this device (src/three/adaptive.js)
  var scale = createRenderScale(R, { cap: 1.75, apply: function (p) { R.setPixelRatio(p); size(); } });
  R.setPixelRatio(scale.pixelRatio);
  var clip = createViewClip(R, canvas);             // only the visible band while the section scrolls in or out
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.shadowMap.autoUpdate = false;   // the shadow-casting light follows the camera along the corridor: re-render its map only when it moves
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.2;
  var S = new THREE.Scene(); S.background = new THREE.Color(0x040405); S.fog = new THREE.FogExp2(0x070809, 0.024);
  var C = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
  var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function tex(base, boards, rx, ry) {
    var c = document.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 9000; i++) { g.fillStyle = (rnd() < 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (rnd() * 0.18) + ')'; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2); }
    if (boards) { g.fillStyle = 'rgba(0,0,0,.28)'; for (var y = 0; y < 512; y += 64) g.fillRect(0, y, 512, 2);
      g.fillStyle = 'rgba(0,0,0,.4)'; for (var y2 = 32; y2 < 512; y2 += 128) for (var x2 = 64; x2 < 512; x2 += 192) { g.beginPath(); g.arc(x2, y2, 5, 0, 6.3); g.fill(); } }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
  }
  var conc = new THREE.MeshStandardMaterial({ color: 0x9a9c9e, map: tex('#4a4c4e', true, 1, 1.3), roughness: 0.92 }),
    ceilM = new THREE.MeshStandardMaterial({ color: 0x777a7c, map: tex('#3c3e40', false, 2, 22), roughness: 0.95 }),
    floorM = new THREE.MeshStandardMaterial({ color: 0x2a2b2d, map: tex('#202123', false, 2, 22), roughness: 0.16, metalness: 0.45, transparent: true, opacity: 0.74 }),
    dark = new THREE.MeshStandardMaterial({ color: 0x090a0b, roughness: 0.9 }),
    metal = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.8, roughness: 0.35 }),
    glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1013, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.3, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    stripM = new THREE.MeshBasicMaterial({ color: 0xe9eef2 }), flickM = new THREE.MeshBasicMaterial({ color: 0xe9eef2 }),
    roomM = new THREE.MeshBasicMaterial({ color: 0x2d3338 }), ledM = new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    lineM = new THREE.MeshBasicMaterial({ color: 0x3a3f45 });
  var world = new THREE.Group(); S.add(world); var refl = new THREE.Group(); S.add(refl);
  function add(geo, mat, x, y, z, cast, recv) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !!cast; m.receiveShadow = recv !== false; world.add(m); return m; }
  var floor = add(new THREE.PlaneGeometry(8, 100), floorM, 0, 0, -40); floor.rotation.x = -Math.PI / 2;
  var ceil = add(new THREE.PlaneGeometry(8, 100), ceilM, 0, 5, -40, false); ceil.rotation.x = Math.PI / 2;
  var gPanel = new THREE.BoxGeometry(0.4, 5, 3.88), gPost = new THREE.BoxGeometry(0.14, 5, 0.14);
  for (var z = 8; z > -90; z -= 4) { add(gPanel, conc, -3.95, 2.5, z, true); add(gPost, metal, 3.9, 2.5, z - 2); }
  var back = add(new THREE.PlaneGeometry(110, 5), dark, -4.2, 2.5, -40, false); back.rotation.y = Math.PI / 2;
  var gl = add(new THREE.PlaneGeometry(110, 5), glass, 3.95, 2.5, -40, false); gl.rotation.y = -Math.PI / 2;
  var far = add(new THREE.PlaneGeometry(110, 8), dark, 11, 2.5, -40, false); far.rotation.y = -Math.PI / 2;
  // observation chambers behind the glass: dim lit rooms, one with a figure in silhouette
  [-18, -44, -68].forEach(function (cz) { var r = add(new THREE.PlaneGeometry(7, 3), roomM, 10.9, 2.4, cz, false); r.rotation.y = -Math.PI / 2; var rr = new THREE.Mesh(r.geometry, roomM); rr.position.set(10.9, -2.4, cz); rr.rotation.y = -Math.PI / 2; refl.add(rr); });
  add(new THREE.CylinderGeometry(0.2, 0.27, 1.3, 10), dark, 9.2, 0.9, -18, false); add(new THREE.SphereGeometry(0.19, 12, 10), dark, 9.2, 1.75, -18, false);
  // structural ribs (cast the long soft shadows)
  var gTop = new THREE.BoxGeometry(8.4, 0.38, 0.6), gSide = new THREE.BoxGeometry(0.3, 5, 0.6);
  for (var rz = 0; rz > -90; rz -= 9) { add(gTop, conc, 0, 4.8, rz, true); add(gSide, conc, -3.65, 2.5, rz, true); add(gSide, conc, 3.65, 2.5, rz, true); }
  // recessed ceiling strips + their reflections in the polished floor
  var gStrip = new THREE.BoxGeometry(0.22, 0.04, 3.2), flick = null;
  for (var sz = 4.5, k = 0; sz > -90; sz -= 9, k++) [-1.6, 1.6].forEach(function (sx, j) {
    var mat = (k === 3 && j === 0) ? flickM : stripM; add(gStrip, mat, sx, 4.93, sz, false, false);
    var m = new THREE.Mesh(gStrip, mat); m.position.set(sx, -4.93, sz); refl.add(m); });
  [-2.7, 2.7].forEach(function (lx) { var l = add(new THREE.PlaneGeometry(0.05, 100), lineM, lx, 0.006, -40, false, false); l.rotation.x = -Math.PI / 2; });
  // lights: cool controlled white, one faint red accent
  S.add(new THREE.HemisphereLight(0x8a96a3, 0x0a0a0c, 0.3));
  for (var lz = 0; lz > -90; lz -= 18) { var pl = new THREE.PointLight(0xdfe7ee, 0.85, 24, 2); pl.position.set(0, 4.5, lz); S.add(pl); }
  var dl = new THREE.DirectionalLight(0xcfd8e0, 0.6); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048);
  var sc = dl.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 16; sc.bottom = -16; sc.near = 0.5; sc.far = 30; dl.shadow.bias = -0.0006; S.add(dl, dl.target);
  var led1 = add(new THREE.SphereGeometry(0.035, 8, 8), ledM, -3.72, 1.25, -30, false, false), led2 = add(new THREE.SphereGeometry(0.035, 8, 8), ledM, -3.72, 1.25, -62, false, false);
  var rl1 = new THREE.PointLight(0xff1a1a, 0.4, 6, 2); rl1.position.set(-3.4, 1.25, -30); var rl2 = rl1.clone(); rl2.position.z = -62; S.add(rl1, rl2);
  function size() { var w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight; R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); }
  var ro = new ResizeObserver(size); ro.observe(canvas); size();
  var tx = 0, ty = 0, mx = 0, my = 0, sp = 0; function onMove(e) { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }
  window.addEventListener('pointermove', onMove);
  var shadowZ = NaN, shadowSkip = true, t0 = performance.now(), raf = 0, vis = true, vp = true, run = false, ready = false, dead = false;
  function sync() { var n = ready && vis && vp; if (n && !run) { run = true; scale.resume(); frame(); } else if (!n) { run = false; cancelAnimationFrame(raf); } }
  function onVis() { vis = !document.hidden; sync(); } document.addEventListener('visibilitychange', onVis);
  function frame() {
    if (!run) return; raf = requestAnimationFrame(frame);
    var t = (performance.now() - t0) / 1000, p = opts.getProgress ? opts.getProgress() : 0;
    sp += (p - sp) * 0.06; mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
    var z = 5 - sp * 42;
    C.position.set(mx * 0.5, 1.65 - my * 0.25 + Math.sin(t * 0.4) * 0.015, z); C.lookAt(mx * 0.9, 1.55 - my * 0.3, z - 12);
    dl.position.set(-2.5, 6.5, z + 3); dl.target.position.set(1.5, 0, z - 7); dl.target.updateMatrixWorld();
    // while the camera travels the map is redrawn every other frame; when it comes to rest the pending update lands next frame
    if (!(Math.abs(z - shadowZ) < 1e-6)) { shadowSkip = !shadowSkip; if (!shadowSkip || !(Math.abs(z - shadowZ) > 1e-3)) { shadowZ = z; R.shadowMap.needsUpdate = true; } }
    var f = Math.sin(t * 0.55) > 0.992 ? 1 - 0.35 * Math.random() : 1; flickM.color.setScalar(0.91 * f);
    var pu = 0.5 + 0.5 * Math.sin(t * 1.6); rl1.intensity = rl2.intensity = 0.2 + 0.4 * pu; ledM.color.setRGB(0.35 + 0.65 * pu, 0.04, 0.04);
    scale.frame(performance.now(), clip.update()); scale.gpuBegin(); R.render(S, C); scale.gpuEnd();
  }
  // textures and shaders go to the GPU in the background first, so the first frame does not freeze the page
  var isDead = function () { return dead; };
  uploadTextures(R, S, { isDead: isDead }).then(function () { return compileAsync(R, S, C, { isDead: isDead }); }).then(function (ok) {
    return ok && compileShadows(R, S, C, { isDead: isDead });   // the shadow pass's own programs too
  }).then(function (ok) {
    if (!ok) return; ready = true; sync(); if (opts.onReady) requestAnimationFrame(function () { if (!dead) opts.onReady(); });
  }).catch(function (err) { if (opts.onError) opts.onError(err); else console.warn(err); });
  function dispose() {
    dead = true; run = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); ro.disconnect();
    S.traverse(function (o) { if (o.geometry) o.geometry.dispose(); var m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(function (x) { if (x.map) x.map.dispose(); x.dispose(); }); });
    scale.dispose(); clip.dispose(); R.dispose(); if (R.forceContextLoss) R.forceContextLoss();
  }
  return { setVisible: function (v) { vp = v; sync(); }, dispose: dispose };
}
