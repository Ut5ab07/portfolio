import * as THREE from 'three';

// Monitor content for the facility, drawn into small canvas textures and refreshed a few times a second at most: code and
// request logs at the software desk, plots at the analysis console, a deployment pipeline on the operations wall, and
// habitat telemetry. Restrained, desaturated colours; nothing flashes.
const BG = '#0b1013', GRID = 'rgba(140,175,185,0.08)', INK = '#cfd6d4', DIM = '#6f8288', CYAN = '#86b3bf', AMBER = '#d39a5f', OK = '#8fb59a';
const MONO = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function makeScreen(kind, w, h, seed = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  const R = rng(seed), st = { t: 0, next: 0, k: 0, R, lines: [], pts: [] };
  const painter = PAINT[kind];
  if (painter.init) painter.init(st, w, h);
  return {
    tex,
    // step the content when its interval has elapsed (or always, when force is set); returns true if it changed
    update(time, force) {
      if (!force && time < st.next) return false;
      st.t = time; st.next = time + painter.every * (0.8 + 0.4 * R());
      st.k++;
      painter.draw(x, w, h, st);
      tex.needsUpdate = true;
      return true;
    },
    dispose() { tex.dispose(); },
  };
}

function frame(x, w, h, title, right) {
  x.fillStyle = BG; x.fillRect(0, 0, w, h);
  x.strokeStyle = GRID; x.lineWidth = 1;
  for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, h); x.stroke(); }
  for (let j = 0; j < h; j += 32) { x.beginPath(); x.moveTo(0, j + 0.5); x.lineTo(w, j + 0.5); x.stroke(); }
  x.fillStyle = 'rgba(134,179,191,0.12)'; x.fillRect(0, 0, w, 26);
  x.font = `12px ${MONO}`; x.textBaseline = 'middle';
  x.fillStyle = INK; x.fillText(title, 10, 13);
  if (right) { x.fillStyle = DIM; x.textAlign = 'right'; x.fillText(right, w - 10, 13); x.textAlign = 'left'; }
}
const pad = (n, l = 2) => String(n).padStart(l, '0');
const clock = (t) => { const s = Math.floor(t) + 41 * 3600 + 17 * 60; return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };

const PAINT = {
  // a code editor: token bars that scroll slowly, a blinking caret
  code: {
    every: 1.1,
    init(st) { for (let i = 0; i < 40; i++) st.lines.push(codeLine(st.R)); },
    draw(x, w, h, st) {
      frame(x, w, h, 'api/views.py', 'UTF-8  ·  PY');
      if (st.k % 3 === 0) { st.lines.shift(); st.lines.push(codeLine(st.R)); }
      const lh = 17;
      for (let i = 0; i < Math.floor((h - 34) / lh); i++) {
        const y = 36 + i * lh, L = st.lines[i];
        x.fillStyle = DIM; x.font = `11px ${MONO}`; x.fillText(String(120 + ((st.k / 3) | 0) + i).padStart(4), 6, y + 6);
        let cx = 48 + L.indent * 18;
        for (const [len, col] of L.tok) { x.fillStyle = col; x.globalAlpha = 0.85; x.fillRect(cx, y + 2, len, 7); cx += len + 7; }
        x.globalAlpha = 1;
      }
      if (st.k % 2) { x.fillStyle = INK; x.fillRect(48 + 18 * 2, 36 + 9 * lh, 2, 12); }
    },
  },
  // request log / terminal
  term: {
    every: 0.7,
    draw(x, w, h, st) {
      frame(x, w, h, 'server.log', clock(st.t));
      const paths = ['/api/v1/records', '/api/v1/courses', '/api/v1/lessons/12', '/api/v1/auth/token', '/api/v1/reviews', '/health'];
      const meth = ['GET', 'GET', 'POST', 'GET', 'PATCH', 'GET'];
      if (!st.lines.length || st.R() < 0.75) {
        const i = Math.floor(st.R() * paths.length), code = st.R() < 0.06 ? 404 : st.R() < 0.12 ? 201 : 200;
        st.lines.push({ s: `${clock(st.t)}  ${meth[i].padEnd(5)} ${paths[i].padEnd(20)} ${code}  ${(4 + st.R() * 40) | 0}ms`, code });
        if (st.lines.length > 30) st.lines.shift();
      }
      x.font = `12px ${MONO}`;
      const n = Math.floor((h - 36) / 17), L = st.lines.slice(-n);
      L.forEach((l, i) => { x.fillStyle = l.code === 404 ? AMBER : i === L.length - 1 ? INK : DIM; x.fillText(l.s, 10, 44 + i * 17); });
    },
  },
  // a database table view
  db: {
    every: 1.6,
    draw(x, w, h, st) {
      frame(x, w, h, 'postgres · records', `${(1200 + st.k * 3)} rows`);
      const cols = [10, 70, 210, 330], hdr = ['id', 'sample', 'site', 'status'];
      x.font = `11px ${MONO}`; x.fillStyle = CYAN; hdr.forEach((s, i) => x.fillText(s, cols[i], 44));
      const sel = st.k % 12;
      for (let r = 0; r < 12; r++) {
        const y = 62 + r * 18;
        if (r === sel) { x.fillStyle = 'rgba(134,179,191,0.14)'; x.fillRect(4, y - 9, w - 8, 18); }
        x.fillStyle = r === sel ? INK : DIM;
        x.fillText(String(1180 + r + st.k), cols[0], y); x.fillText(`S-${(r * 37 + 11) % 97}`, cols[1], y);
        x.fillText(['ARES-3', 'NORTH', 'CRATER', 'RIDGE'][r % 4], cols[2], y); x.fillText(r % 5 === 2 ? 'queued' : 'stored', cols[3], y);
      }
    },
  },
  // the analysis wall: clustered scatter, a training curve and a small bar chart
  analysis: {
    every: 0.5,
    init(st) {
      const C = [[0.28, 0.35], [0.62, 0.62], [0.42, 0.75], [0.75, 0.3]];
      for (let i = 0; i < 140; i++) { const c = C[i % 4], a = st.R() * 6.28, r = Math.sqrt(st.R()) * 0.11; st.pts.push({ c: i % 4, x: c[0] + Math.cos(a) * r, y: c[1] + Math.sin(a) * r, p: st.R() * 6.28 }); }
    },
    draw(x, w, h, st) {
      frame(x, w, h, 'ANALYSIS  ·  EMBEDDING CLUSTERS  ·  MODEL TRAINING', clock(st.t));
      const cols = [CYAN, AMBER, OK, '#b7a7c9'];
      // scatter
      const sx = 16, sy = 40, sw = w * 0.5, sh = h - 56;
      x.strokeStyle = 'rgba(207,214,212,0.25)'; x.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
      for (const p of st.pts) {
        const px = sx + (p.x + Math.sin(st.t * 0.3 + p.p) * 0.006) * sw, py = sy + (p.y + Math.cos(st.t * 0.25 + p.p) * 0.006) * sh;
        x.fillStyle = cols[p.c]; x.globalAlpha = 0.8; x.fillRect(px - 2, py - 2, 4, 4);
      }
      x.globalAlpha = 1;
      // training curve, drawn out to the current epoch, then a new run begins
      const cx = sx + sw + 24, cw = w - cx - 16, ch = (h - 64) * 0.55, cy = 40;
      x.strokeStyle = 'rgba(207,214,212,0.25)'; x.strokeRect(cx + 0.5, cy + 0.5, cw, ch);
      const ep = st.k % 120, run = Math.floor(st.k / 120);
      x.beginPath(); x.strokeStyle = CYAN; x.lineWidth = 2;
      for (let i = 0; i <= ep; i++) { const v = 0.15 + 0.75 * Math.exp(-i / 28) + 0.03 * Math.sin(i * 1.7 + run); const px = cx + (i / 120) * cw, py = cy + ch - v * ch; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke(); x.lineWidth = 1;
      x.font = `12px ${MONO}`; x.fillStyle = INK;
      x.fillText(`run ${pad(run + 7)}   epoch ${pad(ep, 3)}/120   loss ${(0.15 + 0.75 * Math.exp(-ep / 28)).toFixed(3)}`, cx, cy + ch + 18);
      // bars
      const by = cy + ch + 34, bh = h - by - 14;
      for (let i = 0; i < 8; i++) { const v = 0.35 + 0.5 * Math.abs(Math.sin(i * 1.3 + st.k * 0.04)); x.fillStyle = i === st.k % 8 ? AMBER : 'rgba(134,179,191,0.6)'; x.fillRect(cx + i * (cw / 8) + 3, by + bh * (1 - v), cw / 8 - 8, bh * v); }
    },
  },
  // operations wall: deployment pipeline, commit history, service status
  ops: {
    every: 0.9,
    draw(x, w, h, st) {
      frame(x, w, h, 'OPERATIONS  ·  DEPLOYMENT PIPELINE', clock(st.t));
      const stages = ['COMMIT', 'TEST', 'BUILD', 'DEPLOY'], cyc = st.k % 24, active = Math.min(3, Math.floor(cyc / 5));
      const bw = (w - 60) / 4;
      stages.forEach((s, i) => {
        const bx = 16 + i * (bw + 10), by = 44;
        const done = i < active || cyc >= 20, run = i === active && cyc < 20;
        x.strokeStyle = done ? OK : run ? AMBER : 'rgba(207,214,212,0.3)'; x.lineWidth = 2; x.strokeRect(bx, by, bw, 46); x.lineWidth = 1;
        x.font = `12px ${MONO}`; x.fillStyle = done ? OK : run ? AMBER : DIM; x.fillText(s, bx + 10, by + 17);
        x.fillStyle = DIM; x.fillText(done ? 'passed' : run ? (st.k % 2 ? 'running .' : 'running ..') : 'waiting', bx + 10, by + 34);
      });
      // commit graph
      x.strokeStyle = CYAN; x.lineWidth = 2; x.beginPath(); x.moveTo(30, 112); x.lineTo(30, h - 16); x.stroke(); x.lineWidth = 1;
      const msgs = ['update api serializers', 'fix lesson progress query', 'add review endpoint', 'tune search index', 'refactor data loaders', 'bump dependencies', 'docs: readme'];
      for (let i = 0; i < 7; i++) {
        const y = 122 + i * 22; if (y > h - 12) break;
        x.fillStyle = i === 0 ? AMBER : CYAN; x.beginPath(); x.arc(30, y, 4, 0, 6.29); x.fill();
        x.font = `11px ${MONO}`; x.fillStyle = i === 0 ? INK : DIM;
        x.fillText(`${((st.k * 7 + i * 13) % 4096).toString(16).padStart(3, '0')}a${i}f  ${msgs[(i + Math.floor(st.k / 24)) % msgs.length]}`, 44, y + 4);
      }
      x.fillStyle = OK; x.fillText('services nominal', w - 150, h - 14);
    },
  },
  // habitat telemetry for the smaller facility screens
  telemetry: {
    every: 1.5,
    draw(x, w, h, st) {
      frame(x, w, h, 'HAB TELEMETRY', `SOL ${pad(31 + (st.k / 400 | 0), 3)}`);
      const rows = [['PRESSURE', (101.2 + Math.sin(st.k * 0.3) * 0.2).toFixed(1) + ' kPa'], ['O2', (20.9 + Math.sin(st.k * 0.2) * 0.1).toFixed(1) + ' %'], ['CO2 SCRUB', 'NOMINAL'], ['INT TEMP', (21.4 + Math.sin(st.k * 0.17) * 0.3).toFixed(1) + ' C'], ['EXT TEMP', (-58 + Math.sin(st.k * 0.05) * 4).toFixed(0) + ' C'], ['DUST', st.k % 9 === 0 ? 'ELEVATED' : 'LOW']];
      x.font = `13px ${MONO}`;
      rows.forEach(([k, v], i) => { const y = 50 + i * ((h - 60) / rows.length); x.fillStyle = DIM; x.fillText(k, 12, y); x.fillStyle = v === 'ELEVATED' ? AMBER : INK; x.textAlign = 'right'; x.fillText(v, w - 12, y); x.textAlign = 'left'; });
    },
  },
};

function codeLine(R) {
  const cols = ['#86b3bf', '#cfd6d4', '#d39a5f', '#8fb59a', '#9aa7ad'];
  const n = 1 + Math.floor(R() * 5), tok = [];
  for (let i = 0; i < n; i++) tok.push([12 + Math.floor(R() * 60), cols[Math.floor(R() * cols.length)]]);
  return { indent: Math.floor(R() * 4), tok };
}
