// GLSL for the Arrakis scene. Everything is shaded in linear light and tone-mapped once per fragment (ACES fit + sRGB).
// The same `haze()` / `aerial()` functions colour the sky at the horizon and the far terrain, so land fades into air seamlessly.

export const COMMON = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uCam;
uniform float uTime;
uniform vec2 uWind;
uniform float uExposure;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm3(vec2 p) { return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.07 + 13.1) + 0.2 * vnoise(p * 4.13 - 7.7); }

// Faint crepuscular rays: the dust around the sun is lit unevenly, in slow radial streaks (angle around the sun direction).
float sunRays(vec3 v) {
  vec3 b1 = normalize(cross(uSun, vec3(0.0, 1.0, 0.0))), b2 = cross(b1, uSun);
  float ang = atan(dot(v, b2), dot(v, b1));
  return vnoise(vec2(ang * 5.0, uTime * 0.02)) * 0.7 + vnoise(vec2(ang * 11.0 + 4.0, uTime * 0.03)) * 0.3;
}
// Arrakis air: suspended dust that is rust-brown away from the sun and amber towards it, rising into a hot golden
// forward-scattering glow (with faint rays) around the low sun.
vec3 haze(vec3 v) {
  float mu = dot(v, uSun), m = max(mu, 0.0);
  vec3 base = mix(vec3(0.165, 0.068, 0.03), vec3(0.245, 0.122, 0.048), smoothstep(-0.5, 0.95, mu));
  float glow = 0.32 * pow(m, 5.0) + 0.7 * pow(m, 34.0);
  float rays = 1.0;
  if (m > 0.75) rays = 0.88 + 0.28 * (sunRays(v) - 0.5) * smoothstep(0.75, 0.985, m);   // restrained: a breath of structure in the glow
  return base + vec3(1.02, 0.6, 0.24) * glow * rays;
}
// Optical depth along a view ray: uniform dust + exponential ground haze that pools in the troughs.
float opticalDepth(vec3 ro, vec3 rd, float dist) {
  float a = 0.00008, b = 0.0058, k = 0.00042;
  float ry = abs(rd.y) < 1e-3 ? 1e-3 * sign(rd.y + 1e-6) : rd.y;
  float hf = k * exp(-b * ro.y) * (1.0 - exp(-b * ry * dist)) / (b * ry);
  return a * dist + hf;
}
vec3 aerial(vec3 col, vec3 P, out float ext) {
  vec3 d = P - uCam; float dist = length(d); vec3 v = d / dist;
  ext = 1.0 - exp(-opticalDepth(uCam, v, dist));
  return mix(col, haze(v), ext);
}
vec3 aerialH(vec3 col, vec3 P, vec3 hz, out float ext) {      // same, with the haze colour already evaluated
  vec3 d = P - uCam; float dist = length(d);
  ext = 1.0 - exp(-opticalDepth(uCam, d / dist, dist));
  return mix(col, hz, ext);
}
vec3 tonemap(vec3 c) {
  c *= uExposure;
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}
`;

export const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const SKY_FS = /* glsl */ `
${COMMON}
varying vec3 vDir;
void main() {
  vec3 v = normalize(vDir);
  float y = v.y, mu = dot(v, uSun);
  float az = atan(v.x, -v.z);
  // high dust veils drifting slowly with the wind; denser and more banded near the horizon
  vec2 q = vec2(az * 2.6 + uTime * 0.0035, y * 9.0);
  float veil = fbm3(q * vec2(1.0, 1.0) + vec2(fbm3(q * 0.7 + 4.0) * 1.4, 0.0));
  float band = fbm3(vec2(az * 7.0 - uTime * 0.006, y * 46.0));
  // deep dusty brown overhead → muted amber → burnt orange / red-brown low on the horizon
  vec3 zen = vec3(0.04, 0.025, 0.017);                                  // dusty brown, desaturated
  vec3 mid = vec3(0.11, 0.056, 0.027);
  float t = smoothstep(-0.01, 0.42, y);
  vec3 upper = mix(mid, zen, smoothstep(0.1, 0.6, y)) + vec3(0.2, 0.1, 0.035) * pow(max(mu, 0.0), 3.0);
  vec3 col = mix(haze(v), upper, pow(t, 0.62));
  float low = exp(-max(y, 0.0) * 22.0) * (1.0 - smoothstep(0.4, 0.95, mu));
  col = mix(col, col * vec3(1.12, 0.78, 0.6) + vec3(0.03, 0.006, 0.0), low * 0.55);     // reddish dust band at the horizon
  col *= 0.93 + 0.14 * veil;                                                  // soft mottling of suspended dust
  col = mix(col, col * vec3(0.9, 0.87, 0.83), smoothstep(0.55, 0.8, band) * (1.0 - t) * 0.5);   // thin darker dust layers
  // the sun: a pale ivory disc dimmed and broken by the dust it sits in, with a wide amber corona
  float ang = acos(clamp(mu, -1.0, 1.0));
  float occl = smoothstep(0.35, 0.75, fbm3(vec2(az * 40.0 + uTime * 0.01, y * 40.0)));
  float disc = smoothstep(0.0125, 0.0075, ang) * (0.55 - 0.35 * occl);
  col += vec3(1.6, 1.32, 0.82) * disc;                                                  // pale gold through the dust
  col += vec3(1.0, 0.64, 0.28) * (pow(max(mu, 0.0), 900.0) * 0.65 + pow(max(mu, 0.0), 90.0) * 0.4) * (0.8 - 0.3 * occl);
  gl_FragColor = vec4(tonemap(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}
`;

export const TERRAIN_VS = /* glsl */ `
uniform vec3 uCam;
uniform float uTime;
varying vec3 vP;
varying vec3 vN;
void main() {
  vP = position; vN = normal;
  vec4 cp = projectionMatrix * viewMatrix * vec4(position, 1.0);
  // heat shimmer: distant ground and the far skyline wobble by about a pixel, in slow rising cells (no extra render pass)
  float far = smoothstep(1300.0, 4200.0, length(position - uCam));
  float sh = sin(position.x * 0.05 + uTime * 2.1 + sin(position.z * 0.012 + uTime * 0.6) * 2.0) * (0.6 + 0.4 * sin(position.x * 0.011 - uTime * 0.9));
  cp.y += far * sh * 0.0024 * cp.w;
  gl_Position = cp;
}
`;

export const TERRAIN_FS = /* glsl */ `
${COMMON}
uniform sampler2D uL0; uniform sampler2D uL1; uniform sampler2D uL2;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;     // cascade centre x, z, size
uniform vec2 uSU;                                          // horizontal axis towards the sun
uniform float uDetail;                                     // 1 desktop, lower on phones
varying vec3 vP;
varying vec3 vN;

vec2 cuv(vec3 c, vec2 xz) { vec2 d = xz - c.xy; return vec2(dot(d, uSU), dot(d, vec2(-uSU.y, uSU.x))) / c.z + 0.5; }
float edge(vec2 uv) { vec2 a = abs(uv - 0.5); return smoothstep(0.43, 0.49, max(a.x, a.y)); }
vec2 bakedLight(vec2 xz) {
  vec2 u0 = cuv(uC0, xz), u1 = cuv(uC1, xz), u2 = cuv(uC2, xz);
  vec2 l2 = mix(texture2D(uL2, u2).rg, vec2(1.0), edge(u2));
  vec2 l1 = mix(texture2D(uL1, u1).rg, l2, edge(u1));
  return mix(texture2D(uL0, u0).rg, l1, edge(u0));
}

// Wind ripples: asymmetric wave across the wind, sinuous through domain warping. Returns the slope (d/dx, d/dz).
vec2 ripples(vec2 xz, float lambda, float warpS, float amp) {
  vec2 W = uWind, Wp = vec2(-W.y, W.x);
  float warp = vnoise(xz * warpS) * 2.6 + vnoise(xz * warpS * 3.7 + 5.0) * 0.7;
  float ph = (dot(xz, W) + 0.18 * dot(xz, Wp) * (vnoise(xz * warpS * 0.5) - 0.5)) / lambda + warp;
  float fw = fwidth(ph);
  float fade = 1.0 - smoothstep(0.18, 0.5, fw);                      // fade out before the pattern aliases
  float c = 6.2832 * ph;
  float dr = 6.2832 * (cos(c) + 0.55 * cos(2.0 * c) * 0.9);           // skewed: steep lee, gentle stoss
  float breaks = smoothstep(0.25, 0.6, vnoise(xz * warpS * 1.8 + 9.0));
  return W * (dr / lambda) * amp * fade * (0.45 + 0.55 * breaks);
}

void main() {
  vec3 N = normalize(vN);
  vec2 xz = vP.xz;
  float dist = length(vP - uCam);
  float slope = 1.0 - N.y;
  float gentle = 1.0 - smoothstep(0.06, 0.32, slope);

  // ---- micro relief: ripples on gentle stoss slopes, none on the avalanche faces ----
  vec2 g = vec2(0.0);
  g += ripples(xz, 0.7, 0.09, 0.012) * gentle * smoothstep(0.15, 0.7, vnoise(xz * 0.04 + 3.0));
  g += ripples(xz + 31.0, 2.2, 0.025, 0.013) * gentle * smoothstep(0.2, 0.8, vnoise(xz * 0.015));
  g += ripples(xz + 77.0, 15.0, 0.006, 0.045) * (0.4 + 0.6 * gentle);      // long wind streaks for the middle ground
  // grain of the avalanche faces: faint streaks running down the slope
  vec2 down = normalize(N.xz + 1e-4);
  float streak = vnoise(vec2(dot(xz, vec2(-down.y, down.x)) * 0.9, dot(xz, down) * 0.05)) - 0.5;
  float steep = smoothstep(0.2, 0.45, slope);
  vec3 n = normalize(N + vec3(-g.x, 0.0, -g.y) * uDetail + vec3(-down.y, 0.0, down.x) * streak * 0.06 * steep * uDetail);


  // ---- sand albedo: golden ochre on the stoss, burnt orange-rust on the slip faces, whole formations of rust/copper sand ----
  vec3 sand = vec3(0.74, 0.43, 0.15);
  vec3 lee = vec3(0.58, 0.255, 0.09);
  vec3 rust = vec3(0.56, 0.21, 0.08);
  float mott = fbm3(xz * 0.0045) - 0.5, fine = vnoise(xz * 0.35) - 0.5;
  float region = smoothstep(0.52, 0.8, vnoise(xz * 0.0011 + 7.3));
  vec3 alb = mix(mix(sand, lee, steep), rust, region * 0.6) * (1.0 + mott * 0.2 + fine * 0.05);

  // ---- light ----
  vec2 bl = bakedLight(xz);
  float shadow = bl.r, ao = bl.g;
  float ndl = dot(n, uSun);
  float sunTerm = max(ndl, 0.0) * shadow;
  // terminator softness: sand scatters a little light just past grazing (keeps the lee edge from turning to ink)
  sunTerm += 0.04 * smoothstep(-0.2, 0.05, ndl) * shadow;
  vec3 sunCol = vec3(1.0, 0.84, 0.56) * 4.7;                        // warm, slightly golden low sun
  vec3 skyAmb = vec3(0.28, 0.135, 0.07) * 0.34;                   // dusty amber sky fill
  vec3 bounce = vec3(0.42, 0.13, 0.045) * 0.28;                     // red-brown light bounced between dunes
  vec3 amb = mix(bounce, skyAmb, n.y * 0.5 + 0.5) * (0.22 + 0.78 * ao * ao);
  vec3 col = alb * (sunCol * sunTerm + amb);
  // golden glint where faces turn fully to the sun (crest flanks): pushes highlights towards yellow, shadows stay rust
  col += alb * vec3(1.0, 0.86, 0.3) * pow(max(ndl, 0.0), 2.5) * shadow * 1.8;
  // dry sand rim glow where crests catch the low sun almost edge-on
  vec3 v = normalize(vP - uCam);
  vec3 hz = haze(v);
  float rim = pow(1.0 - max(dot(-v, n), 0.0), 4.0) * max(dot(v, uSun), 0.0) * shadow;
  col += vec3(1.0, 0.72, 0.36) * rim * 0.4;

  // ---- flowing sand: a thin layer of grains streaming over every dune surface, advected along the wind ----
  // Three scales of wind-stretched noise move downwind at ~4-7.5 m/s: fine streaks in the foreground, continuous sheets in the
  // middle ground, broad bands over the exposed crests far away. Each scale fades out (by its screen-space derivative) before
  // it could alias, so coverage is continuous from near to far. The flow follows the surface because it lives in it, and it
  // is lit by the same sun and baked shadow: golden on sunlit slopes, faint in shadow.
  vec2 Wd = uWind, Wq = vec2(-Wd.y, Wd.x);
  float fwd = pow(max(dot(v, uSun), 0.0), 4.0);
  vec2 sw = vec2(dot(xz, Wd), dot(xz, Wq));                                  // along / across the wind
  float aF = 1.0 - smoothstep(0.2, 0.55, fwidth(sw.y * 2.6));                 // derivatives outside the branches
  float aM = 1.0 - smoothstep(0.2, 0.55, fwidth(sw.y * 0.8));
  float aC = 1.0 - smoothstep(0.35, 1.1, fwidth(sw.y * 0.22));
  float crestK = smoothstep(0.55, 0.92, ao);                                 // exposed crests / high ground
  float leeK = steep * (1.0 - smoothstep(-0.1, 0.15, dot(N.xz, -Wd)));      // slip faces turned downwind (sheltered)
  float farK = smoothstep(900.0, 2600.0, dist);
  float reach = mix(0.55 + 0.45 * crestK, crestK * crestK, farK) * (1.0 - 0.6 * leeK)
              * (1.0 - smoothstep(2600.0, 4200.0, dist)) * smoothstep(6.0, 30.0, dist);
  float sunlit = shadow * (0.3 + 0.7 * smoothstep(0.02, 0.4, ndl));
  vec3 grains = alb * (sunCol * (0.2 + 0.7 * ndl) * shadow + amb * 1.4) + vec3(1.0, 0.7, 0.32) * fwd * shadow * 0.2;
  if (reach > 0.02 && aC > 0.01) {
    float gust = 0.35 + 0.65 * smoothstep(0.25, 0.75, vnoise(sw * vec2(0.0035, 0.007) - vec2(uTime * 0.035, 0.0)));
    float y = sw.y + sin(sw.x * 0.011 + sin(sw.y * 0.031) * 2.0) * 3.0 + sin(sw.x * 0.0047 - sw.y * 0.013) * 5.0;   // lanes meander, never ruled lines
    // each scale is weighted by how well it can be resolved here, then normalised: whichever scale is valid carries the
    // full strength, so the flow stays continuous from the foreground to the far crests (no gaps where a scale fades out)
    float wC = aC * 0.6 * (1.0 - smoothstep(0.6, 0.95, aF)), wM = aM * (1.0 - aF * 0.5), wF = aF;
    float flow = 0.0, nM = 0.5;
    if (wC > 0.01) flow += wC * smoothstep(0.5, 0.85, vnoise(vec2(sw.x * 0.012 - uTime * 0.05, y * 0.22)) * (0.75 + 0.5 * gust));
    if (wM > 0.01) { nM = vnoise(vec2(sw.x * 0.05 - uTime * 0.27, y * 0.8) + 3.0); flow += wM * smoothstep(0.55, 0.88, nM); }
    if (wF > 0.01) flow += wF * smoothstep(0.55, 0.9, vnoise(vec2(sw.x * 0.16 - uTime * 1.2, y * 2.6) + 7.0) * (0.6 + 0.8 * nM));   // fine streaks ride in packets of the medium flow
    flow /= max(wC + wM + wF, 0.35);
    col = mix(col, grains, min(flow, 1.0) * gust * reach * (0.1 + 0.9 * sunlit) * 0.72);
  }
  // (sand drifting down the lee slopes is carried by the crest grains in SAND_VS, which spill over and follow the slope)

  // ---- air: aerial perspective + drifting ground dust in the troughs ----
  float ext;
  col = aerialH(col, vP, hz, ext);
  // dust wisps hugging the low ground: streaked along the wind, drifting with it
  vec2 dq = vec2(dot(xz, Wd) * 0.0018, dot(xz, Wq) * 0.0055) - vec2(uTime * 0.06, 0.0);
  float dust = fbm3(dq + vnoise(dq * 1.7 + 2.0) * 0.8) * vnoise(xz * 0.0011 + 3.0 - uWind * uTime * 0.012);
  float dustAmt = smoothstep(0.16, 0.44, dust) * smoothstep(90.0, 600.0, dist) * exp(-max(vP.y + 4.0, 0.0) / 28.0) * 0.38;
  col = mix(col, hz * 1.08, dustAmt * (1.0 - ext));
  gl_FragColor = vec4(tonemap(col) + (hash12(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}
`;

// Wind-blown sand: hairline streaks skimming the dunes. Each instance is one grain drawn as a thin quad from where it was a
// moment ago to where it is now (a motion streak), expanded to ~1-1.5 px in screen space. Grains move with the wind at
// 5-13 m/s, follow the terrain through a baked height field, make small saltation hops, and are lit by the baked sunlight,
// so they show over sunlit sand and almost vanish in shadow.
export const SAND_VS = /* glsl */ `
${COMMON}
attribute vec4 aA;          // spawn x, z; crest (1) or surface (0); crest lift (m)
attribute vec4 aB;          // size, phase, lateral, speed
uniform sampler2D uH;
uniform vec4 uHB;           // height field x0, z0, size, res
uniform vec2 uRes;          // drawing-buffer size (px)
uniform float uPR;
uniform sampler2D uL0; uniform sampler2D uL1;
uniform vec3 uC0; uniform vec3 uC1;
uniform vec2 uSU;
varying float vA;
varying vec3 vCol;
varying vec2 vQ;

float texel(vec2 ij) { return texture2D(uH, (clamp(ij, vec2(0.0), vec2(uHB.w - 1.0)) + 0.5) / uHB.w).r; }
float H(vec2 xz) {                                   // bilinear (the float texture is sampled nearest)
  vec2 g = (xz - uHB.xy) / uHB.z * uHB.w - 0.5, i = floor(g), f = g - i;
  return mix(mix(texel(i), texel(i + vec2(1.0, 0.0)), f.x), mix(texel(i + vec2(0.0, 1.0)), texel(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec2 cuv(vec3 c, vec2 xz) { vec2 d = xz - c.xy; return vec2(dot(d, uSU), dot(d, vec2(-uSU.y, uSU.x))) / c.z + 0.5; }
float sunShadow(vec2 xz) {
  vec2 u0 = cuv(uC0, xz), u1 = cuv(uC1, xz);
  vec2 a0 = abs(u0 - 0.5);
  return max(a0.x, a0.y) < 0.48 ? texture2D(uL0, u0).r : texture2D(uL1, u1).r;
}
vec3 grainAt(float l, vec2 dir, vec2 base, float run, float crest) {
  vec2 xz = base + dir * l * run;
  float hop = 0.07 + 0.22 * aB.x * abs(sin(l * run * 0.9 + aB.y * 31.0));                      // saltation: short low hops
  hop += crest * aA.w * smoothstep(0.0, 0.08, l) * (1.0 - smoothstep(0.08, 0.6, l));          // lift off the crest edge
  return vec3(xz.x, H(xz) + hop, xz.y);
}
void main() {
  float crest = aA.z;
  vec2 W = uWind, Wp = vec2(-W.y, W.x);
  vec2 dir = normalize(W + Wp * (fract(aB.w * 13.7) - 0.5) * 0.08);
  float spd = mix(5.0, 13.0, aB.w) * mix(1.15, 0.75, aB.x);                                     // big grains are slower
  float run = crest > 0.5 ? mix(10.0, 28.0, aB.w) : mix(16.0, 42.0, aB.w);
  float per = run / spd;
  float life = fract(uTime / per + aB.y);
  // crest grains spread along the crest line; surface grains stay in their lane (a thread ~2 m wide)
  vec2 base = aA.xy + Wp * (aB.z - 0.5) * (crest > 0.5 ? 5.0 : 2.0) - W * (crest > 0.5 ? 1.5 : 0.0);
  float dl = 0.18 / per;                                                                        // exposure time of the streak
  vec3 head = grainAt(life, dir, base, run, crest);
  // cheap visibility first: outside the height field, faded out, too near/far or behind the camera → skip the rest
  float env = crest > 0.5 ? smoothstep(0.0, 0.04, life) * (1.0 - smoothstep(0.3, 1.0, life))
                          : smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.65, 1.0, life));
  vec2 rel = (head.xz - uHB.xy) / uHB.z;
  float inside = step(0.0, rel.x) * step(rel.x, 1.0) * step(0.0, rel.y) * step(rel.y, 1.0);
  float dist = length(head - uCam);
  float pre = env * inside * smoothstep(12.0, 40.0, dist) * (1.0 - smoothstep(1000.0, 1600.0, dist));
  vec4 hc = projectionMatrix * viewMatrix * vec4(head, 1.0);
  if (pre < 0.004 || hc.w < 1.0 || abs(hc.x) > hc.w * 1.05 || abs(hc.y) > hc.w * 1.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; vCol = vec3(0.0); vQ = vec2(0.0); return; }
  vec3 tail = grainAt(max(life - dl, 0.0), dir, base, run, crest);

  // light: baked sun shadow + slope from the height field
  float h0 = H(head.xz);                                                                         // slope by forward differences
  vec3 n = normalize(vec3(h0 - H(head.xz + vec2(2.0, 0.0)), 2.0, h0 - H(head.xz + vec2(0.0, 2.0))));
  float shadow = sunShadow(head.xz);
  float ndl = max(dot(n, uSun), 0.0) * shadow;
  float lit = shadow * (0.55 + 0.45 * smoothstep(0.03, 0.4, ndl));
  float windward = smoothstep(-0.05, 0.3, dot(n.xz, -W));
  vec3 v = normalize(head - uCam);
  float fwd = pow(max(dot(v, uSun), 0.0), 4.0);
  vec3 alb = aB.x < 0.4 ? vec3(0.8, 0.5, 0.22) : aB.x < 0.75 ? vec3(0.84, 0.56, 0.22) : vec3(0.66, 0.38, 0.16);   // sandy beige, muted gold, ochre
  // close to the sand beneath, with a slight golden lift where the sun catches the grains; dark in shadow
  vec3 c = alb * (vec3(1.0, 0.84, 0.56) * 4.4 * shadow * (0.12 + 0.85 * ndl + 0.15 * fwd) + vec3(0.28, 0.14, 0.07) * 0.32);
  float ext; vCol = aerial(c, head, ext);

  // density: gust fronts travelling downwind; crest grains densest at the edge, surface grains mostly on sunlit windward ground
  float gust = smoothstep(0.2, 0.75, vnoise(head.xz * 0.012 - W * uTime * 0.09));
  float where = crest > 0.5 ? 1.0 : 0.5 + 0.5 * windward;
  vA = pre * (0.3 + 0.7 * gust) * where * (0.06 + 0.94 * lit) * (1.0 - ext) * mix(0.5, 0.8, aB.x);

  // pull both ends towards the camera along their view rays: same screen position, but never buried in the surface
  head -= normalize(head - uCam) * (0.5 + dist * 0.004);
  tail -= normalize(tail - uCam) * (0.5 + length(tail - uCam) * 0.004);
  vec4 c0 = projectionMatrix * viewMatrix * vec4(tail, 1.0), c1 = projectionMatrix * viewMatrix * vec4(head, 1.0);
  if (c0.w < 1.0 || c1.w < 1.0 || vA < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; return; }
  vec2 s0 = c0.xy / c0.w * uRes * 0.5, s1 = c1.xy / c1.w * uRes * 0.5;
  vec2 d = s1 - s0; float L = length(d); vec2 dn = L > 1e-3 ? d / L : vec2(1.0, 0.0);
  float minL = 6.0 * uPR;                                                                       // always a streak, never a dot
  if (L < minL) { s0 = s1 - dn * minL; vA *= L / minL * 0.4 + 0.6; }
  float w = mix(0.7, 1.1, aB.x) * uPR;                                                          // hairline
  vec4 cc = mix(c0, c1, position.x);
  vec2 sp = mix(s0, s1, position.x) + vec2(-dn.y, dn.x) * position.y * w * 0.5 + dn * (position.x - 0.5) * uPR;
  gl_Position = vec4(sp / (uRes * 0.5) * cc.w, cc.z, cc.w);
  vQ = position.xy;
}
`;
export const SAND_FS = /* glsl */ `
${COMMON}
varying float vA;
varying vec3 vCol;
varying vec2 vQ;
void main() {
  float a = vA * mix(0.2, 1.0, vQ.x) * (1.0 - smoothstep(0.55, 1.0, abs(vQ.y)));   // fades towards the tail; soft edges
  if (a < 0.003) discard;
  gl_FragColor = vec4(tonemap(vCol), a);
}
`;

// The name as a cinematic title at the horizon: thin, widely tracked capitals on a camera-facing quad ~6 km out, sized and placed
// to the view (see HomeScene) so their baseline sits on the distant dune line; nearer silhouettes overlap the lower edge through
// the depth test. The letterforms are never distorted: only a faint veil of drifting dust, the horizon haze and a very slow
// breathing of opacity act on them.
export const TITLE_VS = /* glsl */ `
${COMMON}
uniform vec3 uPos;          // centre (world)
uniform vec2 uSize;         // width, height (m)
varying vec2 vUv;
varying vec3 vW;
void main() {
  vec3 f = normalize(uPos - uCam), r = normalize(cross(f, vec3(0.0, 1.0, 0.0))), u = cross(r, f);
  vec3 w = uPos + r * position.x * uSize.x + u * position.y * uSize.y;
  vUv = position.xy + 0.5; vW = w;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
export const TITLE_FS = /* glsl */ `
${COMMON}
uniform sampler2D uText;
uniform vec3 uPos;
uniform vec2 uSize;
uniform float uCx[15];      // centre of each letter (u)
uniform float uAlpha;       // peak opacity
varying vec2 vUv;
varying vec3 vW;
void main() {
  float ink = texture2D(uText, vUv).r;
  if (ink < 0.004) discard;
  float t = uTime;
  // a faint veil of dust drifting across with the wind (thins the letters by at most ~15%, never breaks them)
  vec2 q = vec2(vUv.x * 5.0 - t * 0.03, vUv.y * 1.6);
  float dust = fbm3(q + vec2(fbm3(q * 0.6 + t * 0.01) * 1.2, 0.0));
  float veil = 1.0 - 0.15 * smoothstep(0.45, 0.8, dust);
  float breathe = 0.93 + 0.07 * sin(t * 0.11) * sin(t * 0.047 + 1.3);
  float a = ink * uAlpha * veil * breathe;
  // muted sandy ivory, softened towards the horizon haze. Against the bright sun glow a letter settles to a darker dusty tone
  // instead, so the whole name stays readable. The choice is made once per letter (from the sky behind its centre): deciding per
  // pixel would split letters and leave a band where the tone crosses the sky's own brightness.
  float cx = uCx[0];
  for (int i = 1; i < 15; i++) if (abs(uCx[i] - vUv.x) < abs(cx - vUv.x)) cx = uCx[i];
  vec3 fw = normalize(uPos - uCam), rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 skyC = tonemap(haze(normalize(uPos + rt * (cx - 0.5) * uSize.x - uCam)));
  float dark = step(0.66, dot(skyC, vec3(0.299, 0.587, 0.114)));            // all-or-nothing per letter: never a half tone
  vec3 sky = tonemap(haze(normalize(vW - uCam)));
  vec3 col = mix(vec3(0.93, 0.86, 0.73), sky * vec3(0.72, 0.65, 0.56), dark);
  col = mix(col, sky, 0.15);
  gl_FragColor = vec4(col, a);
}
`;
