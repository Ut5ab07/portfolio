// DOM layer for the Contact section: scroll progress, stage text fades, contact links + copy-to-clipboard, keyboard access.
// Scrolling is native (the section is tall and its stage is sticky), so nothing here intercepts wheel/touch events.
import { gmailCompose } from './ContactConfig';
// the brand logos from simple-icons, kept here so that library stays out of the page's entry bundle (Stack loads its 19 logos on demand)
const GITHUB_PATH = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';
const LINKEDIN_PATH = 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';
const INSTAGRAM_PATH = 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077';
// Envelope glyph (Material Icons "mail", Apache-2.0) on the same 24-unit grid as the Simple Icons brand glyphs.
var MAIL_PATH = 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';
function svgIcon(d) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); p.setAttribute('d', d); s.appendChild(p); return s; }
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function sm(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
export function prefersReducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

// Extra viewport-heights of scroll during which the FINISHED composition stays pinned (full-viewport city + contact block) before the
// stage is released to the next content. Without it the sequence reached 100% on the very frame the stage began to leave.
export var HOLD = 0.25;
function sequenceSpan(root) { var r = root.getBoundingClientRect(); return { r: r, span: r.height - window.innerHeight * (1 + HOLD) }; }
// 0 at the top of the section, 1 once the final composition has settled (then held until the section ends). Reduced motion: always final.
export function sectionProgress(root) {
  if (prefersReducedMotion()) return 1;
  var q = sequenceSpan(root);
  return q.span > 0 ? clamp(-q.r.top / q.span, 0, 1) : 1;
}
var validEmail = function (e) { return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); };
var validUrl = function (u) { return typeof u === 'string' && /^https:\/\/[^\s]+\.[^\s]+$/.test(u); };
function instaHandle(u) { return u.replace(/^https:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, ''); }
function shortUrl(u) { return u.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''); }
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  try { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select();
    var ok = document.execCommand && document.execCommand('copy'); document.body.removeChild(ta); return !!ok; } catch (e) { return false; }
}

export function initContact(root, cfg, opts) {
  opts = opts || {}; cfg = cfg || {};
  var linksUl = root.querySelector('.ct-links'), note = root.querySelector('.ct-note'), skip = root.querySelector('.ct-skip'), fin = root.querySelector('.ct-final');
  linksUl.textContent = ''; var off = [], timer = 0, lastA = -1, lastC = -1, interactive = false;
  var calm = prefersReducedMotion(); root.classList.toggle('ct-calm', calm);
  function on(t, ev, fn, o) { t.addEventListener(ev, fn, o); off.push(function () { t.removeEventListener(ev, fn, o); }); }
  function say(msg) { note.textContent = msg; clearTimeout(timer); if (msg) timer = setTimeout(function () { note.textContent = ''; }, 2400); }
  // scroll the page to the end of the sequence (used by "Skip" and when a hidden control receives keyboard focus)
  function scrollToEnd() { var q = sequenceSpan(root), y = window.pageYOffset + q.r.top + Math.max(q.span, 0); window.scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' }); }
  // One row of icon links (email / GitHub / LinkedIn / Instagram) + the copy-email button. A missing or invalid value simply has no icon.
  function iconLink(href, label, tip, path, external) {
    var li = el('li'), a = el('a', 'ct-ico'); a.href = href; a.title = tip; a.setAttribute('aria-label', label);
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.appendChild(svgIcon(path)); li.appendChild(a); linksUl.appendChild(li);
  }
  if (validEmail(cfg.email)) iconLink(gmailCompose(cfg.email), 'Email ' + cfg.email + ' in Gmail (opens in a new tab)', 'Email \u2014 ' + cfg.email, MAIL_PATH, true);
  if (validUrl(cfg.github)) iconLink(cfg.github, 'GitHub: ' + shortUrl(cfg.github) + ' (opens in a new tab)', 'GitHub \u2014 ' + shortUrl(cfg.github), GITHUB_PATH, true);
  if (validUrl(cfg.linkedin)) iconLink(cfg.linkedin, 'LinkedIn: ' + shortUrl(cfg.linkedin) + ' (opens in a new tab)', 'LinkedIn \u2014 ' + shortUrl(cfg.linkedin), LINKEDIN_PATH, true);
  if (validUrl(cfg.instagram)) iconLink(cfg.instagram, 'Instagram: @' + instaHandle(cfg.instagram) + ' (opens in a new tab)', 'Instagram \u2014 @' + instaHandle(cfg.instagram), INSTAGRAM_PATH, true);
  if (validEmail(cfg.email)) {
    var cli = el('li', 'ct-cpli'), b = el('button', 'ct-copy', 'Copy email'); b.type = 'button'; b.setAttribute('aria-label', 'Copy email address ' + cfg.email); cli.appendChild(b); linksUl.appendChild(cli);
    on(b, 'click', function () { copyText(cfg.email).then(function (ok) { b.textContent = ok ? 'Copied' : 'Copy email'; say(ok ? 'Email address copied to clipboard.' : 'Copy failed \u2014 please select the address manually.'); setTimeout(function () { b.textContent = 'Copy email'; }, 1800); }); });
  }
  if (skip) on(skip, 'click', scrollToEnd);
  on(fin, 'focusin', function () { if (!interactive) scrollToEnd(); });             // keyboard users tabbing into the (still hidden) contact block jump to the end of the sequence
  var sceneAt = -1e9;
  function onProgress(ps) {
    sceneAt = performance.now();                                                   // called by the scene every frame (smoothed value)
    var a = 1 - sm(0.06, 0.2, ps), c = sm(0.8, 0.95, ps);
    if (Math.abs(a - lastA) > 0.003) { lastA = a; root.style.setProperty('--a', a.toFixed(3)); }
    if (Math.abs(c - lastC) > 0.003) { lastC = c; root.style.setProperty('--c', c.toFixed(3)); }
    var on2 = c > 0.35; if (on2 !== interactive) { interactive = on2; root.classList.toggle('ct-on', on2); }
  }
  function apply(ps) {                                                              // same as onProgress, but without claiming to be the scene
    var a = 1 - sm(0.06, 0.2, ps), c = sm(0.8, 0.95, ps);
    if (Math.abs(a - lastA) > 0.003) { lastA = a; root.style.setProperty('--a', a.toFixed(3)); }
    if (Math.abs(c - lastC) > 0.003) { lastC = c; root.style.setProperty('--c', c.toFixed(3)); }
    var on2 = c > 0.35; if (on2 !== interactive) { interactive = on2; root.classList.toggle('ct-on', on2); }
  }
  // If the scene is not running (WebGL unavailable / failed / not started yet) the text still follows the scroll position on its own.
  function onScrollOrResize() { if (performance.now() - sceneAt > 400) apply(sectionProgress(root)); }
  if (!calm) { on(window, 'scroll', onScrollOrResize, { passive: true }); on(window, 'resize', onScrollOrResize); }
  if (calm) apply(1); else apply(sectionProgress(root));
  return { onProgress: onProgress, sceneFailed: function () { sceneAt = -1e9; onScrollOrResize(); }, scrollToEnd: scrollToEnd, destroy: function () { clearTimeout(timer); off.forEach(function (f) { f(); }); off = []; linksUl.textContent = ''; root.classList.remove('ct-on', 'ct-calm'); } };
}
