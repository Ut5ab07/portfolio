// GLSL for the Contact Zone. Every material shares COMMON: an overcast sky (also used for reflections), the atmosphere
// and the final grade. The atmosphere is one continuous volume raymarched per pixel up to the surface being shaded (so it is
// depth-aware by construction): wisps drifting over the foreground ground, mist that pools in the valley and moves through
// the middle distance, and thick fog round the mountains, all from a tileable 3D noise texture sampled at several rotated scales, each drifting and
// evolving at its own slow speed. A soft haze hugs the structure, and a thin height fog gives the overall aerial perspective.
// Colours are linear; finish() applies the shoulder, gamma, a cool desaturated grade and dithering.

const ATMOS = /* glsl */ `
uniform float uTime;
uniform vec3 uCam;
uniform vec3 uSun;          // direction toward the (hidden) sun
uniform vec2 uDrift;        // wind drift (m), grows steadily with time
uniform float uQ;           // march quality 0.5..1 (lowered on slow GPUs)
#define SUNC vec3(1.0, 0.94, 0.85)
#define FOGC vec3(0.5, 0.535, 0.565)
#define MISTC vec3(0.6, 0.625, 0.645)
#define FARC vec3(0.555, 0.58, 0.6)
#define SHELLC vec3(-180.0, 410.0, -2600.0)
#ifndef MIST_N
#define MIST_N 9
#endif
#ifndef NEAR_N
#define NEAR_N 5
#endif
#ifndef FAR_N
#define FAR_N 5
#endif

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.1; a *= 0.5; } return s / 0.875; }
float fbm5(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.1; a *= 0.5; } return s / 0.96875; }

// Overcast sky: pale at the horizon, slate overhead, a heavy drifting deck at ~2 km with thinner, brighter breaks where the
// light comes through near the hidden sun.
vec3 skyCol(vec3 d) {
  float e = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(vec3(0.56, 0.585, 0.605), vec3(0.27, 0.305, 0.34), pow(e, 0.55));
  float s = max(dot(d, uSun), 0.0);
  float t = 2000.0 / max(d.y, 0.035);
  float n = fbm5((uCam.xz + d.xz * t + uDrift * 3.0) * 0.00021);
  float cov = smoothstep(0.3, 0.68, n);
  vec3 cloud = mix(vec3(0.43, 0.455, 0.475), vec3(0.3, 0.32, 0.345), smoothstep(0.5, 0.9, n));
  cloud += SUNC * 0.3 * pow(s, 6.0) * (1.0 - smoothstep(0.35, 0.8, n));          // thin cloud lit from behind
  c += SUNC * (0.1 * pow(s, 3.0) + 0.35 * pow(s, 24.0));                          // the light breaking through
  return mix(c, cloud, cov * mix(0.2, 0.9, smoothstep(0.0, 0.25, d.y)));
}

// ---- 3D noise: a 64^3 tileable gradient-noise texture (3 octaves), or an ALU fallback without WebGL2 ----
#ifdef NO_TEX3D
float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 p) {
  p *= 6.0;
  vec3 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y);
  float b = mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z);
}
#else
uniform highp sampler3D uNoise;
float n3(vec3 p) { return texture(uNoise, p).r; }
#endif
// rotations so no octave lines up with the world axes or with another octave
const mat3 RA = mat3(0.788, 0.0, -0.616, 0.215, 0.937, 0.275, 0.577, -0.349, 0.738);
const mat3 RB = mat3(-0.43, 0.0, 0.903, 0.507, 0.827, 0.241, -0.747, 0.562, -0.356);

// Wind: uDrift advances diagonally (x and z). Each layer rides it at its own speed, and also evolves in place, so the fog
// visibly travels and changes shape over seconds without ever looping.

// Foreground wisps: a low layer hugging the ground near the camera (the rise is the same shape as world.js heightAt), broken
// into irregular patches that drift across the ground and past the equipment, the fastest-moving layer.
float rise(vec2 xz) { vec2 d = xz - vec2(6.0, 30.0); return max(28.0 * exp(-dot(d, d) / 31250.0), 1.2); }
// the layer lies below eye height: density falls off with a 2.5 m scale above the ground
float layAvg(float y0, float y1) {                       // mean of exp(-y/2.5) for y running linearly from y0 to y1
  y0 = max(y0, 0.0); y1 = max(y1, 0.0);
  float dy = y1 - y0;
  return abs(dy) < 0.02 ? exp(-y0 / 2.5) : 2.5 * (exp(-y0 / 2.5) - exp(-y1 / 2.5)) / dy;
}
float nearD(vec3 q, float tr, float lay) {
  vec3 w = q - vec3(uDrift.x * 1.25, 0.0, uDrift.y * 1.6);
  float a = n3(RA * vec3(w.x, w.y * 1.8, w.z) * 0.0055 + vec3(0.21, 0.63, uTime * 0.011));
  float b = n3(RB * vec3(w.x, w.y * 1.5, w.z) * 0.016 + (a - 0.5) * 0.25 + vec3(0.47, 0.12, uTime * 0.02));
  float fine = 1.0 - smoothstep(20.0, 80.0, tr), far = smoothstep(60.0, 200.0, tr);   // fine wisps only up close
  float d = mix(a, a * 0.7 + b * 0.3, fine);
  return 0.095 * lay * smoothstep(0.4 - 0.05 * far, 0.62 + 0.08 * far, d) * smoothstep(3.0, 20.0, tr);
}

// Ground and middle-distance mist: pools in the low valley under a ceiling that rises and falls with the large formations
// (no flat top). Large banks and medium drifting mist move at different speeds; between them the air clears.
float mistD(vec3 q, float tr, float ya, float yb) {
  float lod = smoothstep(400.0, 1800.0, tr), t = uTime;
  vec3 wb = q - vec3(uDrift.x * 0.7, 0.0, uDrift.y * 0.5);
  vec3 wm = q - vec3(uDrift.x * 1.3, 0.0, uDrift.y * 1.1);
  float big = n3(RA * vec3(wb.x, wb.y * 3.0, wb.z) * 0.00032 + vec3(0.0, 0.0, t * 0.0026));
  float top = 16.0 + 70.0 * big * big;
  vec3 hy = clamp(1.0 - vec3(ya, q.y, yb) / top, 0.0, 1.0);
  hy *= sqrt(hy);
  float h = (hy.x + 4.0 * hy.y + hy.z) / 6.0;               // the height profile averaged over the whole step
  if (h <= 0.0) return 0.0;
  float mid = n3(RB * vec3(wm.x, wm.y * 2.5, wm.z) * 0.0013 + (big - 0.5) * 0.2 + vec3(0.31, 0.17, t * 0.006));
  float d = big * 0.4 + mix(mid, 0.5 + (big - 0.5) * 0.6, lod * 0.6) * 0.6;    // finer detail fades with distance
  return 0.0095 * h * (0.05 + 0.95 * smoothstep(0.4, 0.58, d));
}
// Fog round the distant mountains: rises out of the valley floor beyond ~1.5 km and thins with height. Built only from large
// formations (1-2 km), so a few evenly spaced samples resolve it without noise; they drift and evolve so ridges come and go.
float farD(vec3 q) {
  float r = length(q.xz - uCam.xz);
  float k = smoothstep(1100.0, 5000.0, r);
  float h = exp(-max(q.y - 60.0, 0.0) / 540.0);
  vec3 w = q - vec3(uDrift.x * 1.8, 0.0, uDrift.y * 1.2);
  float n = n3(RB * vec3(w.x, w.y * 2.4, w.z) * 0.00011 + vec3(0.0, 0.0, uTime * 0.0028)) * 0.6
          + n3(RA * vec3(w.x, w.y * 2.0, w.z) * 0.00024 + vec3(0.53, 0.21, uTime * 0.0045)) * 0.4;
  return k * h * (0.000115 + 0.0023 * smoothstep(0.42, 0.62, n));
}

// The atmosphere between the camera and p: rgb = light scattered toward the camera, a = transmittance.
// Every march samples at fixed step midpoints and averages each layer's height profile across the step, so the result is
// smooth: no per-pixel dither pattern, no flicker as the camera drifts.
vec4 atmos(vec3 p) {
  vec3 r = p - uCam; float L = length(r); vec3 rd = r / L;
  float s = max(dot(rd, uSun), 0.0);
  vec3 sunS = SUNC * (0.08 * pow(s, 3.0) + 0.1 * pow(s, 16.0));       // light diffusing through toward the hidden sun
  vec3 acc = vec3(0.0); float T = 1.0;

  // 0. foreground wisps over the first ~240 m of ground
  float off = uCam.y - 2.1 - rise(uCam.xz);
  float nEnd = min(L, 240.0);
  if (rd.y > 0.0) nEnd = min(nEnd, 8.0 / rd.y);                      // rays rising out of the layer stop early
  if (nEnd > 3.0) for (int i = 0; i < NEAR_N; i++) {
    float a0 = float(i) / float(NEAR_N), a1 = (float(i) + 1.0) / float(NEAR_N);
    float t0 = nEnd * pow(a0, 1.6), t1 = nEnd * pow(a1, 1.6);
    float t = 0.5 * (t0 + t1);
    vec3 q0 = uCam + rd * t0, q1 = uCam + rd * t1;            // height above the ground at both ends of the step
    float lay = layAvg(q0.y - rise(q0.xz) - off, q1.y - rise(q1.xz) - off);
    float e = exp(-nearD(uCam + rd * t, t, lay) * (t1 - t0));
    acc += T * (1.0 - e) * (MISTC * 0.8 + sunS * 0.5); T *= e;
  }

  // 1. ground and middle-distance mist, front to back; steps bunch up near the camera
  float tEnd = min(L, 2800.0);
  if (rd.y > 0.0) tEnd = min(tEnd, max(86.0 - uCam.y, 0.0) / rd.y);
  if (tEnd > 0.5) {
    float n = clamp(floor(tEnd / 26.0), 3.0, float(MIST_N) * uQ);
    for (int i = 0; i < MIST_N; i++) {
      if (float(i) >= n) break;
      float a0 = float(i) / n, a1 = (float(i) + 1.0) / n;
      float t0 = tEnd * a0 * sqrt(a0), t1 = tEnd * a1 * sqrt(a1);
      float t = 0.5 * (t0 + t1), dt = t1 - t0;                       // fixed midpoints: smooth, no dither pattern
      float d = mistD(uCam + rd * t, t, uCam.y + rd.y * t0, uCam.y + rd.y * t1);
      float e = exp(-d * dt);
      vec3 c = mix(MISTC * 0.74, MISTC, smoothstep(15.0, 500.0, t)) + sunS * 0.7;   // nearer mist a little darker
      acc += T * (1.0 - e) * c; T *= e;
    }
  }

  // 2. fog round the mountains
  float f0 = 1300.0, f1 = min(L, 16000.0);
  if (rd.y > 0.0) f1 = min(f1, (2200.0 - uCam.y) / rd.y);
  if (f1 > f0) {
    float dt = (f1 - f0) / float(FAR_N);
    for (int i = 0; i < FAR_N; i++) {
      float d = farD(uCam + rd * (f0 + (float(i) + 0.5) * dt));
      float e = exp(-d * dt);
      acc += T * (1.0 - e) * (FARC + sunS); T *= e;
    }
  }

  // 3. a soft haze hugging the structure: integrated analytically from the ray's closest approach to it
  vec3 sc = (SHELLC - uCam) / vec3(230.0, 420.0, 230.0), sd = rd / vec3(230.0, 420.0, 230.0);
  float tc = clamp(dot(sc, sd) / dot(sd, sd), 0.0, L);
  vec3 cp = uCam + rd * tc;
  float m = length((cp - SHELLC) / vec3(230.0, 420.0, 230.0));
  float od3 = 0.17 * exp(-m * m * 2.2) * (0.25 + 1.5 * n3(RB * cp * 0.0009 - vec3(uDrift.x * 0.0005, 0.0, uTime * 0.006)));
  od3 *= mix(0.35, 1.0, smoothstep(0.0, 500.0, L - tc));                  // less in front of its own surface, no rim
  float e3 = exp(-od3);
  acc += T * (1.0 - e3) * (FOGC * 1.06 + sunS * 1.3); T *= e3;

  // 4. thin height fog everywhere (exact integral): the overall aerial perspective
  float k = 1.0 / 300.0, dy = r.y * k;
  float od0 = 0.000037 * exp(-uCam.y * k) * L * (abs(dy) > 1e-4 ? (1.0 - exp(-dy)) / dy : 1.0);
  float e0 = exp(-od0);
  acc += T * (1.0 - e0) * (FOGC + sunS); T *= e0;
  return vec4(acc, T);
}
`;
// fragment-only helpers
const COMMON = ATMOS + /* glsl */ `
vec3 applyFog(vec3 col, vec3 p) { vec4 a = atmos(p); return col * a.a + a.rgb; }

vec3 finish(vec3 c) {
  c = c / (1.0 + 0.2 * c);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.3);            // a gentle toe: deeper darks, the haze stays soft
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.82) * vec3(0.985, 1.0, 1.015);
  return c + (hash12(gl_FragCoord.xy + fract(uTime * 7.13) * 91.0) - 0.5) * (1.6 / 255.0);
}
`;

// ---- sky: a sphere around the camera, pushed to the far plane, drawn after the opaque scene ----
export const SKY_VS = /* glsl */ `
varying vec3 vD;
void main() {
  vD = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww * vec4(1.0, 1.0, 0.999999, 1.0);
}`;
export const SKY_FS = /* glsl */ `
${COMMON}
varying vec3 vD;
void main() {
  vec3 d = normalize(vD);
  vec3 c = skyCol(d);
  c = applyFog(c, uCam + d * 16000.0);
  gl_FragColor = vec4(finish(c), 1.0);
}`;

// ---- terrain: meadow, wet ground, rock and dark forest on the mountains, the access track ----
export const TERRAIN_VS = /* glsl */ `
varying vec3 vP;
varying vec3 vN;
void main() {
  vP = position; vN = normal;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;
export const TERRAIN_FS = /* glsl */ `
${COMMON}
uniform vec4 uShell;        // structure x, z, footprint radius, ground occlusion strength
varying vec3 vP;
varying vec3 vN;
float pathX(float z) { return 4.0 - 44.0 * smoothstep(-25.0, -390.0, z) + 9.0 * sin(z * 0.011); }
void main() {
  vec3 N = normalize(vN);
  vec2 xz = vP.xz;
  vec3 V = uCam - vP; float dist = length(V); V /= dist;
  float near = 1.0 - smoothstep(40.0, 600.0, dist);
  float g = fbm3(xz * 0.018), gg = vnoise(xz * 0.21), fine = vnoise(xz * 2.3) * near;
  vec3 grass = mix(vec3(0.115, 0.125, 0.095), vec3(0.17, 0.165, 0.125), g);
  grass = mix(grass, vec3(0.24, 0.225, 0.18), smoothstep(0.62, 0.86, vnoise(xz * 0.045 + 11.0)) * 0.8);   // dry patches
  float blades = vnoise(xz * vec2(1.3, 4.1) + gg) * near;
  grass *= 0.85 + 0.25 * gg + 0.2 * (fine - 0.5) + 0.22 * (blades - 0.5);
  float slope = 1.0 - N.y;
  float mtn = smoothstep(150.0, 450.0, vP.y);
  vec3 rock = vec3(0.2, 0.205, 0.21) * (0.8 + 0.4 * g);
  float forest = smoothstep(0.5, 0.64, fbm3(xz * 0.0026 + 4.0)) * smoothstep(60.0, 220.0, vP.y) * (1.0 - smoothstep(900.0, 1200.0, vP.y));
  vec3 alb = mix(grass, vec3(0.06, 0.07, 0.062), forest * 0.85);
  alb = mix(alb, rock, clamp(smoothstep(0.28, 0.55, slope + (g - 0.5) * 0.35) + mtn * smoothstep(0.55, 0.75, g) * 0.6, 0.0, 1.0));
  // the access track
  float px = abs(vP.x - pathX(vP.z));
  float track = smoothstep(1.9, 1.1, px) * smoothstep(-14.0, -40.0, vP.z) * step(-410.0, vP.z) * (0.75 + 0.25 * vnoise(xz * vec2(0.4, 0.1)));
  alb = mix(alb, vec3(0.2, 0.195, 0.18) * (0.85 + 0.3 * gg), track * 0.8);
  // pooled rain on flat low ground, on the pad and in the ruts of the track
  float flatG = smoothstep(0.985, 0.998, N.y) * (1.0 - mtn);
  float wet = smoothstep(0.7, 0.78, vnoise(xz * 0.06 + 2.0)) * flatG * smoothstep(30.0, 6.0, vP.y) * (1.0 - smoothstep(120.0, 380.0, dist)) * 0.5;
  // light: soft overcast sky + a weak sun through the clouds, broken by drifting cloud shadow
  float cs = mix(0.5, 1.0, smoothstep(0.35, 0.7, fbm3((xz + uDrift * 3.0) * 0.0011)));
  vec3 amb = mix(vec3(0.16, 0.16, 0.155), vec3(0.62, 0.66, 0.7), N.y * 0.5 + 0.5);
  float occ = 1.0 - uShell.w * exp(-dot(xz - uShell.xy, xz - uShell.xy) / (uShell.z * uShell.z));
  vec3 col = alb * (amb * 0.95 + SUNC * 0.55 * max(dot(N, uSun), 0.0) * cs) * occ;
  float ndv = max(V.y, 0.0), F = 0.03 + 0.97 * pow(1.0 - ndv, 5.0);
  if (wet > 0.002) col = mix(col, skyCol(reflect(-V, vec3(0.0, 1.0, 0.0))) * 0.8, wet * (0.2 + 0.7 * F));
  gl_FragColor = vec4(finish(applyFog(col, vP)), 1.0);
}`;

// ---- the structure: an enormous, smooth, dark ovoid standing on end, slightly egg-shaped and lens-thin ----
export const SHELL_VS = /* glsl */ `
uniform vec3 uPos;          // centre
uniform vec3 uExt;          // half width, half height, half thickness
uniform float uRot;
varying vec3 vP;
varying vec3 vN;
varying vec3 vL;
void main() {
  vec3 p = position;
  float taper = 1.0 - 0.1 * p.y;                         // a little narrower toward the top
  vec3 s = vec3(uExt.x * taper, uExt.y, uExt.z * taper);
  vec3 q = p * s;
  vec3 n = normalize(normal / s);
  float c = cos(uRot), si = sin(uRot);
  mat3 R = mat3(c, 0.0, -si, 0.0, 1.0, 0.0, si, 0.0, c);
  vP = uPos + R * q; vN = R * n; vL = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0);
}`;
export const SHELL_FS = /* glsl */ `
${COMMON}
varying vec3 vP;
varying vec3 vN;
varying vec3 vL;
void main() {
  vec3 N = normalize(vN), V = normalize(uCam - vP);
  float ndv = max(dot(N, V), 0.0);
  float F = 0.075 + 0.925 * pow(1.0 - ndv, 5.0);           // polished, like wet stone
  vec3 R = reflect(-V, N);
  // what it reflects: the overcast sky above, the dim valley and mist below
  vec3 env = R.y > 0.0 ? skyCol(R) : mix(vec3(0.07, 0.075, 0.075), MISTC * 0.8, exp(R.y * 9.0));
  float rough = 0.55 + 0.45 * fbm3(vL.xy * vec2(3.0, 7.0) + vL.z * 2.0);   // very soft, stone-like variation in the gloss
  vec3 base = vec3(0.034, 0.036, 0.039) * (0.9 + 0.2 * fbm3(vL.xy * 4.0 + 9.0));
  vec3 amb = mix(vec3(0.18, 0.18, 0.18), vec3(0.62, 0.66, 0.7), N.y * 0.5 + 0.5);
  vec3 col = base * amb + env * F * 0.6 * rough;
  col += SUNC * (0.012 * pow(max(dot(R, uSun) * 0.5 + 0.5, 0.0), 6.0) + 0.1 * pow(max(dot(R, uSun), 0.0), 18.0)) * rough;   // a soft sheen toward the light
  // it holds its darkness against the haze more than the land does: a heavier, slightly unreal presence
  vec4 a = atmos(vP);
  float T = pow(a.a, 0.55);
  gl_FragColor = vec4(finish(col * T + a.rgb * (1.0 - T) / max(1.0 - a.a, 1e-4)), 1.0);
}`;

// ---- the outpost and equipment: merged, vertex-coloured geometry with lit windows ----
export const OBJ_VS = /* glsl */ `
attribute vec3 color;
attribute float emit;
varying vec3 vP;
varying vec3 vN;
varying vec3 vC;
varying float vE;
void main() {
  vP = position; vN = normal; vC = color; vE = emit;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;
export const OBJ_FS = /* glsl */ `
${COMMON}
varying vec3 vP;
varying vec3 vN;
varying vec3 vC;
varying float vE;
void main() {
  vec3 N = normalize(vN);
  float cs = mix(0.5, 1.0, smoothstep(0.35, 0.7, fbm3((vP.xz + uDrift * 3.0) * 0.0011)));
  vec3 amb = mix(vec3(0.14, 0.14, 0.135), vec3(0.62, 0.66, 0.7), N.y * 0.5 + 0.5);
  float ao = 0.72 + 0.28 * smoothstep(0.0, 2.5, vP.y - 0.0);
  vec3 col = vC * (amb * 0.95 * ao + SUNC * 0.5 * max(dot(N, uSun), 0.0) * cs);
  col = mix(col, vC * vE, step(0.01, vE));
  gl_FragColor = vec4(finish(applyFog(col, vP)), 1.0);
}`;

// ---- lamp glows: small soft halos, wider and dimmer the more mist lies between them and the camera ----
export const GLOW_VS = /* glsl */ `
${ATMOS}
attribute vec4 aLamp;       // xyz, size (m)
attribute float aI;
varying vec2 vQ;
varying float vA;
void main() {
  float T = atmos(aLamp.xyz).a;
  vec4 mv = viewMatrix * vec4(aLamp.xyz, 1.0);
  float d = -mv.z;
  float s = max(aLamp.w * (1.0 + 1.6 * (1.0 - T)), d * 0.0022);   // never smaller than ~1.5 px
  mv.xy += position.xy * s;
  vQ = position.xy * 2.0; vA = aI * mix(0.25, 1.0, T);
  gl_Position = projectionMatrix * mv;
}`;
export const GLOW_FS = /* glsl */ `
varying vec2 vQ;
varying float vA;
void main() {
  float r2 = dot(vQ, vQ);
  float a = (exp(-r2 * 9.0) * 0.55 + exp(-r2 * 60.0)) * vA * (1.0 - smoothstep(0.7, 1.0, r2));
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.76) * a, 1.0);
}`;

// ---- fine motes drifting in the air close to the camera ----
export const MOTE_VS = /* glsl */ `
uniform float uTime;
uniform float uPx;          // metres per pixel at 1 m
attribute vec4 aM;          // offset in the drift box (xyz), phase
varying float vA;
varying vec2 vQ;
void main() {
  vec3 box = vec3(60.0, 9.0, 50.0);
  vec3 p = aM.xyz + vec3(uTime * (0.9 + aM.w * 0.5), sin(uTime * 0.3 + aM.w * 6.3) * 0.4, uTime * 0.15);
  p = mod(p, box) - box * 0.5;
  vec3 w = cameraPosition + vec3(p.x, p.y + 1.0, p.z - box.z * 0.5 - 4.0);
  vec4 mv = viewMatrix * vec4(w, 1.0);
  float d = -mv.z;
  vA = smoothstep(4.0, 9.0, d) * (1.0 - smoothstep(32.0, 50.0, d)) * (1.0 - smoothstep(0.35, 0.5, abs(p.x) / box.x)) * 0.2;
  mv.xy += position.xy * max(0.02, d * uPx * 1.8);
  vQ = position.xy * 2.0;
  gl_Position = projectionMatrix * mv;
}`;
export const MOTE_FS = /* glsl */ `
varying float vA;
varying vec2 vQ;
void main() {
  float a = vA * max(0.0, 1.0 - dot(vQ, vQ));
  if (a < 0.003) discard;
  gl_FragColor = vec4(vec3(0.74, 0.76, 0.77), a);
}`;
