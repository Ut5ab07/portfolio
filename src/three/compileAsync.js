import { Scene } from 'three';
import { hasFocus, nextTask, reportProgress } from './quiet';

// Getting a three.js r128 scene onto the GPU without freezing the page.
//
// three r128 compiles a material's program the first time it is drawn and immediately asks for the result, which makes the
// browser finish the whole driver-side compile synchronously, one program after another. On Windows (ANGLE / Direct3D) a
// physically based shader takes 0.3-1.5 s, so a scene with 20 programs froze the page for 10+ s when it first appeared.
//
// deferCompile(renderer, fn) runs fn() (anything that makes three create programs: renderer.compile, a PMREMGenerator...)
// while the context answers "no uniforms yet" instead of waiting, so every compile runs in the background, in parallel.
// KHR_parallel_shader_compile tells us when each has finished; only then is the program's uniform table read. The programs
// three created are the ones it renders with: same materials, same GLSL, same pixels, no freeze.
// Without the extension the compiles still run in parallel and are waited for in one go when fn() returns.
//
// compileAsync(renderer, scene, camera) does that for a whole scene, one material per task so no single task is long. While the
// scene is off screen (prepared ahead of the visitor) at most two compiles run at a time, which keeps the visible section
// smooth; once its canvas is on screen, or the visitor has asked for it, they all run at once, because the visitor is waiting for it. It goes
// through a stand-in Scene that shares the real scene's lights, fog and environment; its lighting state carries a different
// version, so the first real render re-reads each material's uniform list from the finished program instead of keeping the
// empty placeholder. Call it before the scene is first rendered.
//
// uploadTextures(renderer, scene) sends the scene's textures to the GPU one per task, so the first frame does not upload all.
const BACKGROUND = 2;                                              // compiles in flight while the scene is off screen
const COMPLETION_STATUS_KHR = 0x91b1, LINK_STATUS = 0x8b82, ACTIVE_UNIFORMS = 0x8b86;

export { nextTask } from './quiet';

let deferring = 0;                                                // > 0 while a deferCompile() call is running

export function deferCompile(renderer, fn) {
  const gl = renderer.getContext(), proto = Object.getPrototypeOf(gl), linked = new Set();
  const checks = renderer.debug.checkShaderErrors;
  gl.linkProgram = (p) => { proto.linkProgram.call(gl, p); linked.add(p); };
  gl.getProgramParameter = (p, n) => (n === ACTIVE_UNIFORMS && linked.has(p) ? 0 : proto.getProgramParameter.call(gl, p, n));
  renderer.debug.checkShaderErrors = false;
  deferring++;
  let result;
  try { result = fn(); } finally {
    deferring--;
    delete gl.linkProgram; delete gl.getProgramParameter;
    renderer.debug.checkShaderErrors = checks;
  }
  // the new programs read their uniform table at first use after the compile has finished. A later deferCompile() that meets
  // a program still compiling (another material with the same shader) keeps the placeholder: the first real render re-reads it.
  for (const wp of renderer.info.programs) {
    if (!linked.has(wp.program) || wp.__deferred) continue;
    const placeholder = wp.getUniforms(), Uniforms = placeholder.constructor;   // WebGLUniforms (not exported by three)
    let table = null;
    wp.__deferred = true;
    wp.getUniforms = () => table || (deferring && linked.has(wp.program) ? placeholder : (table = new Uniforms(gl, wp.program)));
  }
  return { result, done: whenLinked(gl, proto, linked, checks) };
}

function whenLinked(gl, proto, linked, checks) {
  const finish = (p) => {
    linked.delete(p);
    if (checks && proto.getProgramParameter.call(gl, p, LINK_STATUS) === false) console.error('THREE.WebGLProgram: shader error', proto.getProgramInfoLog.call(gl, p));
  };
  const ext = gl.getExtension('KHR_parallel_shader_compile');
  if (!linked.size) return Promise.resolve();
  if (!ext) { [...linked].forEach(finish); return Promise.resolve(); }
  gl.flush();
  const giveUp = performance.now() + 20000;   // safety net: never wait forever (three then completes any compile on first use)
  return new Promise((resolve) => {
    const poll = () => {
      if (gl.isContextLost() || performance.now() > giveUp) { linked.clear(); resolve(); return; }
      for (const p of [...linked]) if (proto.getProgramParameter.call(gl, p, COMPLETION_STATUS_KHR)) finish(p);
      if (linked.size) setTimeout(poll, 16); else resolve();
    };
    setTimeout(poll, 16);
  });
}

function onScreen(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
}

export async function compileAsync(renderer, scene, camera, { target = null, isDead = () => false } = {}) {
  const lights = [], items = [], seen = new Set();
  scene.traverseVisible((o) => { if (o.isLight) lights.push(o); });
  scene.traverse((o) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    const keys = ms.map((m) => m.id + (o.isInstancedMesh ? (o.instanceColor ? ':ic' : ':i') : '') + (o.isSkinnedMesh ? ':s' : ''));   // instancing changes the program
    if (keys.some((k) => !seen.has(k))) { keys.forEach((k) => seen.add(k)); items.push(o); }
  });
  const waits = [], inflight = [], canvas = renderer.domElement;
  let compiled = 0;
  for (const o of items) {
    if (isDead()) return false;
    // a childless stand-in for the object (everything else, e.g. geometry, material, instancing, is inherited)
    const stand = new Scene();
    stand.fog = scene.fog; stand.environment = scene.environment; stand.background = scene.background; stand.overrideMaterial = scene.overrideMaterial;
    stand.children = lights.concat(o.children.length ? Object.assign(Object.create(o), { children: [] }) : o);
    const prev = renderer.getRenderTarget();
    const { done } = deferCompile(renderer, () => {
      if (target !== prev) renderer.setRenderTarget(target);   // a scene drawn into a render target compiles another variant
      try { renderer.compile(stand, camera); } finally { if (target !== prev) renderer.setRenderTarget(prev); }
    });
    // while nobody is looking at this scene, at most BACKGROUND compiles at a time (more at once make whatever *is* on screen
    // stutter); once its canvas is on screen the visitor is waiting for it, so everything goes at once
    waits.push(done);
    done.then(() => reportProgress(canvas, 'Shaders', ++compiled, items.length));
    if (!hasFocus(canvas) && !onScreen(canvas)) {
      inflight.push(done);
      done.then(() => inflight.splice(inflight.indexOf(done), 1));
      while (inflight.length >= BACKGROUND && !hasFocus(canvas)) await Promise.race(inflight);
    }
    await nextTask(canvas);
  }
  await Promise.all(waits);
  return !isDead();
}

// Shadow maps: three creates the depth programs of its shadow pass on the first frame that draws a shadow map, compiling them
// synchronously (a ~60 ms freeze each, when the section first comes into view). This runs that pass once ahead of time with
// every draw call stubbed out, under deferCompile: the programs are created and compile in the background, nothing is drawn,
// and the first real frame redraws the shadow map with programs that are ready. Rendered twice so the second shadow pass sees
// the scene's lights already set up, as every later frame will. `target` is where the scene normally renders (null = canvas).
const DRAWS = ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements', 'clear'];
export async function compileShadows(renderer, scene, camera, { target = null, isDead = () => false } = {}) {
  if (!renderer.shadowMap.enabled || isDead()) return !isDead();
  const gl = renderer.getContext();
  const { done } = deferCompile(renderer, () => {
    const prev = renderer.getRenderTarget();
    for (const k of DRAWS) gl[k] = () => {};
    try {
      renderer.setRenderTarget(target);
      for (let i = 0; i < 2; i++) { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }
    } finally { for (const k of DRAWS) delete gl[k]; renderer.setRenderTarget(prev); }
  });
  await done;
  renderer.shadowMap.needsUpdate = true;          // the stubbed pass drew nothing: the first real frame draws the map
  return !isDead();
}

const TEX_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'alphaMap', 'lightMap', 'displacementMap', 'clearcoatNormalMap', 'specularMap'];
export async function uploadTextures(renderer, scene, { isDead = () => false } = {}) {
  const set = new Set();
  const add = (t) => { if (t && t.isTexture && t.image && !t.isCubeTexture && !t.isDataTexture3D && !t.isDataTexture2DArray && !t.isVideoTexture) set.add(t); };
  scene.traverse((o) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      TEX_KEYS.forEach((k) => add(m[k]));
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value) (Array.isArray(u.value) ? u.value : [u.value]).forEach(add);
    }
  });
  let sent = 0;
  for (const t of set) {
    if (isDead()) return;
    renderer.initTexture(t);
    reportProgress(renderer.domElement, 'Textures', ++sent, set.size);
    await nextTask(renderer.domElement);
  }
}

