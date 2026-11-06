import { useEffect, useRef } from 'react';
import { CONTACT } from './contact/ContactConfig';
import { initContact, sectionProgress } from './contact/ContactEffects';
import { registerScene, whenNear } from '../navigation/sceneQueue';
import SceneLoader from './SceneLoader';
import './ContactSection.css';

// Map-pin glyph (Material Icons "place", Apache-2.0).
const PIN = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z';
function Place({ label, value, current }) {
  return (
    <div className={`ct-place${current ? ' ct-now' : ''}`}>
      <dt><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={PIN} /></svg>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Self-contained Contact section (no navbar). Tall section with a sticky stage: native scrolling drives the folding-city sequence,
 * so nothing intercepts wheel/touch events and the page continues normally after the section. Three.js is lazy-loaded.
 * Props: contact = { email, github, linkedin, origin, based } (defaults to ./contact/ContactConfig.js), id, className.
 */
export default function ContactSection({ id = 'contact', className = '', contact = CONTACT }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    let scene = null, dead = false, inView = false;
    const fx = initContact(root, contact);
    const fallback = (err) => { console.warn('ContactSection: WebGL unavailable or failed', err); if (!dead) { root.classList.add('ct-fallback'); fx.sceneFailed(); } q.ready(); };   // text/links keep following the scroll without WebGL
    // prepared in the background in its turn (loading queue), or at once when the visitor approaches; renders only on screen
    const q = registerScene('contact', { start: () => {
      import('./contact/ContactScene').then(({ createContactScene }) => {
        if (dead) return;
        try {
          scene = createContactScene(canvasRef.current, { getProgress: () => sectionProgress(root), onProgress: fx.onProgress, onError: fallback, onReady: () => { if (!dead) { root.classList.add('ct-ready'); q.ready(); } } });
          scene.setVisible(inView);
        } catch (err) { fallback(err); }
      }).catch(fallback);
    } });
    const near = whenNear(root, () => q.urgent());
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (scene) scene.setVisible(inView);
    }, { rootMargin: '-1px 0px' });   // portfolio: a neighbour whose edge merely touches the viewport is not "visible"
    io.observe(root);
    return () => { dead = true; near(); io.disconnect(); q.unregister(); fx.destroy(); if (scene) scene.dispose(); root.classList.remove('ct-fallback', 'ct-ready'); };
  }, [contact]);

  return (
    <section ref={rootRef} id={id} className={`ct-root ${className}`.trim()} aria-label="Contact">
      <div className="ct-pin">
        <canvas ref={canvasRef} className="ct-gl" aria-hidden="true" />
        <div className="ct-vig" />
        <SceneLoader />
        <header className="ct-intro"><h2>LET&apos;S CONNECT</h2><p>Every great idea starts with a conversation.</p></header>
        <div className="ct-scroll" aria-hidden="true">Scroll</div>
        <button type="button" className="ct-skip">Skip to contact</button>
        <div className="ct-final">
          <h3>LET&apos;S BUILD SOMETHING MEANINGFUL.</h3>
          <p className="ct-lead">Open to discussing interesting projects, AI research, internships, and collaborations.</p>
          <ul className="ct-links" aria-label="Contact links" />
          {(contact.origin || contact.based) && (
            <dl className="ct-loc">
              {contact.origin && <Place label="Origin" value={contact.origin} />}
              {contact.based && <Place label="Currently in" value={contact.based} current />}
            </dl>
          )}
          <p className="ct-note" role="status" aria-live="polite" />
        </div>
      </div>
    </section>
  );
}
