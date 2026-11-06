import { useEffect, useRef } from 'react';
import { PROJECTS } from './projects/projectsData';
import { registerScene, whenNear } from '../navigation/sceneQueue';
import SceneLoader from './SceneLoader';
import './ProjectsSection.css';

/** Self-contained Projects section (no navbar). Three.js is lazy-loaded on first view. */
export default function ProjectsSection({ id = 'projects', className = '', projects = PROJECTS }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    let scene = null, dead = false, inView = false;
    let stopFx = null;
    const getProgress = () => {
      const r = root.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      return span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0;
    };
    const fail = (err) => { console.warn('ProjectsSection: WebGL unavailable', err); if (!dead) root.classList.add('px-fallback'); q.ready(); };
    // prepared in the background in its turn (loading queue), or at once when the visitor approaches; renders only on screen
    const q = registerScene('projects', { start: () => {
      // the panels' motifs and details dialog load with the scene, well before the visitor can reach them
      import('./projects/ProjectsEffects').then((m) => { if (!dead) stopFx = m.initProjectsEffects(root, projects); }).catch((err) => console.warn(err));
      import('./projects/ProjectsScene').then(({ createProjectsScene }) => {
        if (dead) return;
        try {
          scene = createProjectsScene(canvasRef.current, { getProgress, onReady: () => { if (!dead) { root.classList.add('px-ready'); q.ready(); } }, onError: fail });
          scene.setVisible(inView);
        } catch (err) { fail(err); }
      }).catch(fail);
    } });
    const near = whenNear(root, () => q.urgent());
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (scene) scene.setVisible(inView);
    }, { rootMargin: '-1px 0px' });   // portfolio: a neighbour whose edge merely touches the viewport is not "visible"
    io.observe(root);
    return () => { dead = true; near(); io.disconnect(); q.unregister(); if (stopFx) stopFx(); if (scene) scene.dispose(); root.classList.remove('px-ready', 'px-fallback'); };
  }, [projects]);

  return (
    <section ref={rootRef} id={id} className={`px-root ${className}`.trim()}>
      <div className="px-stage">
        <canvas ref={canvasRef} className="px-gl" aria-hidden="true" />
        <div className="px-vig" />
        <SceneLoader label="Bringing the lab online" progress />
      </div>
      <div className="px-content">
        <header className="px-head">
          <span className="px-lab">PROJECTS</span>
          <h2>Experiments under observation</h2>
          <p>Each project examined as it runs.</p>
        </header>
        <div className="px-grid">
          {projects.map((p, i) => (
            <article key={p.title} className={`px-panel ${p.cls}`} tabIndex={0} role="button" aria-haspopup="dialog" aria-label={`Open details: ${p.title}`} data-i={i} style={{ '--d': p.d, '--ar': p.ar }}>
              <div className="px-top"><span>SUBJECT</span><span className="px-st"><i />{p.st || 'OBSERVING'}</span></div>
              <canvas className="px-motif" data-motif={p.motif} />
              <div className="px-bot"><h3>{p.title}</h3></div>
              <div className="px-more">
                <p>{p.desc}</p>
                <ul>{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
