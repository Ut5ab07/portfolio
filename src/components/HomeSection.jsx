import { useEffect, useRef } from 'react';
import { scrollToSection } from '../navigation/scrollToSection';
import { registerScene } from '../navigation/sceneQueue';
import SceneLoader from './SceneLoader';
import './HomeSection.css';

/**
 * Home (01) — Arrakis. A composed desert planet rendered with three.js (terrain generated in a worker, lazy-loaded), with the
 * introduction set into the landscape like a title card. Props: id, className, ui (false hides the text to judge the scene).
 */
export default function HomeSection({ id = 'home', className = '', ui = true }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    let scene = null, dead = false, inView = true;
    // Home is first in the loading queue: it starts at once and the other scenes wait until it is ready
    const q = registerScene('home', { start: () => {
      import('./home/HomeScene').then(({ createHomeScene }) => new Promise((go) => requestAnimationFrame(() => setTimeout(go, 0, createHomeScene)))).then((createHomeScene) => {
        if (dead) return;
        try {
          scene = createHomeScene(canvasRef.current, {
            onReady: () => { if (!dead) { root.classList.add('hm-ready'); q.ready(); } },
            onError: fail,
          });
          scene.setVisible(inView);
        } catch (err) { fail(err); }
      }).catch(fail);
    } });
    function fail(err) { console.warn('HomeSection: WebGL unavailable or failed', err); if (!dead) root.classList.add('hm-fallback'); q.ready(); }
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (scene) scene.setVisible(inView); }, { rootMargin: '-1px 0px' });
    io.observe(root);
    return () => { dead = true; io.disconnect(); q.unregister(); if (scene) scene.dispose(); root.classList.remove('hm-ready', 'hm-fallback'); };
  }, []);

  const go = (target) => (e) => { e.preventDefault(); scrollToSection(target); };

  return (
    <section ref={rootRef} id={id} className={`hm-root ${className}`.trim()} aria-label="Home">
      <div className="hm-stage">
        <canvas ref={canvasRef} className="hm-gl" aria-hidden="true" />
        <div className="hm-grade" />
        <SceneLoader label="Charting the dunes" progress />
      </div>
      {ui && (
        <>
          <div className="hm-content">
            <p className="hm-label">AI ENGINEERING · DATA SCIENCE · INTELLIGENT SYSTEMS</p>
            <h1 className="hm-title">Building intelligence, one idea at a time.</h1>
            <p className="hm-desc">I explore data, machine learning, and intelligent systems to turn complex problems into meaningful solutions.</p>
            <div className="hm-actions">
              <a className="hm-btn hm-primary" href="#projects" onClick={go('projects')}>EXPLORE MY WORK</a>
              <a className="hm-btn hm-secondary" href="#profile" onClick={go('profile')}>DISCOVER MY WORLD</a>
            </div>
          </div>
          <a className="hm-scroll" href="#profile" onClick={go('profile')} aria-label="Scroll to Profile"><span>SCROLL</span></a>
        </>
      )}
    </section>
  );
}
