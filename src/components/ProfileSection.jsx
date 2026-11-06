import { useEffect, useRef, useState } from 'react';
import { PROFILE, TABS } from './profile/profileData';
import { scrollToSection } from '../navigation/scrollToSection';
import { registerScene, whenNear } from '../navigation/sceneQueue';
import SceneLoader from './SceneLoader';
import './ProfileSection.css';

/**
 * Profile (02) — the Contact Zone. A fog-filled valley with a vast dark structure standing above it (three.js, lazy-loaded)
 * and a researcher's record: identification, introduction and a three-part dossier (About Me, Education, Technical Interests). On first entry a short verification
 * plays (~1.4 s); the content is in the DOM throughout and never waits for it.
 * Props: id (keep "profile"), className, profile (defaults to profileData.js), ui (false hides the interface).
 */
export default function ProfileSection({ id = 'profile', className = '', profile = PROFILE, ui = true }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const bracketRef = useRef(null);
  const rangeRef = useRef(null);
  const [tab, setTab] = useState(TABS[0].id);
  const tabRefs = useRef({});

  useEffect(() => {
    const root = rootRef.current;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene = null, dead = false, timer = 0, entered = false;
    if (!reduce) root.classList.add('pz-armed');                      // hide-until-entry states apply only with JS + motion

    const onFrame = (r) => {
      const b = bracketRef.current;
      if (!b) return;
      b.style.transform = `translate3d(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px, 0)`;
      b.style.width = `${r.w.toFixed(1)}px`; b.style.height = `${r.h.toFixed(1)}px`;
      if (rangeRef.current) rangeRef.current.textContent = (r.dist / 1000).toFixed(2);
    };
    const fail = (err) => { console.warn('ProfileSection: WebGL unavailable or failed', err); if (!dead) root.classList.add('pz-fallback'); q.ready(); };

    // prepared in the background after Home (loading queue), or at once when the visitor approaches; renders only on screen
    const q = registerScene('profile', { start: () => {
      import('./profile/ProfileScene').then(({ createProfileScene }) => {
        if (dead) return;
        try {
          scene = createProfileScene(canvasRef.current, { onReady: () => { if (!dead) { root.classList.add('pz-ready'); q.ready(); } }, onError: fail, onFrame });
          scene.setVisible(inView);
        } catch (err) { fail(err); }
      }).catch(fail);
    } });
    const near = whenNear(root, () => q.urgent());
    let inView = false;
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (scene) scene.setVisible(inView);
    }, { rootMargin: '-1px 0px' });
    io.observe(root);

    // the identification sequence, once, when the section's top has risen past ~65% of the viewport
    const enter = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || entered) return;
      entered = true; enter.disconnect();
      root.classList.add('pz-in');
      timer = window.setTimeout(() => root.classList.add('pz-ok'), reduce ? 0 : 1350);
    }, { rootMargin: '0px 0px -35% 0px' });
    enter.observe(root);

    return () => {
      dead = true; near(); io.disconnect(); q.unregister(); enter.disconnect(); window.clearTimeout(timer);
      if (scene) scene.dispose();
      root.classList.remove('pz-ready', 'pz-fallback', 'pz-armed', 'pz-in', 'pz-ok');
    };
  }, []);

  // tabs: arrow keys / Home / End move between them (WAI-ARIA tabs pattern)
  const onKey = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % TABS.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault();
    setTab(TABS[n].id);
    tabRefs.current[TABS[n].id]?.focus();
  };

  const toProjects = (e) => { e.preventDefault(); scrollToSection('projects'); };

  const p = profile;
  const panel = (k) => ({
    role: 'tabpanel', id: `${id}-panel-${k}`, 'aria-labelledby': `${id}-tab-${k}`,
    className: `pz-panel${tab === k ? ' pz-on' : ''}`, tabIndex: tab === k ? 0 : -1, inert: tab !== k, 'aria-hidden': tab !== k,
  });
  const initials = p.name.split(/\s+/).filter(Boolean).map((w) => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');

  return (
    <section ref={rootRef} id={id} className={`pz-root ${className}`.trim()} aria-labelledby={`${id}-name`}>
      <div className="pz-stage" aria-hidden="true">
        <canvas ref={canvasRef} className="pz-gl" />
        <div className="pz-shade" />
        <SceneLoader label="Acquiring contact zone" progress />
        {ui && (
          <>
            <div ref={bracketRef} className="pz-bracket">
              <i /><i /><i /><i />
              <span className="pz-bracket-label">OBJECT &nbsp;·&nbsp; RANGE <b ref={rangeRef}>2.60</b> KM &nbsp;·&nbsp; STATIONARY</span>
            </div>
            <div className="pz-readout">
              <span><em>SITE</em> CONTACT ZONE</span>
              <span><em>VISIBILITY</em> LOW · GROUND MIST</span>
              <span><em>OBJECT</em> SUSPENDED · NO EMISSION</span>
            </div>
          </>
        )}
      </div>

      {ui && (
        <div className="pz-content">
          <p className="pz-kicker">CONTACT ZONE <span className="pz-sep" /> RESEARCHER RECORD</p>
          {/* two columns on desktop: the record on the left, the portrait to the right of the structure; stacked on phones */}
          <div className="pz-layout">
          <div className="pz-main">
          <header className="pz-id">
            <div className="pz-card">
              <div className="pz-who">
                <p className="pz-status" aria-hidden="true">
                  <span className="pz-dot" />
                  <span className="pz-st-wait">VERIFYING RECORD <span className="pz-code">{p.record}</span></span>
                  <span className="pz-st-ok">RECORD VERIFIED <span className="pz-code">{p.record}</span></span>
                </p>
                <h2 id={`${id}-name`} className="pz-name">{p.name}</h2>
                <p className="pz-role">{p.role}</p>
                <dl className="pz-meta">
                  <div><dt>ORIGIN</dt><dd>{p.origin}</dd></div>
                  <div><dt>CURRENTLY IN</dt><dd>{p.based}</dd></div>
                </dl>
              </div>
            </div>
          </header>

          <p className="pz-intro">{p.intro}</p>

          <div className="pz-dossier">
            <div className="pz-tabs" role="tablist" aria-label="Profile dossier" onKeyDown={onKey}>
              {TABS.map((t) => (
                <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} type="button" role="tab" id={`${id}-tab-${t.id}`}
                  aria-selected={tab === t.id} aria-controls={`${id}-panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
                  className={`pz-tab${tab === t.id ? ' pz-on' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* All three panels are rendered and stacked in one grid cell, so the dossier is always as tall as its tallest panel:
                switching tabs never changes the section's height, never moves the page, and never exposes a neighbouring section.
                Inactive panels are invisible and inert (not focusable, hidden from assistive tech). */}
            <div className="pz-panels">
              <div {...panel('about')}>
                {p.about.map((t, i) => <p key={i}>{t}</p>)}
                <dl className="pz-facts">
                  <div><dt>Focus</dt><dd>Data science · Machine learning · Intelligent systems</dd></div>
                  <div><dt>Currently</dt><dd>{p.role} in {p.based}</dd></div>
                </dl>
              </div>
              <div {...panel('education')}>
                <dl className="pz-facts">
                  {p.education.map((r) => (
                    <div key={r.label}><dt>{r.label}</dt><dd>{r.value || <span className="pz-pending">To be added</span>}</dd></div>
                  ))}
                </dl>
              </div>
              <div {...panel('interests')}>
                <ul className="pz-list">
                  {p.interests.map((name) => <li key={name}><b>{name}</b></li>)}
                </ul>
              </div>
            </div>
          </div>

          <div className="pz-actions">
            <a className="pz-next" href="#projects" onClick={toProjects}>VIEW PROJECTS <span aria-hidden="true">→</span></a>
            <a className="pz-next pz-resume" href={`${import.meta.env.BASE_URL}${p.resume}`} download={p.resume}>DOWNLOAD RESUME <span aria-hidden="true">↓</span></a>
          </div>
          </div>
          <figure className={`pz-photo${p.photo ? ' pz-has-photo' : ''}`}>
            {p.photo
              ? <img src={p.photo} alt={`Portrait of ${p.name}`} width="469" height="586" loading="lazy" decoding="async" />
              : <div className="pz-photo-empty" role="img" aria-label="Portrait placeholder"><span>{initials}</span><small>PHOTO TO BE ADDED</small></div>}
            <span className="pz-scan" aria-hidden="true" />
            <i className="pz-corner" aria-hidden="true" /><i className="pz-corner" aria-hidden="true" /><i className="pz-corner" aria-hidden="true" /><i className="pz-corner" aria-hidden="true" />
          </figure>
          </div>
        </div>
      )}
    </section>
  );
}
