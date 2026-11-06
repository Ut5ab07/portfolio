// Inception-inspired folding city, lit as a late-afternoon street: cool slate/stone city, desaturated blue-grey sky + haze, soft neutral
// sun with a faint peach tint, warm light ONLY in lamps and a few windows. Proper sRGB colour pipeline (textures tagged, hex colours converted,
// gamma pass after bloom) so mid-tones are not crushed.
// Inception-inspired folding city. A street receding to a vanishing point; slender towers are hinged at the building line and lean
// inward over the street (left/right towers interleave in z so they never collide); the far end of the street folds up into two
// walls that open onto a luminous slit. Everything is driven by ONE value: smoothed scroll progress `ps` (0..1), so scrolling back
// reverses the fold exactly. Geometry/materials are built once; the loop only sets rotations, camera and light positions.
// Requires three@0.128.0.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { compileAsync, compileShadows, uploadTextures, nextTask } from '../../three/compileAsync';
import { createRenderScale, isConstrainedDevice } from '../../three/adaptive';

// The scene is assembled in steps (a generator, one step per task) so that preparing it never blocks the page for long; the
// steps run in exactly the original order, so the result is identical. setVisible / dispose work at any point.
export function createContactScene(canvas, opts) {
  var api = { vis: true, dead: false, impl: null, R: null };
  var gen = buildContact(canvas, opts, api);
  function step() {
    if (api.dead) return;
    var r;
    try { r = gen.next(); } catch (err) { if (opts && opts.onError) opts.onError(err); else console.warn(err); return; }
    if (!r.done) nextTask().then(step);
  }
  step();                                                          // the first step (renderer, camera) runs at once, as before
  return {
    setVisible: function (b) { api.vis = b; if (api.impl) api.impl.setVisible(b); },
    dispose: function () { api.dead = true; if (api.impl) api.impl.dispose(); else if (api.R) { api.R.dispose(); if (api.R.forceContextLoss) api.R.forceContextLoss(); } },
  };
}

function* buildContact(canvas, opts, api) {
  opts = opts || {};
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var R = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); api.R = R;
  // resolution adapts to the measured cost of a frame on this device (src/three/adaptive.js); composer follows in size()
  var scale = createRenderScale(R, { cap: 1.75, apply: function (p) { R.setPixelRatio(p); if (composer) composer.setPixelRatio(p); size(); } });
  R.setPixelRatio(scale.pixelRatio); R.outputEncoding = THREE.sRGBEncoding;
  // build-time sizes follow the device's capability, not its screen size: phones get the same city, shadows and light shafts
  var lite = isConstrainedDevice(R);
  if (!lite) { R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.shadowMap.autoUpdate = false; }   // re-rendered only when the scroll progress moves (see step)
  function lin(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }      // author colours as sRGB hex, feed the renderer linear values
  function srgb(t) { t.encoding = THREE.sRGBEncoding; return t; }
  R.setClearColor(lin('#8e9aa9'), 1);                                             // if anything ever fails to fill the frame, show haze - never a black void
  var S = new THREE.Scene(); S.fog = new THREE.FogExp2(lin('#a8b6c6'), 0.0085);   // cool atmospheric haze: far buildings get lighter and softer
  var C = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  var seed = 29; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var rad = function (d) { return d * Math.PI / 180; };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var unit = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D();
  // ---------- architecture constants (world units): 2 bays across a 4.6 unit tower face, 3.4 unit floors, 4.2 unit ground floor ----------
  var BAY = 2.3, FLOOR = 3.4, HG = 4.2, LEN = 4.6, TILE_W = BAY * 4, TILE_H = FLOOR * 4, TS = lite ? 256 : 512;
  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function scaled(src, w, h) { if (src.width === w && src.height === h) return src; var c = cv(w, h); c.getContext('2d').drawImage(src, 0, 0, w, h); return c; }
  function tex(c, color) { var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return color ? srgb(t) : t; }
  function normalFrom(hc, str) {                                                 // height canvas -> tangent-space normal map (seamless: wraps at the edges)
    var w = hc.width, h = hc.height, d = hc.getContext('2d').getImageData(0, 0, w, h).data, out = cv(w, h), og = out.getContext('2d'), od = og.createImageData(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var l = d[(y * w + (x + w - 1) % w) << 2], r = d[(y * w + (x + 1) % w) << 2], u = d[(((y + h - 1) % h) * w + x) << 2], dn = d[(((y + 1) % h) * w + x) << 2];
      var dx = (l - r) * str / 255, dy = (dn - u) * str / 255, inv = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) << 2;
      od.data[i] = (dx * inv * 0.5 + 0.5) * 255; od.data[i + 1] = (dy * inv * 0.5 + 0.5) * 255; od.data[i + 2] = inv * 255; od.data[i + 3] = 255;
    }
    og.putImageData(od, 0, 0); return out;
  }
  // UVs follow WORLD size so window scale is identical on every face and stays constant while a building folds. ou/ov shift the pattern (whole bays / floors).
  function boxUV(geo, w, h, l, tw, th, ou, ov) {
    var uv = geo.attributes.uv, F = [[l, h], [l, h], [w, l], [w, l], [w, h], [w, h]];
    for (var f = 0; f < 6; f++) { var cap = f === 2 || f === 3, su = F[f][0] / (cap ? 4 : tw), sv = F[f][1] / (cap ? 4 : th), o1 = cap ? 0 : ou, o2 = cap ? 0 : ov;
      for (var i = 0; i < 4; i++) { var k = f * 4 + i; uv.setXY(k, uv.getX(k) * su + o1, uv.getY(k) * sv + o2); } }
    uv.needsUpdate = true;
  }
  function merge(list) {                                                        // many small boxes/planes -> ONE geometry (one draw call per building per material)
    var np = 0, ni = 0, k, j; list.forEach(function (g) { np += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    var P = new Float32Array(np * 3), N = new Float32Array(np * 3), U = new Float32Array(np * 2), I = np < 65536 ? new Uint16Array(ni) : new Uint32Array(ni), po = 0, io = 0;
    list.forEach(function (g) { var p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = p.count; P.set(p.array, po * 3); N.set(n.array, po * 3); U.set(u.array, po * 2);
      if (g.index) { for (k = 0; k < g.index.count; k++) I[io + k] = g.index.array[k] + po; io += g.index.count; } else { for (j = 0; j < c; j++) I[io + j] = po + j; io += c; } po += c; g.dispose(); });
    var m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2)); m.setIndex(new THREE.BufferAttribute(I, 1)); return m;
  }
  function part(list, w, h, l, x, y, z) { var g = new THREE.BoxGeometry(w, h, l); boxUV(g, w, h, l, 4, 4, 0, 0); g.translate(x, y, z); list.push(g); }
  // ---------- facade painting: colour + height (-> normal map: recessed glass, raised frames/sills/lintels) + roughness (glass is smooth) + emissive (interiors) ----------
  function win(T, x, y, w, h, o) {                                               // (x,y) = top-left of the GLASS in canvas px
    var g = T.g, hg = T.hg, rg = T.rg, eg = T.eg, fr = o.frame || '#cfd0cf';
    hg.fillStyle = '#b4b4b4'; hg.fillRect(x - 7, y - 9, w + 14, h + 16); hg.fillStyle = '#2c2c2c'; hg.fillRect(x, y, w, h); hg.fillStyle = '#d2d2d2'; hg.fillRect(x - 10, y + h, w + 20, 7);
    if (o.lintel) hg.fillRect(x - 10, y - 15, w + 20, 8);
    g.fillStyle = fr; g.fillRect(x - 7, y - 9, w + 14, h + 16);
    if (o.lintel) { g.fillStyle = '#d6d6d3'; g.fillRect(x - 10, y - 15, w + 20, 8); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x - 10, y - 7, w + 20, 3); }
    g.fillStyle = '#d9d9d6'; g.fillRect(x - 10, y + h, w + 20, 7); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 10, y + h + 7, w + 20, 4);
    var gl = g.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, o.glassTop || '#33465c'); gl.addColorStop(1, '#101823'); g.fillStyle = gl; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(190,212,238,.26)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.7, y); g.lineTo(x, y + h * 0.55); g.fill();
    g.fillStyle = fr; g.fillRect(x + w / 2 - 1.5, y, 3, h); g.fillRect(x, y + h * 0.32, w, 3); hg.fillStyle = '#9a9a9a'; hg.fillRect(x + w / 2 - 1.5, y, 3, h); hg.fillRect(x, y + h * 0.32, w, 3);
    var sh = g.createLinearGradient(0, y, 0, y + 10); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(x, y, w, 10);          // recess shadow: top
    var sl = g.createLinearGradient(x, 0, x + 8, 0); sl.addColorStop(0, 'rgba(0,0,0,.4)'); sl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sl; g.fillRect(x, y, 8, h);                 // and left
    rg.fillStyle = 'rgb(0,60,0)'; rg.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(20,25,32,.10)'; g.fillRect(x + 3, y + h + 11, w - 6, 14 + rnd() * 34);                                                                                           // dirt streak under the sill
    if (rnd() < o.lit) { var a = 0.45 + 0.45 * rnd(), col = rnd() < 0.12 ? '232,240,255' : '255,236,205', e2 = eg.createLinearGradient(0, y, 0, y + h);
      e2.addColorStop(0, 'rgba(' + col + ',' + a * 0.5 + ')'); e2.addColorStop(1, 'rgba(' + col + ',' + a + ')'); eg.fillStyle = e2; eg.fillRect(x + 2, y + 2, w - 4, h - 4);
      if (rnd() < 0.5) { g.fillStyle = 'rgba(220,214,200,.35)'; g.fillRect(x + 2, y + 2, w * (0.25 + 0.3 * rnd()), h - 4); } }                                                            // curtain
  }
  function arch(g, x, y, w, h, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); }
  function bundle(w, h, base, rough) {
    var c = cv(w, h), hc = cv(w, h), rc = cv(w, h), ec = cv(w, h), g = c.getContext('2d'), hg = hc.getContext('2d'), rg = rc.getContext('2d'), eg = ec.getContext('2d');
    var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    hg.fillStyle = '#808080'; hg.fillRect(0, 0, w, h); rg.fillStyle = 'rgb(0,' + rough + ',0)'; rg.fillRect(0, 0, w, h); eg.fillStyle = '#000'; eg.fillRect(0, 0, w, h);
    for (var i = 0; i < 2200; i++) { var sx = rnd() * w, sy = rnd() * h; g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; g.fillRect(sx, sy, 1 + rnd() * 3, 1 + rnd() * 3); hg.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; hg.fillRect(sx, sy, 2, 2); }
    return { c: c, hc: hc, rc: rc, ec: ec, T: { g: g, hg: hg, rg: rg, eg: eg } };
  }
  function finish(B, str) {
    var W = B.c.width, H = B.c.height, k = TS / 512;
    return { map: tex(scaled(B.c, W * k, H * k), true), normal: tex(normalFrom(scaled(B.hc, W * k, H * k), str), false), rough: tex(scaled(B.rc, W / 2, H / 2), false), emis: tex(scaled(B.ec, W / 2, H / 2), true) };
  }
  // upper-floor facade styles: 0 limestone (tall piano-nobile windows, lintels), 1 plaster + shutters, 2 dark masonry, 3 concrete ribbon windows, 4 curtain-wall glass.  4 bays x 4 floors per tile.
  function facadeSet(st) {
    var B = bundle(512, 512, [['#b9b6af', '#a7a5a0'], ['#c3c6c8', '#b0b5ba'], ['#80868f', '#6d737d'], ['#9ca0a5', '#898d93'], ['#5b6a7e', '#47556b']][st], 220), T = B.T, g = T.g, hg = T.hg, lit = [0.10, 0.12, 0.08, 0.10, 0.12][st];
    if (st === 0 || st === 2) for (var y0 = 0; y0 < 512; y0 += 16) { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(0, y0, 512, 1); hg.fillStyle = '#6c6c6c'; hg.fillRect(0, y0, 512, 1); }
    for (var r = 0; r < 4; r++) {
      var yb = 512 - r * 128, yt = yb - 128;
      g.fillStyle = 'rgba(235,235,232,.35)'; g.fillRect(0, yb - 8, 512, 5); hg.fillStyle = '#bdbdbd'; hg.fillRect(0, yb - 8, 512, 5); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, yb - 3, 512, 4);   // floor line + its shadow
      for (var b = 0; b < 4; b++) {
        var cx = b * 128 + 64, tall = r === 1;
        if (st === 0) win(T, cx - 31, yt + (tall ? 12 : 24), 62, tall ? 108 : 76, { frame: '#d3d2cc', lintel: true, lit: lit });
        else if (st === 1) { var wy = yt + (tall ? 14 : 24), wh = tall ? 100 : 76;
          win(T, cx - 27, wy, 54, wh, { frame: '#e1e2e0', lit: lit });
          [[cx - 55, 24], [cx + 31, 24]].forEach(function (s) { g.fillStyle = '#62748b'; g.fillRect(s[0], wy - 2, s[1], wh + 4); hg.fillStyle = '#9a9a9a'; hg.fillRect(s[0], wy - 2, s[1], wh + 4);
            g.fillStyle = 'rgba(0,0,0,.26)'; for (var q = wy; q < wy + wh; q += 6) g.fillRect(s[0], q, s[1], 1); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(s[0], wy - 2, 3, wh + 4); }); }
        else if (st === 2) win(T, cx - 25, yt + 28, 50, 66, { frame: '#b8bcc1', lintel: true, lit: lit });
        else if (st === 3) win(T, b * 128 + 6, yt + 30, 116, 54, { frame: '#aeb2b6', lit: lit });
        else { var px = b * 128 + 5;                                               // curtain wall: spandrel + glass + mullions
          g.fillStyle = '#4c5b70'; g.fillRect(px, yb - 42, 118, 34); hg.fillStyle = '#707070'; hg.fillRect(px, yb - 42, 118, 34);
          var cg = g.createLinearGradient(0, yt + 8, 0, yb - 44); cg.addColorStop(0, '#3a4d66'); cg.addColorStop(1, '#16202e'); g.fillStyle = cg; g.fillRect(px, yt + 8, 118, 78); hg.fillStyle = '#383838'; hg.fillRect(px, yt + 8, 118, 78);
          g.fillStyle = 'rgba(195,215,240,.28)'; g.beginPath(); g.moveTo(px, yt + 8); g.lineTo(px + 70, yt + 8); g.lineTo(px, yt + 52); g.fill(); T.rg.fillStyle = 'rgb(0,50,0)'; T.rg.fillRect(px, yt + 8, 118, 78);
          if (rnd() < lit) { var ea = 0.4 + 0.4 * rnd(); T.eg.fillStyle = 'rgba(255,236,205,' + ea + ')'; T.eg.fillRect(px + 2, yt + 10, 114, 74); } }
      }
    }
    if (st === 4) { g.fillStyle = '#cfd3d8'; hg.fillStyle = '#a8a8a8'; for (var m = 0; m < 4; m++) { g.fillRect(m * 128 + 1, 0, 6, 512); hg.fillRect(m * 128 + 1, 0, 6, 512); } }
    if (st < 2) { g.fillStyle = 'rgba(255,255,255,.09)'; hg.fillStyle = '#9c9c9c'; for (var pb = 0; pb < 4; pb++) { g.fillRect(pb * 128 - 4, 0, 8, 512); hg.fillRect(pb * 128 - 4, 0, 8, 512); } }   // pilasters between bays
    return finish(B, 3.2);
  }
  // ground floors (one 4.2 unit storey): 0 shopfronts + doorway, 1 rusticated stone with arched windows/door, 2 modern glazed frontage.  4 bays x 1 storey per tile.
  function groundSet(gs) {
    var B = bundle(512, 256, [['#8c929a', '#7e848c'], ['#a3a6aa', '#929599'], ['#a1a5aa', '#8f9399']][gs], 215), T = B.T, g = T.g, hg = T.hg, rg = T.rg, eg = T.eg;
    function shop(x0, litP) {
      g.fillStyle = '#363f4b'; g.fillRect(x0 + 8, 14, 112, 42); hg.fillStyle = '#b0b0b0'; hg.fillRect(x0 + 8, 14, 112, 42);
      g.fillStyle = 'rgba(216,218,221,.8)'; for (var i = 0, xx = x0 + 22; i < 4; i++) { var bw = 8 + rnd() * 18; g.fillRect(xx, 30, bw, 8); xx += bw + 6; }
      g.fillStyle = '#2a313b'; g.fillRect(x0 + 10, 70, 108, 150); hg.fillStyle = '#b0b0b0'; hg.fillRect(x0 + 10, 70, 108, 150);
      var gl = g.createLinearGradient(0, 76, 0, 214); gl.addColorStop(0, '#35465a'); gl.addColorStop(1, '#121a24'); g.fillStyle = gl; g.fillRect(x0 + 16, 76, 96, 138); hg.fillStyle = '#2c2c2c'; hg.fillRect(x0 + 16, 76, 96, 138);
      g.fillStyle = 'rgba(190,212,238,.24)'; g.beginPath(); g.moveTo(x0 + 16, 76); g.lineTo(x0 + 80, 76); g.lineTo(x0 + 16, 130); g.fill();
      g.fillStyle = '#2a313b'; g.fillRect(x0 + 62, 76, 4, 138); g.fillRect(x0 + 16, 120, 96, 3); rg.fillStyle = 'rgb(0,55,0)'; rg.fillRect(x0 + 16, 76, 96, 138);
      g.fillStyle = '#3a424d'; g.fillRect(x0 + 10, 220, 108, 24);
      if (rnd() < litP) { var e2 = eg.createLinearGradient(0, 76, 0, 214); e2.addColorStop(0, 'rgba(255,236,205,.35)'); e2.addColorStop(1, 'rgba(255,236,205,' + (0.55 + 0.3 * rnd()) + ')'); eg.fillStyle = e2; eg.fillRect(x0 + 18, 78, 92, 134);
        g.fillStyle = 'rgba(215,205,185,.25)'; for (var s = 0; s < 3; s++) g.fillRect(x0 + 20, 100 + s * 36, 88, 3); }
    }
    function door(x0, col) {
      arch(g, x0 + 26, 56, 76, 200, '#b9bcc0'); arch(hg, x0 + 26, 56, 76, 200, '#c0c0c0'); arch(g, x0 + 36, 66, 56, 190, col); arch(hg, x0 + 36, 66, 56, 190, '#222');
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x0 + 63, 130, 2, 120); arch(g, x0 + 36, 66, 56, 190, 'rgba(0,0,0,.25)');
      if (rnd() < 0.5) { eg.fillStyle = 'rgba(255,236,205,' + (0.4 + 0.4 * rnd()) + ')'; eg.fillRect(x0 + 44, 76, 40, 26); }
    }
    for (var b = 0; b < 4; b++) {
      var x0 = b * 128;
      if (gs === 0) { if (b === 1) door(x0, '#1a222c'); else shop(x0, 0.55); }
      else if (gs === 1) {
        if (b === 1) door(x0, '#262c36');
        else { arch(g, x0 + 30, 70, 68, 130, '#cfd2d4'); arch(hg, x0 + 30, 70, 68, 130, '#c0c0c0'); arch(g, x0 + 38, 78, 52, 118, '#1c2733'); arch(hg, x0 + 38, 78, 52, 118, '#262626'); arch(rg, x0 + 38, 78, 52, 118, 'rgb(0,60,0)');
          g.fillStyle = '#7d848d'; for (var q = 0; q < 5; q++) g.fillRect(x0 + 42 + q * 10, 100, 2, 96);
          if (rnd() < 0.35) arch(eg, x0 + 40, 80, 48, 110, 'rgba(255,236,205,' + (0.4 + 0.4 * rnd()) + ')'); }
      } else {
        g.fillStyle = '#b7bbc0'; g.fillRect(x0 - 7, 0, 14, 256); hg.fillStyle = '#b0b0b0'; hg.fillRect(x0 - 7, 0, 14, 256);
        g.fillStyle = '#394250'; g.fillRect(x0 + 10, 14, 108, 36); hg.fillStyle = '#b0b0b0'; hg.fillRect(x0 + 10, 14, 108, 36); g.fillStyle = 'rgba(216,218,221,.8)'; g.fillRect(x0 + 28, 28, 48 + rnd() * 30, 8);
        var gl2 = g.createLinearGradient(0, 62, 0, 232); gl2.addColorStop(0, '#34465b'); gl2.addColorStop(1, '#111924'); g.fillStyle = gl2; g.fillRect(x0 + 10, 62, 108, 170); hg.fillStyle = '#2c2c2c'; hg.fillRect(x0 + 10, 62, 108, 170);
        g.fillStyle = '#8e969f'; g.fillRect(x0 + 10 + 36, 62, 3, 170); g.fillRect(x0 + 10 + 72, 62, 3, 170); rg.fillStyle = 'rgb(0,50,0)'; rg.fillRect(x0 + 10, 62, 108, 170);
        if (b === 1) { g.fillStyle = '#cfd3d8'; g.fillRect(x0 + 24, 120, 3, 90); g.fillRect(x0 + 100, 120, 3, 90); }
        if (rnd() < 0.6) { var e3 = eg.createLinearGradient(0, 62, 0, 232); e3.addColorStop(0, 'rgba(255,236,205,.3)'); e3.addColorStop(1, 'rgba(255,236,205,.7)'); eg.fillStyle = e3; eg.fillRect(x0 + 12, 64, 104, 166); }
      }
    }
    g.fillStyle = '#575d66'; g.fillRect(0, 242, 512, 14); hg.fillStyle = '#707070'; hg.fillRect(0, 242, 512, 14);                                       // plinth
    if (gs === 1) for (var y1 = 0; y1 < 242; y1 += 28) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, y1, 512, 2); hg.fillStyle = '#686868'; hg.fillRect(0, y1, 512, 2); }
    return finish(B, 3.2);
  }
  var TINTS = ['#ffffff', '#e9eef6', '#f3efe8'];
  function stdMat(t, tint) { return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughnessMap: t.rough, roughness: 1, metalness: 0, emissiveMap: t.emis, emissive: lin('#fff0d8'), emissiveIntensity: 0.6, color: lin(tint) }); }
  yield;
  var upperTex = [], groundTex = [], fi;
  for (fi = 0; fi < 5; fi++) { upperTex.push(facadeSet(fi)); yield; }
  for (fi = 0; fi < 3; fi++) { groundTex.push(groundSet(fi)); yield; }
  var upperMats = upperTex.map(function (t) { return TINTS.map(function (c) { return stdMat(t, c); }); }), groundMats = groundTex.map(function (t) { return TINTS.map(function (c) { return stdMat(t, c); }); });
  var winMats = []; upperMats.concat(groundMats).forEach(function (a) { a.forEach(function (m) { winMats.push(m); }); });
  function plain(base, rough, draw) { var c = cv(128, 128), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 128, 128); for (var i = 0; i < 700; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2); } if (draw) draw(g); return new THREE.MeshStandardMaterial({ map: tex(c, true), roughness: rough, metalness: 0 }); }
  var trimMat = plain('#bcbfc3', 0.88), concrete = plain('#8f939a', 0.95), roofSlab = plain('#6a7078', 0.9);
  var soffit = plain('#6c7179', 0.95, function (g) { g.fillStyle = 'rgba(0,0,0,.30)'; for (var i = 0; i < 128; i += 32) { g.fillRect(i, 0, 3, 128); g.fillRect(0, i, 128, 3); } g.fillStyle = 'rgba(255,255,255,.07)'; for (var j = 3; j < 128; j += 32) { g.fillRect(j, 0, 2, 128); g.fillRect(0, j, 128, 2); } });
  var roofMat = plain('#4f5967', 0.62, function (g) { g.fillStyle = 'rgba(0,0,0,.28)'; for (var y = 0; y < 128; y += 8) g.fillRect(0, y, 128, 1); g.fillStyle = 'rgba(255,255,255,.05)'; for (var y2 = 1; y2 < 128; y2 += 8) g.fillRect(0, y2, 128, 1); });
  roofMat.map.repeat.set(6, 2);
  var railC = cv(128, 64), rgx = railC.getContext('2d'); rgx.fillStyle = '#fff'; rgx.fillRect(0, 0, 128, 5); rgx.fillRect(0, 52, 128, 4); for (var rb = 4; rb < 128; rb += 32) rgx.fillRect(rb, 0, 3, 60);
  var railMat = new THREE.MeshStandardMaterial({ map: tex(railC, true), alphaTest: 0.5, side: THREE.DoubleSide, color: lin('#2a2f38'), roughness: 0.6, metalness: 0 });
  // ---------- street ----------
  function roadTile(kind) {                                                       // neutral asphalt: gutters, tyre-worn lanes, repair patches, cracks, worn paint; roughness map: worn lanes are smoother
    var c = cv(128, 256), g = c.getContext('2d'), rc = cv(128, 256), rg = rc.getContext('2d'), i;
    g.fillStyle = '#4a4e55'; g.fillRect(0, 0, 128, 256); rg.fillStyle = 'rgb(0,215,0)'; rg.fillRect(0, 0, 128, 256);
    for (i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.14)'; g.fillRect(rnd() * 128, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
    [[26, 18], [84, 18]].forEach(function (b) { g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(b[0], 0, b[1], 256); rg.fillStyle = 'rgb(0,165,0)'; rg.fillRect(b[0], 0, b[1], 256); });
    for (i = 0; i < 4; i++) { var px = 8 + rnd() * 90, py = rnd() * 230; g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '0,0,0,.12' : '255,255,255,.04') + ')'; g.fillRect(px, py, 16 + rnd() * 24, 10 + rnd() * 26); }
    g.strokeStyle = 'rgba(10,12,16,.45)'; g.lineWidth = 1; for (i = 0; i < 7; i++) { var cx = rnd() * 128, cy = rnd() * 256; g.beginPath(); g.moveTo(cx, cy); for (var s = 0; s < 5; s++) { cx += (rnd() - 0.5) * 14; cy += rnd() * 12; g.lineTo(cx, cy); } g.stroke(); }
    g.fillStyle = 'rgba(10,12,16,.35)'; g.fillRect(0, 0, 10, 256); g.fillRect(118, 0, 10, 256);                                             // gutters beside the curbs
    g.fillStyle = 'rgba(230,233,238,.80)'; var lx = kind === 'center' ? 61 : 96; for (var y = 0; y < 256; y += 64) g.fillRect(lx, y + 8, 5, 34);
    g.fillRect(14, 0, 3, 256); g.fillRect(111, 0, 3, 256);
    for (i = 0; i < 700; i++) { g.fillStyle = 'rgba(74,78,85,' + (0.35 + 0.4 * rnd()) + ')'; g.fillRect(rnd() * 128, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 3); }   // paint wear: asphalt showing through
    rg.fillStyle = 'rgb(0,185,0)'; rg.fillRect(lx, 0, 5, 256); return { map: tex(c, true), rough: tex(rc, false) };
  }
  function paving() {                                                             // 1.5 x 1.5 unit slabs, per-slab tint, joints (also a bump map), stains
    var c = cv(128, 256), g = c.getContext('2d'), hc = cv(128, 256), hg = hc.getContext('2d'), i, j;
    hg.fillStyle = '#c0c0c0'; hg.fillRect(0, 0, 128, 256);
    for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) { var v = 0.9 + 0.2 * rnd(); g.fillStyle = 'rgb(' + ((141 * v) | 0) + ',' + ((144 * v) | 0) + ',' + ((150 * v) | 0) + ')'; g.fillRect(i * 64, j * 128, 64, 128); }
    for (i = 0; i < 2200; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.10)'; g.fillRect(rnd() * 128, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (i = 0; i < 5; i++) { g.fillStyle = 'rgba(30,34,40,.10)'; g.beginPath(); g.ellipse(rnd() * 128, rnd() * 256, 6 + rnd() * 12, 5 + rnd() * 9, 0, 0, 6.3); g.fill(); }
    g.fillStyle = 'rgba(35,40,48,.55)'; hg.fillStyle = '#303030'; [0, 64].forEach(function (x) { g.fillRect(x, 0, 2, 256); hg.fillRect(x, 0, 2, 256); }); [0, 128].forEach(function (y) { g.fillRect(0, y, 128, 2); hg.fillRect(0, y, 128, 2); });
    var t = tex(c, true), b = tex(hc, false); t.repeat.set(1, 38); b.repeat.set(1, 38); return { map: t, bump: b };
  }
  var rt0 = roadTile('center'); rt0.map.repeat.set(1, 114 / 8); rt0.rough.repeat.set(1, 114 / 8);
  var road = new THREE.Mesh(new THREE.PlaneGeometry(8, 114), new THREE.MeshStandardMaterial({ map: rt0.map, roughnessMap: rt0.rough, roughness: 1, metalness: 0 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -43); road.receiveShadow = true; S.add(road);
  var pv = paving(), walkMat = new THREE.MeshStandardMaterial({ map: pv.map, bumpMap: pv.bump, bumpScale: 0.8, roughness: 0.9, metalness: 0 }), curbMat = plain('#a3a8af', 0.85);
  [-1, 1].forEach(function (s) {
    var w = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 114), walkMat); w.position.set(s * 5.5, 0.15, -43); w.receiveShadow = true; S.add(w);
    var cb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 114), curbMat); cb.position.set(s * 4.15, 0.2, -43); cb.receiveShadow = true; S.add(cb);
  });
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ color: lin('#5a5f66') })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.02, -90); floor.receiveShadow = true; S.add(floor);
  // pedestrian crossings: worn zebra decals that sit ON the asphalt (polygon offset), not floating slabs
  var zc = cv(256, 128), zg = zc.getContext('2d'); for (var zs = 0; zs < 256; zs += 32) { zg.fillStyle = 'rgba(232,235,240,.85)'; zg.fillRect(zs + 6, 0, 18, 128); }
  for (var zi = 0; zi < 900; zi++) { zg.globalCompositeOperation = 'destination-out'; zg.fillStyle = 'rgba(0,0,0,' + (0.3 + 0.5 * rnd()) + ')'; zg.fillRect(rnd() * 256, rnd() * 128, 1 + rnd() * 3, 1 + rnd() * 5); } zg.globalCompositeOperation = 'source-over';
  var zebraMat = new THREE.MeshStandardMaterial({ map: tex(zc, true), transparent: true, roughness: 0.9, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  [-14, -46].forEach(function (z) { var m = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), zebraMat); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.01, z); m.receiveShadow = true; S.add(m); });
  var gc = document.createElement('canvas'); gc.width = gc.height = 128; var g3 = gc.getContext('2d'), rg = g3.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g3.fillStyle = rg; g3.fillRect(0, 0, 128, 128);
  var glowTex = new THREE.CanvasTexture(gc);
  // street lamps: plinth, tapered-looking pole, arm reaching over the kerb, housing, lens, soft light pool on the ground, faint halo. Placed in the gaps between towers so leaning towers never pass through them.
  var lamps = []; for (var m0 = 0; m0 < 9; m0++) { lamps.push([-1, 2.5 - 11 * m0]); lamps.push([1, 8 - 11 * m0]); }
  var NL = lamps.length, cyl = new THREE.CylinderGeometry(1, 1, 1, 8), poolGeo = new THREE.PlaneGeometry(5, 5); poolGeo.rotateX(-Math.PI / 2);
  var darkM = new THREE.MeshStandardMaterial({ color: lin('#2b2f36'), roughness: 0.55, metalness: 0.2 });
  var iBase = new THREE.InstancedMesh(unit, darkM, NL), iPole = new THREE.InstancedMesh(cyl, darkM, NL), iArm = new THREE.InstancedMesh(unit, darkM, NL), iHouse = new THREE.InstancedMesh(unit, darkM, NL);
  var iLens = new THREE.InstancedMesh(unit, new THREE.MeshBasicMaterial({ color: lin('#fff1dc') }), NL), iPool = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: lin('#ffe9cc'), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), NL), hp = new Float32Array(NL * 3);
  function setI(m, i, x, y, z, sx, sy, sz) { dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }
  lamps.forEach(function (l, i) { var sd = l[0], z = l[1], hx = sd * 3.6;
    setI(iBase, i, sd * 4.55, 0.5, z, 0.42, 0.5, 0.42); setI(iPole, i, sd * 4.55, 2.9, z, 0.07, 4.4, 0.07); setI(iArm, i, sd * 4.07, 4.85, z, 0.95, 0.07, 0.07);
    setI(iHouse, i, hx, 4.82, z, 0.5, 0.16, 0.3); setI(iLens, i, hx, 4.73, z, 0.42, 0.03, 0.22); setI(iPool, i, sd * 3.4, 0.05, z, 1, 1, 1); hp[i * 3] = hx; hp[i * 3 + 1] = 4.68; hp[i * 3 + 2] = z; });
  iBase.castShadow = iPole.castShadow = iArm.castShadow = true; iBase.receiveShadow = true; S.add(iBase, iPole, iArm, iHouse, iLens, iPool);
  var hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  var halos = new THREE.Points(hg, new THREE.PointsMaterial({ map: glowTex, color: lin('#ffe9cc'), size: 2.4, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })); halos.frustumCulled = false; S.add(halos);
  // ---------- buildings: ground floor + N floors, string course, cornice, balconies with railings, quoins, mansard / crown / chimneys; each is a handful of meshes (merged trim) ----------
  var NS = lite ? 5 : 7, PITCH = 11, towers = [];
  function building(side, zc, o) {
    var d = [BAY * 3, BAY * 4, BAY * 5][(rnd() * 3) | 0], nF = o.floors, H = HG + nF * FLOOR, st = rnd() < 0.55 ? ((rnd() * 2) | 0) : 2 + ((rnd() * 3) | 0), gs = (rnd() * 3) | 0, tn = (rnd() * 3) | 0, fo = (rnd() * 4) | 0, ou = ((rnd() * 4) | 0) / 4;
    var um = upperMats[st][tn], gm = groundMats[gs][(tn + 1) % 3], g = new THREE.Group(), T = [], RL = [], RF = [], top;
    var gg = new THREE.BoxGeometry(d, HG, LEN); boxUV(gg, d, HG, LEN, TILE_W, HG, ou, 0); gg.translate(side * d / 2, HG / 2, 0);
    var gmesh = new THREE.Mesh(gg, [gm, gm, concrete, soffit, gm, gm]); gmesh.castShadow = gmesh.receiveShadow = true; g.add(gmesh);
    if (nF > 0) { var Hu = nF * FLOOR, ug = new THREE.BoxGeometry(d, Hu, LEN); boxUV(ug, d, Hu, LEN, TILE_W, TILE_H, ou, fo / 4); ug.translate(side * d / 2, HG + Hu / 2, 0);
      var umesh = new THREE.Mesh(ug, [um, um, roofSlab, concrete, um, um]); umesh.castShadow = umesh.receiveShadow = true; g.add(umesh); }
    var stone = st < 3;
    part(T, 0.22, 0.22, LEN, -side * 0.11, HG, 0); part(T, d, 0.22, 0.22, side * d / 2, HG, LEN / 2 + 0.11); part(T, d, 0.22, 0.22, side * d / 2, HG, -LEN / 2 - 0.11);   // string course (z protrusion kept small: leaning neighbours interleave 0.9 apart)
    part(T, d + 0.1, 0.5, LEN + 0.1, side * (d / 2 - 0.05), H - 0.25, 0);                                                                                                       // frieze
    part(T, d + 0.3, 0.3, LEN + 0.5, side * (d / 2 - 0.15), H + 0.15, 0); part(T, d + 0.55, 0.14, LEN + 0.7, side * (d / 2 - 0.275), H + 0.37, 0);                             // cornice, two courses
    top = H + 0.44;
    if (stone && nF > 0) { part(T, 0.1, H, 0.3, -side * 0.05, H / 2, LEN / 2 - 0.15); part(T, 0.1, H, 0.3, -side * 0.05, H / 2, -LEN / 2 + 0.15); }                              // quoins
    if (o.balc && st < 2) for (var k = 0; k < nF; k++) if ((k + fo) % 4 === 1) {                                                                                                 // balcony floor = the tile's tall-window row
      var y = HG + k * FLOOR + 0.42, wi = LEN - 0.5, wf = d - 0.5;
      part(T, 0.6, 0.1, wi, -side * 0.3, y, 0); part(T, wf, 0.1, 0.4, side * d / 2, y, LEN / 2 + 0.2);
      var r1 = new THREE.PlaneGeometry(wi, 0.95), u1 = r1.attributes.uv; for (var a = 0; a < u1.count; a++) u1.setX(a, u1.getX(a) * wi); r1.rotateY(-side * Math.PI / 2); r1.translate(-side * 0.6, y + 0.525, 0); RL.push(r1);
      var r2 = new THREE.PlaneGeometry(wf, 0.95), u2 = r2.attributes.uv; for (var b2 = 0; b2 < u2.count; b2++) u2.setX(b2, u2.getX(b2) * wf); r2.translate(side * d / 2, y + 0.525, LEN / 2 + 0.4); RL.push(r2); }
    var rtop = top;
    if (o.crown && !stone && d >= BAY * 4 && rnd() < 0.6) {                                                                                                                      // modern setback crown, same facade system
      var nC = 1 + ((rnd() * 2) | 0), d2 = d - BAY, cg2 = new THREE.BoxGeometry(d2, nC * FLOOR, LEN); boxUV(cg2, d2, nC * FLOOR, LEN, TILE_W, TILE_H, ou, ((nF + fo) % 4) / 4); cg2.translate(side * (d2 / 2 + BAY / 2), top + nC * FLOOR / 2, 0);
      var cm = new THREE.Mesh(cg2, [um, um, roofSlab, concrete, um, um]); cm.castShadow = cm.receiveShadow = true; g.add(cm); rtop = top + nC * FLOOR; part(T, d2 + 0.3, 0.3, LEN + 0.5, side * (d2 / 2 + BAY / 2), rtop + 0.15, 0); rtop += 0.3; }
    else if (o.mansard && stone && rnd() < 0.65) {                                                                                                                               // slate mansard
      var hm = 2.4 + rnd() * 0.8, cy = new THREE.CylinderGeometry(0.74, 1, hm, 4, 1); cy.rotateY(Math.PI / 4); cy.scale((d - 0.3) / 1.4142, 1, (LEN - 0.3) / 1.4142); cy.translate(side * d / 2, top + hm / 2, 0); RF.push(cy); rtop = top + hm; }
    var nch = 2 + ((rnd() * 2) | 0), chMax = o.low ? 1.4 : 2.2;
    for (var c = 0; c < nch; c++) { var chh = 1.0 + rnd() * (chMax - 1.0); part(RF, 0.5, chh, 0.5, side * (0.9 + rnd() * (d - 1.8)), rtop + chh / 2, (rnd() - 0.5) * (LEN - 1.4)); }                            // chimneys
    if (!o.low && rnd() < 0.7) part(RF, d * 0.28, 1.8, LEN * 0.4, side * (d * 0.25 + rnd() * d * 0.45), rtop + 0.9, 0);                                                          // roof plant
    var tm = new THREE.Mesh(merge(T), trimMat); tm.castShadow = tm.receiveShadow = true; g.add(tm);
    if (RL.length) g.add(new THREE.Mesh(merge(RL), railMat));
    var rm = new THREE.Mesh(merge(RF), roofMat); rm.castShadow = true; rm.receiveShadow = true; g.add(rm);
    g.position.set(side * 7, 0, zc); S.add(g); return g;
  }
  function addTower(side, zc, rank) {
    var g = building(side, zc, { floors: Math.round((21 + rnd() * 21 - HG) / FLOOR), balc: true, mansard: true, crown: true }); g.name = 'fold-tower';
    var j = NS > 1 ? rank / (NS - 1) : 0;                                    // 0 = nearest the start, 1 = farthest
    towers.push({ g: g, side: side, phi: rad(42 + rnd() * 10), s: 0.14 + 0.30 * (1 - j) + (side > 0 ? 0.03 : 0), span: 0.38 });   // far towers fold first: the destination is revealed early
  }
  function addBlock(side, zc, maxF) { building(side, zc, { floors: (rnd() * (maxF + 1)) | 0, balc: true, mansard: false, crown: false, low: maxF <= 1 }); }
  yield;
  for (var k = 0; k < NS; k++) { var zl = 8 - PITCH * k; addTower(-1, zl, k); addTower(1, zl - PITCH / 2, k); }
  yield;
  [-1, 1].forEach(function (side) {
    var first = side < 0 ? 8 : 8 - PITCH / 2, last = first - PITCH * (NS - 1);
    addBlock(side, first + PITCH / 2, 1); for (var kk = 0; kk < NS; kk++) addBlock(side, first - PITCH * kk - PITCH / 2, 1);   // gaps between towers: <= 1 upper floor so leaning towers clear them
    for (var zz = last - PITCH / 2 - 5.8; zz > -98; zz -= 5.8) addBlock(side, zz, 3);                                          // continuous frontage to the fold
  });
  yield;
  // distant skyline (instanced; haze lightens it with distance) so the city has depth behind the street frontage
  var skyTex = upperTex[2].map.clone(); skyTex.needsUpdate = true; skyTex.repeat.set(1.2, 4);                       // far buildings: one cheap lit map, no normal/roughness maps
  var skyN = lite ? 40 : 90, sky = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial({ map: skyTex, color: lin('#d8dde6') }), skyN), col = new THREE.Color();
  for (var q = 0; q < skyN; q++) { var sd = q % 2 ? 1 : -1, w = 10 + rnd() * 14, dd = 10 + rnd() * 14, hh = 35 + rnd() * 80;
    dummy.position.set(sd * (30 + rnd() * 70), hh / 2, 22 - rnd() * 215); dummy.scale.set(w, hh, dd); dummy.updateMatrix(); sky.setMatrixAt(q, dummy.matrix); var v0 = 0.75 + 0.35 * rnd(); col.setRGB(v0, v0 * (0.97 + 0.06 * rnd()), v0 * (1 + 0.08 * rnd())); sky.setColorAt(q, col); }
  sky.frustumCulled = false; S.add(sky);
  // sky dome: desaturated blue-grey gradient, soft low-contrast clouds, pale peach only near the horizon (follows the camera)
  var skc = document.createElement('canvas'); skc.width = 1024; skc.height = 512; var sg0 = skc.getContext('2d'), sgr = sg0.createLinearGradient(0, 0, 0, 512);
  sgr.addColorStop(0, '#5d7089'); sgr.addColorStop(0.3, '#8397ae'); sgr.addColorStop(0.42, '#aebccb'); sgr.addColorStop(0.49, '#d4d2d0'); sgr.addColorStop(0.5, '#dcd2cb'); sgr.addColorStop(0.52, '#b4bfcb'); sgr.addColorStop(1, '#8e9aa9');
  sg0.fillStyle = sgr; sg0.fillRect(0, 0, 1024, 512);
  for (var cI = 0; cI < 26; cI++) { var cx = rnd() * 1024, cyy = 70 + rnd() * 150, cwd = 90 + rnd() * 170;
    for (var cb = 0; cb < 7; cb++) { sg0.save(); sg0.translate(cx + (rnd() - 0.5) * cwd, cyy + (rnd() - 0.5) * 20); sg0.scale(1, 0.28 + 0.1 * rnd()); var cr = 40 + rnd() * 60, cg = sg0.createRadialGradient(0, 0, 0, 0, 0, cr);
      cg.addColorStop(0, cyy > 150 ? 'rgba(244,236,230,.30)' : 'rgba(228,236,246,.26)'); cg.addColorStop(1, 'rgba(228,236,246,0)'); sg0.fillStyle = cg; sg0.beginPath(); sg0.arc(0, 0, cr, 0, 6.3); sg0.fill(); sg0.restore(); } }
  var dome = new THREE.Mesh(new THREE.SphereGeometry(350, 32, 16), new THREE.MeshBasicMaterial({ map: srgb(new THREE.CanvasTexture(skc)), side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -1; dome.frustumCulled = false; S.add(dome);
  yield;
  // ---------- the folding street at the far end ----------
  var rt1 = roadTile('slab'); rt1.map.repeat.set(1, 7.5); rt1.rough.repeat.set(1, 7.5);
  var slabMat = new THREE.MeshStandardMaterial({ map: rt1.map, roughnessMap: rt1.rough, roughness: 1, metalness: 0 }), slabs = [];
  [-1, 1].forEach(function (side, si) {
    var g = new THREE.Group(); g.position.set(0, 0, -100); S.add(g);
    var geo = new THREE.BoxGeometry(8, 0.5, 60); geo.translate(side * 8, -0.25, -30); var m = new THREE.Mesh(geo, slabMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    for (var i = 0; i < 6; i++) { var t = 6 + i * 9 + rnd() * 3, w = BAY * (2 + ((rnd() * 2) | 0)), hgt = FLOOR * (2 + ((rnd() * 3) | 0)), xc = side * (4 + w / 2 + rnd() * (8 - w));
      var bg = new THREE.BoxGeometry(w, hgt, LEN); boxUV(bg, w, hgt, LEN, TILE_W, TILE_H, ((rnd() * 4) | 0) / 4, 0);
      var b = new THREE.Mesh(bg, upperMats[(rnd() * 5) | 0][(rnd() * 3) | 0]); b.position.set(xc, hgt / 2, -t); b.castShadow = true; g.add(b); }   // snapped to whole bays/floors so windows are never cut in half
    slabs.push({ g: g, s: 0.30 + si * 0.03, span: 0.55, phi: rad(86) });
  });
  // the destination: soft low sun glow near the horizon (neutral with a faint peach tint) and a faint glare through the opening
  var horizon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: lin('#ffe8d4'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); horizon.scale.set(90, 90, 1); horizon.position.set(-24, 15, -230); S.add(horizon);
  var slit = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 80), new THREE.MeshBasicMaterial({ color: lin('#fff1e2'), transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); slit.position.set(0, 40, -130); S.add(slit);
  // gentle sun shafts, all slanting the same way (sun is up-left), only a few and very faint
  var sg = document.createElement('canvas'); sg.width = 16; sg.height = 128; var g2 = sg.getContext('2d'), vg = g2.createLinearGradient(0, 0, 0, 128);
  vg.addColorStop(0, 'rgba(255,244,232,0)'); vg.addColorStop(0.4, 'rgba(255,244,232,1)'); vg.addColorStop(1, 'rgba(255,244,232,0)'); g2.fillStyle = vg; g2.fillRect(0, 0, 16, 128);
  g2.globalCompositeOperation = 'destination-in'; var hgr = g2.createLinearGradient(0, 0, 16, 0); hgr.addColorStop(0, 'rgba(0,0,0,0)'); hgr.addColorStop(0.5, 'rgba(0,0,0,1)'); hgr.addColorStop(1, 'rgba(0,0,0,0)'); g2.fillStyle = hgr; g2.fillRect(0, 0, 16, 128);
  var shaftTex = new THREE.CanvasTexture(sg), shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), shaftGeo = new THREE.PlaneGeometry(3.5, 28);
  if (!lite) for (var s2 = 0; s2 < 4; s2++) { var sh = new THREE.Mesh(shaftGeo, shaftMat); sh.position.set(-2 + s2 * 3, 13, -16 - s2 * 17); sh.rotation.z = 0.5; S.add(sh); }
  yield;
  // ---------- lights: ONE neutral sun + cool sky ambient; no warm point lights ----------
  S.add(new THREE.HemisphereLight(lin('#c3d2e6'), lin('#3d434d'), 0.95));
  var dl = new THREE.DirectionalLight(lin('#ffeadb'), 1.35); S.add(dl, dl.target);
  if (!lite) { dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); dl.shadow.bias = -0.0006; dl.shadow.normalBias = 0.03; var sc = dl.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 1; sc.far = 170; }
  // ---------- post: restrained bloom (plain render if unavailable) ----------
  var composer = null, bloom = null;
  if (typeof EffectComposer === 'function' && typeof RenderPass === 'function' && typeof UnrealBloomPass === 'function' && typeof ShaderPass === 'function' && GammaCorrectionShader) {
    try { var rt = R.capabilities.isWebGL2 ? new THREE.WebGLMultisampleRenderTarget(256, 256, { format: THREE.RGBAFormat }) : undefined;
      composer = new EffectComposer(R, rt); composer.addPass(new RenderPass(S, C)); bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.18, 0.4, 0.93); composer.addPass(bloom);
      composer.addPass(new ShaderPass(GammaCorrectionShader)); composer.setPixelRatio(R.getPixelRatio()); }                     // gamma AFTER bloom => correct sRGB output
    catch (e) { composer = null; }
  }
  var w0 = 1, h0 = 1;
  function size() { w0 = canvas.clientWidth || window.innerWidth; h0 = canvas.clientHeight || window.innerHeight; R.setSize(w0, h0, false); if (composer) composer.setSize(w0, h0);
    C.aspect = w0 / h0; C.fov = C.aspect < 0.8 ? 62 : 50; C.updateProjectionMatrix(); }
  var ro = new ResizeObserver(size); ro.observe(canvas); size();
  var px = 0, py = 0, tx = 0, ty = 0; function onMove(e) { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }
  if (!calm) window.addEventListener('pointermove', onMove);
  var getP = opts.getProgress || function () { return 0; }, ps = clamp(getP(), 0, 1);
  var shadowPs = NaN, shadowSkip = true, t = 0, last = performance.now(), raf = 0, vis = true, vpn = true, run = false, ready = false, dead = false;
  function sync() { var n = ready && vis && vpn; if (n && !run) { run = true; last = performance.now(); scale.resume(); frame(); } else if (!n) { run = false; cancelAnimationFrame(raf); } }
  function onVis() { vis = !document.hidden; sync(); } document.addEventListener('visibilitychange', onVis);
  function frame() {
    if (!run) return; raf = requestAnimationFrame(frame);
    try { step(); } catch (err) { run = false; cancelAnimationFrame(raf); if (opts.onError) opts.onError(err); else console.warn(err); }
  }
  function step() {
    var now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    ps += (clamp(getP(), 0, 1) - ps) * (1 - Math.exp(-dt * (calm ? 12 : 5)));        // smooth follow; every visual below is a pure function of ps => fully reversible
    var i, o;
    for (i = 0; i < towers.length; i++) { o = towers[i]; o.g.rotation.z = o.side * o.phi * ease(clamp((ps - o.s) / o.span, 0, 1)); }   // left (side -1) rotates negative = leans +x (inward); right rotates positive = leans -x
    for (i = 0; i < slabs.length; i++) { o = slabs[i]; o.g.rotation.x = o.phi * ease(clamp((ps - o.s) / o.span, 0, 1)); }              // far end of the street lifts into a wall
    slit.material.opacity = 0.04 + 0.16 * sm(0.35, 0.9, ps); horizon.material.opacity = 0.42 + 0.14 * sm(0.3, 0.9, ps);
    var cz = lerp(12, -58, sm(0.03, 0.93, ps)), cy = 1.7 + 0.3 * sm(0.5, 1, ps), ly = lerp(2.2, 10, sm(0.2, 0.95, ps)), sw = calm ? 0 : 1;
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    C.position.set(px * 0.5 * sw, cy - py * 0.15 * sw + Math.sin(t * 0.4) * 0.03 * sw, cz); C.lookAt(px * 1.2 * sw, ly - py * 0.6 * sw, cz - 34);
    dome.position.set(C.position.x, C.position.y, cz); dl.position.set(-55, 40, cz + 25); dl.target.position.set(0, 0, cz - 30); dl.target.updateMatrixWorld();   // sun: up-left, slightly behind the camera => lit facades + long soft shadows
    for (i = 0; i < winMats.length; i++) winMats[i].emissiveIntensity = 0.58 + (calm ? 0 : 0.06 * Math.sin(t * 0.5 + (i % 5) * 1.7));      // lit windows breathe slightly
    // every shadow caster (towers, slabs, the sun) is a function of ps alone, so the shadow map only needs redrawing when ps moves
    // while the city is folding (the visitor is scrolling) the map is redrawn every other frame; the moment it comes to rest the
    // pending update lands on the next frame, so a still frame always has exact shadows
    if (R.shadowMap.enabled && !(Math.abs(ps - shadowPs) < 1e-6)) { shadowSkip = !shadowSkip; if (!shadowSkip || !(Math.abs(ps - shadowPs) > 1e-4)) { shadowPs = ps; R.shadowMap.needsUpdate = true; } }
    if (opts.onProgress) opts.onProgress(ps);
    scale.frame(now); scale.gpuBegin();
    if (composer) composer.render(); else R.render(S, C);
    scale.gpuEnd();
  }
  // fewer draw calls, same pixels: the faces of a multi-material box that share a material are drawn as one group (three already
  // orders draws by material, so the order is unchanged). This halves the draws of every building, in the view and the shadow pass.
  var geoUse = new Map(); S.traverse(function (o) { if (o.isMesh) geoUse.set(o.geometry, (geoUse.get(o.geometry) || 0) + 1); });
  S.traverse(function (o) { if (o.isMesh && Array.isArray(o.material) && geoUse.get(o.geometry) === 1) collapseGroups(o.geometry, o.material); });
  // textures and shaders go to the GPU in the background first, so the first frame does not freeze the page: the scene as the
  // composer draws it (into its linear buffer), the bloom stages (render targets) and the final gamma pass (the screen)
  var isDead = function () { return dead; };
  function quads(ms) { var q = new THREE.Scene(), g = new THREE.PlaneGeometry(2, 2); ms.forEach(function (m) { if (m) q.add(new THREE.Mesh(g, m)); }); return q; }
  uploadTextures(R, S, { isDead: isDead }).then(function () {
    if (!composer) return compileAsync(R, S, C, { isDead: isDead });
    return Promise.all([
      compileAsync(R, S, C, { target: composer.renderTarget2, isDead: isDead }),
      compileAsync(R, quads([bloom.materialHighPassFilter, bloom.compositeMaterial, bloom.materialCopy].concat(bloom.separableBlurMaterials)), C, { target: bloom.renderTargetBright, isDead: isDead }),
      compileAsync(R, quads([composer.passes[composer.passes.length - 1].material]), C, { isDead: isDead }),
    ]).then(function (r) { return r[0] && r[1] && r[2]; });
  }).then(function (ok) {
    // the shadow pass's own programs too (they would otherwise compile on the first visible frame)
    return ok && compileShadows(R, S, C, { target: composer ? composer.renderTarget2 : null, isDead: isDead });
  }).then(function (ok) {
    if (!ok) return; ready = true; sync(); if (opts.onReady) requestAnimationFrame(function () { if (!dead) opts.onReady(); });
  }).catch(function (err) { if (opts.onError) opts.onError(err); else console.warn(err); });
  function dispose() {
    dead = true; run = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); ro.disconnect();
    S.traverse(function (o) { if (o.geometry) o.geometry.dispose(); var m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(function (x) { ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'bumpMap'].forEach(function (p) { if (x[p]) x[p].dispose(); }); x.dispose(); }); });
    shaftTex.dispose(); glowTex.dispose();
    if (composer) { if (composer.renderTarget1) composer.renderTarget1.dispose(); if (composer.renderTarget2) composer.renderTarget2.dispose(); if (bloom && bloom.dispose) bloom.dispose(); }
    scale.dispose(); R.dispose(); if (R.forceContextLoss) R.forceContextLoss();
  }
  api.impl = { setVisible: function (b) { vpn = b; sync(); }, dispose: dispose };
  api.impl.setVisible(api.vis);
}

// Merge a geometry's draw groups that use the same material (by identity) into one group each, keeping their face order.
function collapseGroups(geo, mats) {
  if (!geo.index || geo.groups.length < 2) return;
  var order = [], byMat = new Map(), src = geo.index.array, out = new src.constructor(src.length), n = 0;
  geo.groups.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (g) {
    var m = mats[g.materialIndex]; if (!byMat.has(m)) { byMat.set(m, { mi: g.materialIndex, ranges: [] }); order.push(m); } byMat.get(m).ranges.push(g);
  });
  if (order.length === geo.groups.length) return;
  geo.clearGroups();
  order.forEach(function (m) {
    var e = byMat.get(m), start = n;
    e.ranges.forEach(function (g) { var end = Math.min(g.start + g.count, src.length); for (var i = g.start; i < end; i++) out[n++] = src[i]; });
    geo.addGroup(start, n - start, e.mi);
  });
  geo.setIndex(new THREE.BufferAttribute(out.subarray(0, n), 1));
}
