import { useEffect, useRef, useState } from 'react';
import { WORK } from './content';
import Motif from './Motif';
import { Arrow, GitHubIcon } from './icons';

// A project's case file: rises over the page, scrolls on its own, closes with the button, Escape or Back.
// Only recorded content is shown; empty fields (problem, live demo, outcomes) are left out rather than filled in.
export default function ProjectSheet({ slug, onClose }) {
  const [shown, setShown] = useState(slug);              // keeps the last project in place while the sheet slides away
  if (slug && slug !== shown) setShown(slug);
  const w = WORK.find((x) => x.slug === shown);
  const ref = useRef(null), closeRef = useRef(null), back = useRef(null);
  const open = !!slug;

  useEffect(() => {
    if (!open) { if (back.current) { back.current.focus({ preventScroll: true }); back.current = null; } return; }
    back.current = document.activeElement;
    if (ref.current) ref.current.scrollTop = 0;
    closeRef.current && closeRef.current.focus({ preventScroll: true });
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, slug, onClose]);

  return (
    <div className={`m-sheet${open ? ' m-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="m-sheet-t" aria-hidden={!open} inert={!open}>
      <div className="m-sheet-scrim" onClick={onClose} />
      <article className="m-sheet-card" ref={ref}>
        {w && (<>
          <header className="m-sheet-head">
            <span className="m-label">Case file</span>
            <button type="button" className="m-close" ref={closeRef} onClick={onClose}><span>Close</span><i aria-hidden="true" /></button>
          </header>
          <h2 id="m-sheet-t" className="m-sheet-t">{w.title}</h2>
          <p className="m-sheet-d">{w.desc}</p>
          <div className="m-sheet-art"><Motif kind={w.motif} /></div>

          <section className="m-sheet-sec"><h3 className="m-label">Overview</h3><p>{w.overview}</p></section>
          {w.problem && <section className="m-sheet-sec"><h3 className="m-label">Problem</h3><p>{w.problem}</p></section>}
          {w.approach.length > 0 && (
            <section className="m-sheet-sec"><h3 className="m-label">Approach</h3>
              <ol className="m-steps">{w.approach.map((s, i) => <li key={s}><span aria-hidden="true" />{s}</li>)}</ol>
            </section>
          )}
          {w.features.length > 0 && (
            <section className="m-sheet-sec"><h3 className="m-label">What it does</h3>
              <ul className="m-feats">{w.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </section>
          )}
          <section className="m-sheet-sec"><h3 className="m-label">Technologies</h3>
            <ul className="m-techlist">{w.tech.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
          <div className="m-sheet-links">
            {w.repo && <a className="m-btn" href={w.repo} target="_blank" rel="noopener noreferrer"><GitHubIcon className="m-ico" /><span>View the code on GitHub</span><Arrow /></a>}
            {w.demo && <a className="m-btn m-btn-line" href={w.demo} target="_blank" rel="noopener noreferrer"><span>Open the live demo</span><Arrow /></a>}
          </div>
        </>)}
      </article>
    </div>
  );
}
