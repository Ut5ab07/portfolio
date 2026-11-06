// A tileable 3D gradient-noise field (n^3, 8-bit): three octaves with lattice periods 4, 8 and 16 across the tile, so it wraps
// seamlessly. The shaders sample it at several rotated scales, which keeps the repetition invisible.
// A generator so one algorithm serves both callers: noise.worker.js runs it straight through, and the main-thread fallback in
// ProfileScene.js yields to the page between steps. It is deterministic: the same N always gives the same bytes.
export function* noiseField(N) {
  const G = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
  const acc = new Float32Array(N * N * N);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  for (const [o, [P, amp]] of [[4, 1], [8, 0.5], [16, 0.25]].entries()) {
    const grad = new Uint8Array(P * P * P);
    for (let i = 0; i < grad.length; i++) { let h = Math.imul(i + 1, 2654435761) ^ Math.imul(o + 7, 40503); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; grad[i] = (h >>> 0) % 12; }
    const cell = N / P;
    const g = (x, y, z) => G[grad[((z % P) * P + (y % P)) * P + (x % P)]];
    for (let z = 0; z < N; z++) {
      yield;
      const fz = (z + 0.5) / cell, iz = Math.floor(fz), tz = fz - iz, wz = fade(tz);
      for (let y = 0; y < N; y++) {
        const fy = (y + 0.5) / cell, iy = Math.floor(fy), ty = fy - iy, wy = fade(ty);
        for (let x = 0; x < N; x++) {
          const fx = (x + 0.5) / cell, ix = Math.floor(fx), tx = fx - ix, wx = fade(tx);
          let v = 0;
          for (let c = 0; c < 8; c++) {
            const dx = c & 1, dy = (c >> 1) & 1, dz = c >> 2, q = g(ix + dx, iy + dy, iz + dz);
            const w = (dx ? wx : 1 - wx) * (dy ? wy : 1 - wy) * (dz ? wz : 1 - wz);
            v += w * (q[0] * (tx - dx) + q[1] * (ty - dy) + q[2] * (tz - dz));
          }
          acc[(z * N + y) * N + x] += v * amp;
        }
      }
    }
  }
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < acc.length; i++) { lo = Math.min(lo, acc[i]); hi = Math.max(hi, acc[i]); }
  const data = new Uint8Array(acc.length);
  for (let i = 0; i < acc.length; i++) data[i] = Math.round((acc[i] - lo) / (hi - lo) * 255);
  return data;
}
