// Shaders for the Martian exterior: the dusty sky (rust-brown at the horizon, deep maroon overhead, a faint muted glow round
// the low sun, slow drifting haze along the horizon) and the fine dust blowing past the observation windows.

export const SKY_VS = /* glsl */ `
varying vec3 vD;
void main() {
  vD = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww * vec4(1.0, 1.0, 0.99999, 1.0);
}`;

export const SKY_FS = /* glsl */ `
uniform vec3 uSun;
uniform float uTime;
uniform vec3 uHorizon;
varying vec3 vD;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
void main() {
  vec3 d = normalize(vD);
  float e = clamp(d.y, 0.0, 1.0);
  vec3 zen = vec3(0.055, 0.026, 0.021);
  vec3 col = mix(uHorizon, zen, pow(e, 0.42));
  // the low sun: a small pale disc in a faint, muted halo, dimmed by the dust
  float s = max(dot(d, uSun), 0.0);
  col += vec3(0.46, 0.36, 0.32) * pow(s, 24.0) * 0.3 + vec3(1.0, 0.84, 0.7) * pow(s, 900.0) * 1.2 + vec3(0.6, 0.32, 0.2) * pow(s, 5.0) * 0.09;
  // slow bands of airborne dust low over the horizon
  float az = atan(d.x, -d.z);
  float band = noise(vec2(az * 6.0 + uTime * 0.01, e * 30.0)) * 0.6 + noise(vec2(az * 15.0 - uTime * 0.02, e * 60.0)) * 0.4;
  col = mix(col, uHorizon * 1.08, (1.0 - smoothstep(0.0, 0.16, e)) * band * 0.45);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

// Dust motes outside the window: soft specks drifting across with the wind, fading with distance into the haze.
export const DUST_VS = /* glsl */ `
uniform float uTime;
attribute vec4 aD;          // x, y, z in the drift volume, phase
varying float vA;
varying vec2 vQ;
void main() {
  vec3 box = vec3(90.0, 14.0, 70.0);
  vec3 p = aD.xyz + vec3(uTime * (2.2 + aD.w * 1.5), sin(uTime * 0.4 + aD.w * 6.3) * 0.6, 0.0);
  p = mod(p, box);
  vec3 w = vec3(p.x - box.x * 0.5, p.y - 2.0, -12.0 - p.z);
  vec4 mv = viewMatrix * vec4(w, 1.0);
  float dist = -mv.z;
  vA = smoothstep(4.0, 10.0, dist) * (1.0 - smoothstep(45.0, 80.0, dist)) * 0.4;
  mv.xy += position.xy * (0.05 + 0.002 * dist);
  vQ = position.xy * 2.0;
  gl_Position = projectionMatrix * mv;
}`;
export const DUST_FS = /* glsl */ `
varying float vA;
varying vec2 vQ;
void main() {
  float a = vA * max(0.0, 1.0 - dot(vQ, vQ));
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.52, 0.31, 0.22), a);
}`;
