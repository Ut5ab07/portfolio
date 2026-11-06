// Pointer parallax (CSS vars --px/--py on the root) + the three restrained 2D project motifs.
// One rAF loop, active only while the section is on screen.
function hs(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
var INK = '200,206,212', RED = '192,40,45';
function lab(g, s, x, y, a) { g.font = '9px ui-monospace,Menlo,Consolas,monospace'; g.fillStyle = 'rgba(' + INK + ',' + (a || 0.45) + ')'; g.fillText(s, x, y); }
var M = {};
// 01 — player similarity: tactical pitch, connected nodes, a query player and its nearest neighbours
M.scout = function (g, w, h, t, st) {
  if (!st.n) { st.n = []; for (var i = 0; i < 16; i++) st.n.push([0.08 + 0.84 * hs(i), 0.12 + 0.76 * hs(i + 50)]);
    st.nb = st.n.map(function (p, i) { return st.n.map(function (q, j) { return [j, (p[0] - q[0]) * (p[0] - q[0]) * 1.6 + (p[1] - q[1]) * (p[1] - q[1])]; }).filter(function (o) { return o[0] !== i; }).sort(function (a, b) { return a[1] - b[1]; }).map(function (o) { return o[0]; }); }); }
  g.clearRect(0, 0, w, h); var P = 12, pw = w - 2 * P, ph = h - 2 * P;
  g.strokeStyle = 'rgba(' + INK + ',.13)'; g.lineWidth = 1; g.strokeRect(P, P, pw, ph); g.beginPath(); g.moveTo(w / 2, P); g.lineTo(w / 2, h - P); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, ph * 0.16, 0, 6.283); g.stroke(); g.strokeRect(P, h / 2 - ph * 0.24, pw * 0.15, ph * 0.48); g.strokeRect(w - P - pw * 0.15, h / 2 - ph * 0.24, pw * 0.15, ph * 0.48);
  var n = st.n, q = Math.floor(t / 4) % n.length;
  var X = function (i) { return P + pw * (n[i][0] + Math.sin(t * 0.5 + i) * 0.006); }, Y = function (i) { return P + ph * (n[i][1] + Math.cos(t * 0.43 + i * 1.7) * 0.008); };
  g.strokeStyle = 'rgba(' + INK + ',.16)';
  for (var i = 0; i < n.length; i++) for (var k = 0; k < 2; k++) { var j = st.nb[i][k]; g.beginPath(); g.moveTo(X(i), Y(i)); g.lineTo(X(j), Y(j)); g.stroke(); }
  var f = cl((t % 4) / 0.8, 0, 1), sim = st.nb[q].slice(0, 3);
  g.strokeStyle = 'rgba(' + RED + ',' + 0.75 * f + ')'; g.setLineDash([4, 4]); for (var s = 0; s < 3; s++) { g.beginPath(); g.moveTo(X(q), Y(q)); g.lineTo(X(sim[s]), Y(sim[s])); g.stroke(); } g.setLineDash([]);
  for (var i = 0; i < n.length; i++) { g.beginPath(); g.arc(X(i), Y(i), i === q ? 3.4 : 2.4, 0, 6.283); g.fillStyle = i === q ? 'rgb(' + RED + ')' : 'rgba(' + INK + ',.7)'; g.fill(); }
  g.strokeStyle = 'rgba(' + RED + ',.8)'; g.beginPath(); g.arc(X(q), Y(q), 7 + Math.sin(t * 3) * 1.2, 0, 6.283); g.stroke();
  g.strokeStyle = 'rgba(' + INK + ',' + 0.75 * f + ')'; sim.forEach(function (i) { g.beginPath(); g.arc(X(i), Y(i), 6, 0, 6.283); g.stroke(); });
  lab(g, 'PLAYER SIMILARITY', P + 6, h - P - 6);
};
// 02 — analysis sequence: table scan (EDA) → bars (visualize) → fit + extrapolation (model) → text lines (LLM)
M.agent = function (g, w, h, t) {
  g.clearRect(0, 0, w, h); var T = 11, ph = (t % T) / T, s = Math.min(3, Math.floor(ph * 4)), sp = (ph * 4) % 1, P = 14, cw = (w - 2 * P) / 3, top = P + 4, bot = h - 40, rows = 9, rh = (bot - top) / rows;
  for (var r = 0; r < rows; r++) { var act = s === 0 && Math.floor(sp * rows) === r; for (var c = 0; c < 3; c++) { g.fillStyle = 'rgba(' + INK + ',' + (act ? 0.8 : (s === 0 ? 0.3 : 0.14)) + ')'; g.fillRect(P + c * cw * 0.26, top + r * rh + 2, (cw * 0.24 - 4) * (0.35 + 0.65 * hs(r * 3 + c)), Math.max(2, rh - 8)); } }
  if (s === 0) { g.fillStyle = 'rgba(' + RED + ',.85)'; g.fillRect(P - 4, top + Math.floor(sp * rows) * rh, 2, rh); }
  var x1 = P + cw, bw = cw / 9, gr = s === 0 ? 0 : (s === 1 ? cl(sp * 1.4, 0, 1) : 1);
  g.fillStyle = 'rgba(' + INK + ',.5)'; for (var i = 0; i < 6; i++) { var bh = hs(i + 20) * (bot - top) * 0.85 * gr; g.fillRect(x1 + i * bw * 1.4, bot - bh, bw, bh); }
  g.fillStyle = 'rgba(' + INK + ',.25)'; g.fillRect(x1, bot, cw * 0.95, 1);
  var x2 = P + 2 * cw, cp = s < 2 ? 0 : (s === 2 ? sp : 1), W2 = cw * 0.92, H2 = bot - top, ly = function (u) { return bot - H2 * (0.15 + 0.6 * u); };
  for (var i = 0; i < 12; i++) { var u = i / 11 * 0.75; g.beginPath(); g.arc(x2 + u * W2, bot - H2 * (0.15 + 0.6 * u + (hs(i + 40) - 0.5) * 0.25), 2, 0, 6.283); g.fillStyle = 'rgba(' + INK + ',' + (s >= 2 ? 0.6 : 0.2) + ')'; g.fill(); }
  g.fillStyle = 'rgba(' + INK + ',.25)'; g.fillRect(x2, bot, W2, 1);
  if (cp > 0) { g.strokeStyle = 'rgba(' + INK + ',.9)'; g.beginPath(); g.moveTo(x2, ly(0)); g.lineTo(x2 + 0.75 * cp * W2, ly(0.75 * cp)); g.stroke();
    g.strokeStyle = 'rgba(' + RED + ',' + cp + ')'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x2 + 0.75 * W2, ly(0.75)); g.lineTo(x2 + 0.75 * W2 + 0.25 * W2 * cp, ly(0.75 + 0.25 * cp)); g.stroke(); g.setLineDash([]); }
  var tl = s === 3 ? cl(sp * 1.3, 0, 1) : (ph < 0.02 ? 0 : (s === 3 ? 1 : 0)); g.fillStyle = 'rgba(' + INK + ',.45)'; g.fillRect(P, bot + 10, (w - 2 * P) * 0.9 * tl, 2); g.fillRect(P, bot + 17, (w - 2 * P) * 0.58 * tl, 2);
  var nm = ['EDA', 'VISUALIZE', 'MODEL', 'LLM']; for (var i = 0; i < 4; i++) lab(g, nm[i], P + i * cw, h - 7, i === s ? 0.95 : 0.3); g.fillStyle = 'rgb(' + RED + ')'; g.fillRect(P + s * cw, h - 20, 10, 1.5);
};
// 03 — a typed query connects to its neighbourhood in an embedding space
M.semantic = function (g, w, h, t, st) {
  if (!st.p) { var cs = [[0.45, 0.3], [0.78, 0.28], [0.6, 0.72], [0.9, 0.68]]; st.cs = cs; st.p = []; for (var i = 0; i < 44; i++) { var c0 = cs[i % 4]; st.p.push([c0[0] + (hs(i + 7) - 0.5) * 0.2, c0[1] + (hs(i + 90) - 0.5) * 0.3]); }
    st.near = cs.map(function (c1) { return st.p.map(function (p, i) { return [i, (p[0] - c1[0] - 0.02) * (p[0] - c1[0] - 0.02) + (p[1] - c1[1] + 0.03) * (p[1] - c1[1] + 0.03)]; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, 5).map(function (o) { return o[0]; }); }); }
  g.clearRect(0, 0, w, h); var T = 6, ph = (t % T) / T, qi = Math.floor(t / T) % 4, P = 14, c = st.cs[qi];
  var X = function (u, i) { return P + (w - 2 * P) * (u + Math.sin(t * 0.4 + i) * 0.004); }, Y = function (v, i) { return P + (h - 2 * P) * (v + Math.cos(t * 0.37 + i) * 0.005); };
  var bx = P + 4, by = h * 0.5 - 10, bw = Math.min(w * 0.22, 120), ty = cl(ph / 0.3, 0, 1), tw = (bw - 14) * ty * (0.55 + 0.45 * hs(qi + 3));
  g.strokeStyle = 'rgba(' + INK + ',.4)'; g.lineWidth = 1; g.strokeRect(bx, by, bw, 20); g.fillStyle = 'rgba(' + INK + ',.6)'; g.fillRect(bx + 6, by + 8, tw, 3); if (ty < 1 || Math.floor(t * 2) % 2 === 0) g.fillRect(bx + 8 + tw, by + 5, 1, 10);
  var qx = X(c[0] + 0.02, 99), qy = Y(c[1] - 0.03, 99), lf = cl((ph - 0.3) / 0.15, 0, 1), hl = cl((ph - 0.45) / 0.2, 0, 1), nr = st.near[qi];
  for (var i = 0; i < st.p.length; i++) { g.beginPath(); g.arc(X(st.p[i][0], i), Y(st.p[i][1], i), 2, 0, 6.283); g.fillStyle = 'rgba(' + INK + ',.5)'; g.fill(); }
  if (lf > 0) { g.strokeStyle = 'rgba(' + INK + ',.35)'; g.beginPath(); g.moveTo(bx + bw, by + 10); g.lineTo(bx + bw + (qx - bx - bw) * lf, by + 10 + (qy - by - 10) * lf); g.stroke(); }
  if (hl > 0) { nr.forEach(function (i) { var px = X(st.p[i][0], i), py = Y(st.p[i][1], i); g.strokeStyle = 'rgba(' + RED + ',' + 0.7 * hl + ')'; g.beginPath(); g.moveTo(qx, qy); g.lineTo(px, py); g.stroke(); g.strokeStyle = 'rgba(' + INK + ',' + 0.8 * hl + ')'; g.beginPath(); g.arc(px, py, 5, 0, 6.283); g.stroke(); }); }
  if (lf > 0) { var rr = (t * 14) % 28; g.strokeStyle = 'rgba(' + RED + ',' + 0.5 * (1 - rr / 28) * lf + ')'; g.beginPath(); g.arc(qx, qy, rr, 0, 6.283); g.stroke(); g.beginPath(); g.arc(qx, qy, 3.2, 0, 6.283); g.fillStyle = 'rgba(' + RED + ',' + lf + ')'; g.fill(); }
  lab(g, 'QUERY \u2192 EMBEDDING SPACE', P + 4, h - P);
};
// 04 — users and movies as a bipartite graph: a user's liked films lead to a like-minded viewer, whose other film is recommended
M.graph = function (g, w, h, t, st) {
  if (!st.e) { st.e = []; for (var u = 0; u < 6; u++) for (var m = 0; m < 8; m++) if (hs(u * 13 + m * 7 + 3) < 0.34) st.e.push([u, m]); }
  g.clearRect(0, 0, w, h); var P = 16, T = 5, ph = (t % T) / T, q = Math.floor(t / T) % 6, top = P + 6, bot = h - 30;
  var UX = P + (w - 2 * P) * 0.22, MX = P + (w - 2 * P) * 0.78, uy = function (i) { return top + (bot - top) * (i + 0.5) / 6 + Math.sin(t * 0.5 + i) * 1.2; }, my = function (i) { return top + (bot - top) * (i + 0.5) / 8 + Math.cos(t * 0.45 + i) * 1.2; };
  var liked = st.e.filter(function (e) { return e[0] === q; }).map(function (e) { return e[1]; }), best = -1, bs = 0;
  for (var u2 = 0; u2 < 6; u2++) { if (u2 === q) continue; var sh = st.e.filter(function (e) { return e[0] === u2 && liked.indexOf(e[1]) >= 0; }).length; if (sh > bs) { bs = sh; best = u2; } }
  var rec = best < 0 ? [] : st.e.filter(function (e) { return e[0] === best && liked.indexOf(e[1]) < 0; }).map(function (e) { return e[1]; }).slice(0, 1);
  var a1 = cl(ph / 0.3, 0, 1), a2 = cl((ph - 0.35) / 0.25, 0, 1), a3 = cl((ph - 0.65) / 0.2, 0, 1); g.lineWidth = 1;
  st.e.forEach(function (e) { var hot = e[0] === q || (e[0] === best && liked.indexOf(e[1]) >= 0); g.strokeStyle = 'rgba(' + INK + ',' + (hot ? 0.12 + 0.5 * (e[0] === q ? a1 : a2) : 0.12) + ')'; g.beginPath(); g.moveTo(UX, uy(e[0])); g.lineTo(MX, my(e[1])); g.stroke(); });
  if (a3 > 0) rec.forEach(function (m) { g.strokeStyle = 'rgba(' + RED + ',' + 0.8 * a3 + ')'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(UX, uy(q)); g.lineTo(MX, my(m)); g.stroke(); g.setLineDash([]); g.beginPath(); g.arc(MX, my(m), 7, 0, 6.283); g.stroke(); });
  for (var i = 0; i < 6; i++) { g.beginPath(); g.arc(UX, uy(i), i === q ? 3.4 : 2.6, 0, 6.283); g.fillStyle = i === q ? 'rgb(' + RED + ')' : 'rgba(' + INK + ',' + (i === best ? 0.4 + 0.5 * a2 : 0.55) + ')'; g.fill(); }
  if (best >= 0 && a2 > 0) { g.strokeStyle = 'rgba(' + INK + ',' + 0.8 * a2 + ')'; g.beginPath(); g.arc(UX, uy(best), 6, 0, 6.283); g.stroke(); }
  for (var j = 0; j < 8; j++) { g.fillStyle = 'rgba(' + INK + ',' + (liked.indexOf(j) >= 0 ? 0.35 + 0.5 * a1 : 0.45) + ')'; g.fillRect(MX - 2.5, my(j) - 2.5, 5, 5); }
  g.strokeStyle = 'rgba(' + RED + ',.8)'; g.beginPath(); g.arc(UX, uy(q), 7 + Math.sin(t * 3) * 1.2, 0, 6.283); g.stroke();
  lab(g, 'USERS', UX - 14, h - 12); lab(g, 'MOVIES', MX - 16, h - 12);
};
// 05 — requests travel client → API → database and back, one endpoint at a time
M.api = function (g, w, h, t) {
  g.clearRect(0, 0, w, h); var P = 16, T = 2.6, ph = (t % T) / T, k = Math.floor(t / T) % 5, top = P + 4, bot = h - 34, cw = (w - 2 * P) / 3;
  var ep = ['POST /auth/token', 'GET /courses?search=', 'POST /enrollments', 'PATCH /progress', 'POST /reviews'], nm = ['CLIENT', 'API', 'DATABASE'];
  g.lineWidth = 1;
  for (var c = 0; c < 3; c++) { var x = P + c * cw + cw * 0.18, bw = cw * 0.64; g.strokeStyle = 'rgba(' + INK + ',' + (c === 1 ? 0.4 : 0.22) + ')'; g.strokeRect(x, top, bw, bot - top); lab(g, nm[c], x, h - 12, c === 1 ? 0.7 : 0.4);
    for (var r = 0; r < 4; r++) { g.fillStyle = 'rgba(' + INK + ',.12)'; g.fillRect(x + 8, top + 12 + r * 12, (bw - 16) * (0.4 + 0.5 * hs(c * 9 + r)), 2); } }
  var cx = function (c) { return P + c * cw + cw * 0.5; }, mid = top + (bot - top) * 0.62, go = ph < 0.5, f = go ? ph / 0.5 : (ph - 0.5) / 0.5, x0 = go ? cx(0) + (cx(2) - cx(0)) * f : cx(2) - (cx(2) - cx(0)) * f;
  g.strokeStyle = 'rgba(' + INK + ',.18)'; g.beginPath(); g.moveTo(cx(0), mid - 6); g.lineTo(cx(2), mid - 6); g.moveTo(cx(0), mid + 6); g.lineTo(cx(2), mid + 6); g.stroke();
  g.fillStyle = go ? 'rgba(' + INK + ',.9)' : 'rgb(' + RED + ')'; g.fillRect(x0 - 4, mid + (go ? -6 : 6) - 2, 8, 4);
  var lit = Math.abs(x0 - cx(1)) < cw * 0.3; if (lit) { g.strokeStyle = 'rgba(' + RED + ',.7)'; g.strokeRect(P + cw + cw * 0.18 - 3, top - 3, cw * 0.64 + 6, bot - top + 6); }
  lab(g, ep[k], P + cw * 0.18 + 8, top + 64, 0.8); lab(g, go ? 'REQUEST →' : '← 200 OK', cx(1) - 24, mid - 14, 0.6);
};

// placeholder subject: idle grid with a slow scan line
M.idle = function (g, w, h, t) { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(' + INK + ',.07)'; g.lineWidth = 1;
  for (var x = 0; x <= w; x += w / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (var y = 0; y <= h; y += h / 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = 'rgba(' + RED + ',.55)'; g.fillRect(0, ((t * 0.12) % 1) * h, w, 1); lab(g, 'AWAITING SUBJECT DATA', 14, h - 12); };

function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function validUrl(u) { if (typeof u !== 'string') return false; try { var x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { return false; } }

// Project details dialog: built once inside the section root (so scoped CSS applies), filled per project.
function initProjectModal(root, projects) {
  var modal = el('div', 'px-modal'), dlg = el('div', 'px-dialog'), closeBtn = el('button', 'px-close', 'Close \u2715'), body = el('div', 'px-mbody');
  var opener = null, isOpen = false, downOut = false, prev = {};
  modal.setAttribute('aria-hidden', 'true'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.tabIndex = -1;
  closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close project details');
  dlg.appendChild(closeBtn); dlg.appendChild(body); modal.appendChild(dlg); root.appendChild(modal);
  function sec(label, c) {
    if (!c || (Array.isArray(c) && !c.length)) return null;                     // not provided: leave the block out of the public page
    var s = el('section', 'px-msec'); s.appendChild(el('h4', null, label));
    if (Array.isArray(c)) { var u = el('ul'); c.forEach(function (x) { u.appendChild(el('li', null, x)); }); s.appendChild(u); }
    else s.appendChild(el('p', null, c));
    return s;
  }
  function fill(p) {
    body.textContent = ''; var top = el('div', 'px-top'); top.appendChild(el('span', null, 'SUBJECT'));
    var st = el('span', 'px-st'); st.appendChild(el('i')); st.appendChild(document.createTextNode(p.st || 'OBSERVING')); top.appendChild(st); body.appendChild(top);
    body.appendChild(el('h3', 'px-mtitle', p.title)); body.appendChild(el('p', 'px-lead', p.desc));
    var g = el('div', 'px-mgrid');
    [sec('Problem addressed', p.problem), sec('Purpose', p.purpose), sec('Key features', p.features),
      sec('Workflow', p.workflow), sec('Technologies', p.tech), sec('Role / contribution', p.role)].forEach(function (s) { if (s) g.appendChild(s); });
    if (g.childNodes.length) body.appendChild(g);
    var ls = [[p.href, 'GitHub'], [p.demo, 'Live demo']].filter(function (l) { return validUrl(l[0]); });
    if (ls.length) { var d = el('div', 'px-links'); ls.forEach(function (l) { var a = el('a', null, l[1]); a.href = l[0]; a.target = '_blank'; a.rel = 'noopener noreferrer'; d.appendChild(a); }); body.appendChild(d); }
    dlg.setAttribute('aria-label', p.title + ' \u2014 project details');
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = [].slice.call(dlg.querySelectorAll('button,a[href]')), first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!dlg.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function lock(on) {
    var b = document.body, h = document.documentElement;
    if (on) { var sw = window.innerWidth - h.clientWidth; prev = { bo: b.style.overflow, bp: b.style.paddingRight, ho: h.style.overflow }; b.style.overflow = 'hidden'; h.style.overflow = 'hidden'; if (sw > 0) b.style.paddingRight = sw + 'px'; }
    else { b.style.overflow = prev.bo || ''; b.style.paddingRight = prev.bp || ''; h.style.overflow = prev.ho || ''; }
  }
  function open(i, from) {
    var p = projects[i]; if (!p || isOpen) return; fill(p); opener = from || null; isOpen = true;
    modal.classList.add('px-on'); root.classList.add('px-open'); modal.setAttribute('aria-hidden', 'false'); dlg.scrollTop = 0; lock(true);
    document.addEventListener('keydown', onKey); closeBtn.focus({ preventScroll: true });
  }
  function close(noFocus) {
    if (!isOpen) return; isOpen = false; modal.classList.remove('px-on'); root.classList.remove('px-open'); modal.setAttribute('aria-hidden', 'true'); lock(false);
    document.removeEventListener('keydown', onKey); if (!noFocus && opener && opener.focus) opener.focus({ preventScroll: true });
  }
  function onClick(e) { if (modal.contains(e.target)) return; var p = e.target.closest ? e.target.closest('.px-panel') : null; if (p) open(+p.getAttribute('data-i'), p); }
  function onPanelKey(e) { var t = e.target; if (t && t.classList && t.classList.contains('px-panel') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+t.getAttribute('data-i'), t); } }
  function onTouch(e) { if (!dlg.contains(e.target)) e.preventDefault(); }
  closeBtn.addEventListener('click', function () { close(); });
  modal.addEventListener('pointerdown', function (e) { downOut = !dlg.contains(e.target); });
  modal.addEventListener('click', function (e) { if (downOut && !dlg.contains(e.target)) close(); downOut = false; });
  modal.addEventListener('touchmove', onTouch, { passive: false });
  root.addEventListener('click', onClick); root.addEventListener('keydown', onPanelKey);
  return { open: open, close: close, destroy: function () { close(true); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onPanelKey); if (modal.parentNode) modal.parentNode.removeChild(modal); } };
}

export function initProjectsEffects(root, projects) {
  var motifs = [].slice.call(root.querySelectorAll('canvas[data-motif]')).map(function (c) { return { c: c, g: c.getContext('2d'), fn: M[c.getAttribute('data-motif')], w: 0, h: 0, st: {} }; });
  var modal = projects ? initProjectModal(root, projects) : null;
  var vis = false, raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
  // Per frame this only draws: canvas sizes come from a ResizeObserver (no layout read per frame), the parallax variables are
  // written only when their value changes (each write restyles the section), and motifs scrolled out of view are skipped.
  function fit(m) { var d = Math.min(window.devicePixelRatio || 1, 2), w = m.cw, h = m.ch; if (w && (m.w !== w || m.h !== h)) { m.c.width = w * d; m.c.height = h * d; m.g.setTransform(d, 0, 0, d, 0, 0); m.w = w; m.h = h; } }
  var lastPx = '', lastPy = '';
  function tick(ms) { raf = requestAnimationFrame(tick); cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
    var spx = cx.toFixed(3), spy = cy.toFixed(3);
    if (spx !== lastPx) { lastPx = spx; root.style.setProperty('--px', spx); }
    if (spy !== lastPy) { lastPy = spy; root.style.setProperty('--py', spy); }
    var t = ms / 1000; motifs.forEach(function (m) { if (!m.on) return; fit(m); if (m.w && m.fn) m.fn(m.g, m.w, m.h, t, m.st); }); }
  var mro = new ResizeObserver(function (es) { es.forEach(function (e) { var m = motifs[+e.target.dataset.mi]; if (m) { m.cw = e.target.clientWidth; m.ch = e.target.clientHeight; } }); });
  var mio = new IntersectionObserver(function (es) { es.forEach(function (e) { var m = motifs[+e.target.dataset.mi]; if (m) m.on = e.isIntersecting; }); });
  motifs.forEach(function (m, i) { m.c.dataset.mi = i; m.cw = m.c.clientWidth; m.ch = m.c.clientHeight; m.on = true; mro.observe(m.c); mio.observe(m.c); });
  var io = new IntersectionObserver(function (e) { var v = e[0].isIntersecting; if (v && !vis) { vis = true; raf = requestAnimationFrame(tick); } else if (!v && vis) { vis = false; cancelAnimationFrame(raf); } }, { rootMargin: '-1px 0px' });   // edge-adjacent != visible
  io.observe(root);
  function mv(e) { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }
  window.addEventListener('pointermove', mv);
  return function () { io.disconnect(); mro.disconnect(); mio.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('pointermove', mv); if (modal) modal.destroy(); };
}
