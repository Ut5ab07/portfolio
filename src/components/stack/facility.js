import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { brushedNormal, fabricNormal, perforated, grainNormal, contactTexture, keyboardTexture, serverFrontTexture } from './assets';

// The facility interior: architecture (panelled walls with structural columns, a beamed ceiling with recessed light troughs,
// ducts, cable trays and pipes, the observation window) and the equipment (desks, ergonomic chairs, monitors on arms, the
// curved analysis console with its video wall, the operations partition, a server rack). Everything is built from bevelled
// parts with physically based materials; ducts, pipes, lamps, cameras and the tool chest are CC0 Poly Haven models.

export const ROOM = { X: 9, H: 4.6, ZB: -10, ZF: 10 };

export function createMaterials(tex, keep) {
  const brushed = keep(brushedNormal()), fabric = keep(fabricNormal()), grain = keep(grainNormal(11, 0.5)), grainFine = keep(grainNormal(5, 0.25));
  const perf = keep(perforated(9)); perf.repeat.set(10, 8);
  const std = (o) => keep(new THREE.MeshStandardMaterial(o));
  const phys = (o) => keep(new THREE.MeshPhysicalMaterial(o));
  const M = {
    // walls: matte painted composite panels with a faint surface relief from the metal plate scan
    panel: std({ color: 0xb3aa9e, roughness: 0.62, metalness: 0.05, normalMap: tex.plate.normalMap, normalScale: new THREE.Vector2(0.18, 0.18), envMapIntensity: 0.35 }),
    panelDark: std({ color: 0x5b5650, roughness: 0.58, metalness: 0.1, normalMap: grain, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 0.35 }),
    panelLight: std({ color: 0xcfc7bb, roughness: 0.55, metalness: 0.05, normalMap: grain, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 0.4 }),
    steel: std({ color: 0x9a9fa5, roughness: 0.34, metalness: 0.9, normalMap: brushed, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 0.8 }),
    gunmetal: std({ color: 0x3b3e42, roughness: 0.42, metalness: 0.75, normalMap: brushed, normalScale: new THREE.Vector2(0.15, 0.15), envMapIntensity: 0.6 }),
    structure: std({ color: 0x4a4d50, roughness: 0.5, metalness: 0.6, envMapIntensity: 0.5 }),                       // long members: no stretched relief
    deck: std({ color: 0x45413d, roughness: 0.82, metalness: 0.1, envMapIntensity: 0.25 }),
    plastic: std({ color: 0x17181a, roughness: 0.48, metalness: 0.0, normalMap: grainFine, normalScale: new THREE.Vector2(0.2, 0.2), envMapIntensity: 0.5 }),
    plasticGrey: std({ color: 0x5d6064, roughness: 0.5, metalness: 0.0, normalMap: grainFine, normalScale: new THREE.Vector2(0.2, 0.2), envMapIntensity: 0.45 }),
    laminate: std({ color: 0xd9d3c8, roughness: 0.45, metalness: 0.0, normalMap: grainFine, normalScale: new THREE.Vector2(0.2, 0.2), envMapIntensity: 0.5 }),
    edge: std({ color: 0x232426, roughness: 0.4, metalness: 0.2 }),
    fabric: std({ color: 0x2d3034, roughness: 0.92, metalness: 0, normalMap: fabric, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.2 }),
    rubber: std({ color: 0x111111, roughness: 0.85, metalness: 0 }),
    accent: std({ color: 0x9c4f27, roughness: 0.55, metalness: 0.1, normalMap: grain, normalScale: new THREE.Vector2(0.2, 0.2) }),
    grille: std({ color: 0x2b2d30, roughness: 0.45, metalness: 0.7, alphaMap: perf, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
    diffuser: std({ color: 0xfff8ee, emissive: 0xfff1de, emissiveIntensity: 1.25, roughness: 0.6 }),
    glass: phys({ color: 0xdcc8b4, metalness: 0.0, roughness: 0.04, transparent: true, opacity: 0.11, envMapIntensity: 1.4, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05 }),
    tintGlass: phys({ color: 0x1a1c1e, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.55, envMapIntensity: 1.0, clearcoat: 1 }),
    floor: std({ map: tex.floor.map, normalMap: tex.floor.normalMap, roughnessMap: tex.floor.arm, aoMap: tex.floor.arm, color: 0x8a8580, roughness: 0.9, metalness: 0, normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 0.45 }),
    contact: keep(new THREE.MeshBasicMaterial({ map: keep(contactTexture()), transparent: true, depthWrite: false, color: 0x000000, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 })),
    keys: std({ map: keep(keyboardTexture()), roughness: 0.6, metalness: 0 }),
    server: std({ map: keep(serverFrontTexture()), roughness: 0.5, metalness: 0.4, envMapIntensity: 0.4 }),
  };
  return M;
}

// ---- geometry helpers ----
export function makeBuilders(scene, M, keep) {
  const rcache = new Map();
  const rbox = (w, h, d, r) => {                                       // rounded (bevelled) box, cached by size
    r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const k = [w, h, d, r].map((v) => v.toFixed(3)).join();
    if (!rcache.has(k)) rcache.set(k, keep(new RoundedBoxGeometry(w, h, d, 2, r)));
    return rcache.get(k);
  };
  const add = (geo, mat, parent, x, y, z, rx = 0, ry = 0, rz = 0, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = shadow; m.receiveShadow = true; (parent || scene).add(m); return m;
  };
  const B = (w, h, d, r, mat, parent, x, y, z, rx, ry, rz, shadow) => add(rbox(w, h, d, r), mat, parent, x, y, z, rx, ry, rz, shadow);
  const cylG = new Map();
  const cyl = (r, h, mat, parent, x, y, z, rx = 0, rz = 0, seg = 20, rt = r) => {
    const k = `${r},${rt},${h},${seg}`; if (!cylG.has(k)) cylG.set(k, keep(new THREE.CylinderGeometry(rt, r, h, seg)));
    return add(cylG.get(k), mat, parent, x, y, z, rx, 0, rz);
  };
  // a structural I-beam profile extruded along its length (local z)
  const ibeamG = new Map();
  const ibeam = (len, h, w, mat, parent, x, y, z, ry = 0, rx = 0) => {
    const k = `${len},${h},${w}`;
    if (!ibeamG.has(k)) {
      const t = 0.018, f = 0.022, s = new THREE.Shape();
      s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, -h / 2 + f); s.lineTo(t / 2, -h / 2 + f); s.lineTo(t / 2, h / 2 - f);
      s.lineTo(w / 2, h / 2 - f); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.lineTo(-w / 2, h / 2 - f); s.lineTo(-t / 2, h / 2 - f);
      s.lineTo(-t / 2, -h / 2 + f); s.lineTo(-w / 2, -h / 2 + f); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1 });
      g.translate(0, 0, -len / 2); ibeamG.set(k, keep(g));
    }
    return add(ibeamG.get(k), mat, parent, x, y, z, rx, ry, 0);
  };
  const contact = (parent, x, z, w, d, op = 0.55, ry = 0) => {
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, d)), op === 0.55 ? M.contact : keep(Object.assign(M.contact.clone(), { opacity: op })));
    m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.004, z); m.renderOrder = 1; (parent || scene).add(m); return m;
  };
  return { rbox, add, B, cyl, ibeam, contact };
}

// ---- architecture ----
export function buildRoom(scene, M, H, kits) {
  const { B, ibeam, cyl, add } = H;
  const { X, H: RH, ZB, ZF } = ROOM;
  // floor: one plane of rubber access tiles (the texture holds its own tile seams), with uv2 for its occlusion
  { const g = new THREE.PlaneGeometry(X * 2, ZF - ZB); g.setAttribute('uv2', g.attributes.uv);
    const f = add(g, M.floor, scene, 0, 0, (ZF + ZB) / 2, -Math.PI / 2, 0, 0, false); f.receiveShadow = true;
    for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap']) M.floor[k].repeat.set(X * 2 / 2.4, (ZF - ZB) / 2.4); }

  // side walls: a grid of bevelled composite panels (instanced), a steel rail, rubber skirting, structural columns
  const PW = 1.2, rows = [[0.12, 0.98, M.panelDark], [1.06, 3.38, M.panel], [3.42, RH, M.panelDark]];
  for (const side of [-1, 1]) {
    const x = side * X;
    B(0.04, RH, ZF - ZB, 0.005, M.structure, scene, x + side * 0.03, RH / 2, (ZF + ZB) / 2, 0, 0, 0, false);                 // backing
    for (const [y0, y1, mat] of rows) {
      const g = H.rbox(0.05, y1 - y0 - 0.02, PW - 0.02, 0.008), n = Math.floor((ZF - ZB) / PW);
      const im = new THREE.InstancedMesh(g, mat, n); im.receiveShadow = true; im.castShadow = false;
      const m4 = new THREE.Matrix4();
      const tone = new THREE.Color();
      for (let i = 0; i < n; i++) { m4.makeTranslation(x - side * 0.01, (y0 + y1) / 2, ZB + PW / 2 + i * PW); im.setMatrixAt(i, m4); im.setColorAt(i, tone.setScalar(0.93 + ((i * 7919 + side * 31 + y0 * 97) % 13) / 13 * 0.12)); }
      scene.add(im);
    }
    B(0.05, 0.05, ZF - ZB, 0.01, M.steel, scene, x - side * 0.05, 1.02, (ZF + ZB) / 2, 0, 0, 0, false);                     // rail
    B(0.03, 0.12, ZF - ZB, 0.006, M.rubber, scene, x - side * 0.035, 0.06, (ZF + ZB) / 2, 0, 0, 0, false);                   // skirting
    for (let z = ZB + 2.4; z < ZF; z += 4.8) {                                                                               // columns
      ibeam(RH, 0.3, 0.18, M.structure, scene, x - side * 0.17, RH / 2, z, 0, Math.PI / 2);
      B(0.34, 0.02, 0.3, 0.004, M.structure, scene, x - side * 0.17, 0.01, z);
    }
  }
  // soft occlusion along the junctions (floor/wall, wall/ceiling, window wall): a dark gradient strip
  { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.45, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64);
    const t = new THREE.CanvasTexture(c), mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: 0, polygonOffset: true, polygonOffsetFactor: -2 });
    M.__ao = mat;
    const strip = (len, w, px, py, pz, rx, ry, rz) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz, 'YXZ'); m.renderOrder = 1; scene.add(m); };
    for (const s of [-1, 1]) {
      strip(ZF - ZB, 0.7, s * (X - 0.02 - 0.35), 0.003, (ZF + ZB) / 2, -Math.PI / 2, s * Math.PI / 2, 0);     // on the floor along the wall
      strip(ZF - ZB, 0.5, s * (X - 0.04), 0.25, (ZF + ZB) / 2, 0, -s * Math.PI / 2, Math.PI);                 // up the wall from the floor
    }
    strip(X * 2, 0.8, 0, 0.003, ZB + 0.25 + 0.4, -Math.PI / 2, 0, Math.PI); }
  // ceiling: a dark deck, primary I-beams across the room, recessed linear light troughs between them
  B(X * 2, 0.06, ZF - ZB, 0.01, M.deck, scene, 0, RH + 0.03, (ZF + ZB) / 2, 0, 0, 0, false);
  for (let z = ZB + 1.6; z < ZF; z += 3.2) ibeam(X * 2, 0.36, 0.2, M.structure, scene, 0, RH - 0.18, z, Math.PI / 2);
  for (let z = ZB + 3.2; z < ZF - 0.5; z += 3.2) for (const x of [-3.2, 0.2, 3.6]) {
    B(0.34, 0.1, 2.7, 0.01, M.gunmetal, scene, x, RH - 0.05, z, 0, 0, 0, false);                                             // housing
    B(0.24, 0.012, 2.56, 0.004, M.diffuser, scene, x, RH - 0.1, z, 0, 0, 0, false);                                           // diffuser
  }
  // the observation wall: sill and header bands of panels, a deep frame, mullions and a transom, glass
  const WX = 7.6, WY0 = 0.9, WY1 = 4.05;
  B(X * 2, WY0, 0.5, 0.02, M.panelDark, scene, 0, WY0 / 2, ZB);
  B(X * 2, RH - WY1, 0.5, 0.02, M.panelDark, scene, 0, (RH + WY1) / 2, ZB);
  for (const s of [-1, 1]) B(X - WX, RH, 0.5, 0.02, M.panel, scene, s * (WX + (X - WX) / 2), RH / 2, ZB);
  B(WX * 2 + 0.1, 0.07, 0.62, 0.02, M.laminate, scene, 0, WY0 + 0.03, ZB + 0.12);                                              // sill
  for (let i = 0; i <= 6; i++) { const x = -WX + i * (2 * WX / 6); B(0.16, WY1 - WY0, 0.44, 0.025, M.gunmetal, scene, x, (WY0 + WY1) / 2, ZB + 0.02); }
  B(WX * 2, 0.12, 0.44, 0.025, M.gunmetal, scene, 0, WY1 - 0.05, ZB + 0.02);
  B(WX * 2, 0.09, 0.36, 0.02, M.gunmetal, scene, 0, 3.1, ZB);
  { const g = add(new THREE.PlaneGeometry(WX * 2, WY1 - WY0), M.glass, scene, 0, (WY0 + WY1) / 2, ZB - 0.06, 0, 0, 0, false); g.castShadow = false; g.renderOrder = 3; }

  // services overhead: a rectangular duct run (Poly Haven kit) on the left, a round duct on the right, a cable tray in the middle
  const kit = (root, name) => { let found = null; root.traverse((o) => { if (!found && o.name && o.name.includes(name)) found = o; }); return found; };
  if (kits.ductRect) {
    const seg = kit(kits.ductRect, 'tripple_01'), vent = kit(kits.ductRect, 'vent_01');
    for (let z = ZB + 1; z < ZF - 1; z += 1.8) { const s = seg.clone(); s.position.set(-6.2, RH - 0.62, z); s.rotation.set(0, 0, 0); s.scale.setScalar(1); scene.add(s); }
    for (const z of [-6.4, -1, 4.4]) { const v = vent.clone(); v.position.set(-6.2, RH - 0.88, z); v.rotation.set(Math.PI / 2, 0, 0); scene.add(v); }
  }
  if (kits.ductRound) {
    const seg = kit(kits.ductRound, 'circular_triple');
    for (let z = ZB + 1; z < ZF - 1; z += 1.42) { const s = seg.clone(); s.position.set(6.4, RH - 0.5, z); s.rotation.set(0, 0, 0); scene.add(s); }
  }
  { // cable tray: ladder rails, rungs and a loose bundle of cables
    const x0 = -1.6, y = RH - 0.42;
    for (const s of [-1, 1]) B(0.02, 0.06, ZF - ZB - 1, 0.004, M.steel, scene, x0 + s * 0.2, y, (ZF + ZB) / 2, 0, 0, 0, false);
    const rung = H.rbox(0.4, 0.012, 0.02, 0.004), n = Math.floor((ZF - ZB - 1) / 0.3), im = new THREE.InstancedMesh(rung, M.steel, n), m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m4.makeTranslation(x0, y - 0.025, ZB + 0.5 + i * 0.3); im.setMatrixAt(i, m4); } scene.add(im);
    const cols = [M.plastic, M.plasticGrey, M.plastic, M.accent, M.plastic];
    cols.forEach((mat, i) => {
      const pts = []; for (let z = ZB + 0.6; z <= ZF - 0.6; z += 1.2) pts.push(new THREE.Vector3(x0 - 0.12 + i * 0.06 + Math.sin(z * 0.7 + i) * 0.02, y - 0.005 + (i % 2) * 0.012, z));
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.011 + (i % 2) * 0.004, 6); add(g, mat, scene, 0, 0, 0, 0, 0, 0, false);
    });
  }
  // pipes along the left wall (Poly Haven), wall lamps on the columns, cameras in the corners
  if (kits.pipes) { const p = kit(kits.pipes, 'pipe02'); for (let z = ZB + 1.2; z < ZF; z += 1.95) { const s = p.clone(); s.position.set(-X + 0.32, RH - 0.95, z); s.rotation.set(Math.PI / 2, 0, 0); scene.add(s); const s2 = s.clone(); s2.position.y -= 0.24; scene.add(s2); } }
  if (kits.lamp) for (const [x, z, ry] of [[-X + 0.3, -5.2, Math.PI / 2], [X - 0.3, -5.2, -Math.PI / 2], [-X + 0.3, 4.4, Math.PI / 2]]) { const l = kits.lamp.clone(); l.position.set(x, 2.55, z); l.rotation.y = ry; scene.add(l); }
  if (kits.camera) for (const [x, z, ry] of [[-X + 0.35, ZB + 0.6, Math.PI * 0.75], [X - 0.35, ZB + 0.6, -Math.PI * 0.75]]) { const c = kits.camera.clone(); c.position.set(x, RH - 0.5, z); c.rotation.y = ry; scene.add(c); }
}

// ---- equipment ----
// a flat-panel monitor: thin bezel, glass screen (emissive content, reflective surface), tapered back housing, neck and foot
export function monitor(H, M, parent, screenMat, w, h, { stand = true, x = 0, y = 0, z = 0, ry = 0, rx = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0); parent.add(g);
  H.B(w + 0.018, h + 0.018, 0.022, 0.004, M.plastic, g, 0, 0, -0.011);
  const s = new THREE.Mesh(H.rbox(w, h, 0.002, 0.0005), screenMat); s.position.z = 0.0005; g.add(s);
  H.B(w * 0.86, h * 0.8, 0.035, 0.012, M.plastic, g, 0, -h * 0.02, -0.035);
  if (stand) {
    H.B(0.06, h * 0.55, 0.025, 0.008, M.plasticGrey, g, 0, -h * 0.55, -0.065, 0.06);
    H.B(0.24, 0.012, 0.17, 0.006, M.plasticGrey, g, 0, -h * 0.5 - h * 0.35, -0.04);
  }
  return g;
}
// an ergonomic task chair: five-star base with casters, gas lift, contoured upholstered seat and back, armrests
export function chair(H, M, parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5, leg = new THREE.Group(); leg.rotation.y = a; g.add(leg);
    H.B(0.045, 0.035, 0.31, 0.012, M.gunmetal, leg, 0, 0.085, 0.15, -0.12);
    H.cyl(0.024, 0.02, M.plastic, leg, 0, 0.03, 0.3, Math.PI / 2, 0, 12);
    H.B(0.02, 0.05, 0.03, 0.006, M.plastic, leg, 0, 0.06, 0.3);
  }
  H.cyl(0.05, 0.03, M.gunmetal, g, 0, 0.11, 0);
  H.cyl(0.028, 0.2, M.plastic, g, 0, 0.22, 0); H.cyl(0.018, 0.12, M.steel, g, 0, 0.37, 0);
  H.B(0.2, 0.04, 0.24, 0.015, M.gunmetal, g, 0, 0.44, 0);
  // seat: a thick, softly rounded cushion with a slightly raised front edge
  H.B(0.5, 0.075, 0.48, 0.035, M.fabric, g, 0, 0.49, 0.02);
  H.B(0.46, 0.018, 0.44, 0.008, M.plastic, g, 0, 0.452, 0.02);
  // back: a curved shell (three slats of cushion following an arc) on a spine
  H.B(0.06, 0.32, 0.03, 0.012, M.gunmetal, g, 0, 0.62, -0.26, -0.1);
  const back = new THREE.Group(); back.position.set(0, 0.86, -0.27); back.rotation.x = -0.12; g.add(back);
  for (const [px, rz, w] of [[-0.16, 0.0, 0.14], [0, 0, 0.2], [0.16, 0, 0.14]]) H.B(w, 0.5, 0.06, 0.026, M.fabric, back, px, 0, Math.abs(px) * 0.25, 0, -px * 1.4, rz);
  H.B(0.4, 0.12, 0.05, 0.02, M.fabric, back, 0, -0.16, 0.04);                       // lumbar
  // armrests
  for (const s of [-1, 1]) {
    H.B(0.03, 0.2, 0.05, 0.01, M.plastic, g, s * 0.27, 0.56, -0.02);
    H.B(0.07, 0.03, 0.26, 0.014, M.plastic, g, s * 0.27, 0.67, 0.0);
  }
  H.contact(parent, x, z, 0.75, 0.75, 0.45);
  return g;
}
// a workstation desk: bevelled laminate top with a dark edge, steel T-leg frame, perforated modesty panel, tower under the desk
export function desk(H, M, parent, w, d) {
  const g = new THREE.Group(); parent.add(g);
  H.B(w, 0.032, d, 0.008, M.laminate, g, 0, 0.74, 0);
  H.B(w + 0.004, 0.01, d + 0.004, 0.004, M.edge, g, 0, 0.722, 0);
  for (const s of [-1, 1]) {
    H.B(0.07, 0.7, 0.05, 0.012, M.steel, g, s * (w / 2 - 0.16), 0.37, -0.05);
    H.B(0.07, 0.035, d - 0.08, 0.012, M.steel, g, s * (w / 2 - 0.16), 0.018, -0.02);
    H.B(0.06, 0.03, d - 0.2, 0.01, M.steel, g, s * (w / 2 - 0.16), 0.705, 0);
  }
  H.B(w - 0.36, 0.05, 0.05, 0.012, M.steel, g, 0, 0.68, -0.12);
  H.B(w - 0.4, 0.36, 0.012, 0.004, M.grille, g, 0, 0.5, -d / 2 + 0.04);
  return g;
}
export function tower(H, M, parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  H.B(0.21, 0.46, 0.46, 0.012, M.gunmetal, g, 0, 0.25, 0);
  H.B(0.17, 0.3, 0.004, 0.002, M.grille, g, 0, 0.27, 0.232);
  H.cyl(0.006, 0.004, M.diffuser, g, 0.06, 0.44, 0.232, Math.PI / 2);
  H.B(0.2, 0.02, 0.4, 0.006, M.plastic, g, 0, 0.01, 0);
  return g;
}
export function keyboard(H, M, parent, x, y, z, ry = 0) {
  const k = H.B(0.44, 0.018, 0.14, 0.006, M.plastic, parent, x, y, z, 0.05, ry);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.125), M.keys); top.rotation.x = -Math.PI / 2; top.position.y = 0.0095; k.add(top);
  H.B(0.06, 0.02, 0.1, 0.01, M.plastic, parent, x + 0.3 * Math.cos(ry), y, z - 0.3 * Math.sin(ry), 0, ry);
}
export function mug(H, M, parent, x, y, z) {
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.038, 0), new THREE.Vector2(0.04, 0.005), new THREE.Vector2(0.042, 0.1), new THREE.Vector2(0.038, 0.1), new THREE.Vector2(0.036, 0.008), new THREE.Vector2(0, 0.008)];
  return H.add(new THREE.LatheGeometry(pts, 24), M.panelLight, parent, x, y, z);
}
// a 42U rack: frame, side panels, top, tinted glass door, servers with lit status lights
export function rack(H, M, parent, x, z, ry, ledHook) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const W = 0.62, D = 1.0, Hh = 2.05;
  for (const s of [-1, 1]) H.B(0.02, Hh, D, 0.006, M.gunmetal, g, s * (W / 2 - 0.01), Hh / 2 + 0.05, 0);
  H.B(W, 0.04, D, 0.01, M.gunmetal, g, 0, Hh + 0.07, 0);
  H.B(W, 0.05, D, 0.01, M.plastic, g, 0, 0.025, 0);
  H.B(W - 0.04, Hh, 0.02, 0.004, M.gunmetal, g, 0, Hh / 2 + 0.05, -D / 2 + 0.01);
  for (let i = 0; i < 16; i++) {
    const y = 0.22 + i * 0.105, u = H.B(W - 0.08, 0.085, 0.7, 0.006, M.gunmetal, g, 0, y, 0.0);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.09, 0.075), M.server); front.position.set(0, y, 0.352); g.add(front);
    if (ledHook) ledHook(g, -0.2 + (i % 3) * 0.02, y + 0.02, 0.355, i);
  }
  const door = new THREE.Mesh(H.rbox(W - 0.02, Hh - 0.04, 0.012, 0.004), M.tintGlass); door.position.set(0, Hh / 2 + 0.05, D / 2 - 0.01); g.add(door);
  H.B(0.02, 0.3, 0.025, 0.006, M.steel, g, W / 2 - 0.06, 1.1, D / 2 + 0.008);
  H.contact(parent, x, z, 1.0, 1.4, 0.6, ry);
  return g;
}
