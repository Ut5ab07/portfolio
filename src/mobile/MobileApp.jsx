import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { SECTIONS, WORK, PERSON } from './content';
import { Home, About, Projects, Stack, Contact } from './Sections';
import ProjectSheet from './ProjectSheet';
import { Arrow } from './icons';

import { goTo, reduceMotion } from './nav';

// The section crossing the upper third of the screen is the current one.
function useActive() {
  const [active, setActive] = useState('home');
  useEffect(() => {
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(e.target.id); }, { rootMargin: '-30% 0px -69% 0px' });
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return active;
}

// Elements marked data-reveal settle into place once, the first time they come into view.
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-reveal]')];
    // kept as a data attribute, not a class: React owns className and would drop the state on its next render
    if (reduceMotion()) { els.forEach((e) => { e.dataset.in = ''; }); return; }
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.dataset.in = ''; io.unobserve(e.target); } }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function Bar({ active, onMenu, menuOpen }) {
  const i = SECTIONS.findIndex((s) => s.id === active);
  return (
    <header className="m-bar">
      <p className="m-where" aria-live="polite">
        <span className="m-where-l" key={active}>{SECTIONS[i].label}</span>
      </p>
      {/* switch to the cinematic edition, at the same section; the choice is remembered for later visits to / (vercel.json) */}
      <a className="m-switch m-switch-bar" href={`/cinematic${active !== 'home' ? `#${active}` : ''}`}
        title="Open the cinematic edition" onClick={() => {
          document.cookie = 'pf-edition=cinematic; path=/; max-age=31536000; SameSite=Lax';
          // Back must return to this edition, which / no longer serves once the choice is saved: name it in this entry's URL
          if (window.location.pathname === '/') history.replaceState(history.state, '', `/mobile${active !== 'home' ? `#${active}` : ''}`);
        }}>Cinematic</a>
      <button type="button" className={`m-menu-btn${menuOpen ? ' m-open' : ''}`} onClick={onMenu} aria-expanded={menuOpen} aria-controls="m-index"
        aria-label={menuOpen ? 'Close the section index' : 'Open the section index'}>
        <i aria-hidden="true" />
      </button>
    </header>
  );
}

function Menu({ open, active, onClose }) {
  const first = useRef(null);
  useEffect(() => {
    if (!open) return;
    first.current && first.current.focus({ preventScroll: true });
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, onClose]);
  return (
    <nav id="m-index" className={`m-index${open ? ' m-open' : ''}`} aria-label="Sections" aria-hidden={!open} inert={!open}>
      <ol>
        {SECTIONS.map((s, i) => (
          <li key={s.id} className={s.id === active ? 'm-on' : undefined}>
            <a ref={i === 0 ? first : undefined} href={`#${s.id}`} aria-current={s.id === active ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); onClose(); goTo(s.id); }}>
              <span className="m-index-l">{s.label}</span>
              <Arrow />
            </a>
          </li>
        ))}
      </ol>
      <div className="m-index-foot"><span>{PERSON.based}</span></div>
    </nav>
  );
}

const sectionFromHash = () => { const m = /^#(about|profile|projects|stack|contact)$/.exec(window.location.hash); return m ? (m[1] === 'about' ? 'profile' : m[1]) : null; };
const fromHash = () => { const m = /^#projects\/([a-z0-9-]+)$/.exec(window.location.hash); return m && WORK.find((w) => w.slug === m[1]) ? m[1] : null; };

// The bar and the index menu are the only parts that follow the current section, so only they re-render as it changes.
function Chrome({ menu, setMenu }) {
  const active = useActive();
  const closeMenu = useCallback(() => setMenu(false), [setMenu]);
  return (<>
    <Bar active={active} menuOpen={menu} onMenu={() => setMenu((v) => !v)} />
    <Menu open={menu} active={active} onClose={closeMenu} />
  </>);
}

// the page content does not depend on the bar, the menu or the open project: it renders once
const Content = memo(function Content({ onOpen }) {
  return (<><Home /><About /><Projects onOpen={onOpen} /><Stack /><Contact /></>);
});

export default function MobileApp() {
  useReveal();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(fromHash);           // a project detail, from a direct link (/mobile#projects/<slug>)
  const pushed = useRef(false);

  useEffect(() => {                                       // a direct link to a project: land on Projects beneath it
    if (open) { const el = document.getElementById('projects'); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset); }
    const sec = sectionFromHash();                        // a section link (the same ids as the cinematic edition)
    if (sec) { const el = document.getElementById(sec); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset); }
    const pop = () => { setOpen(fromHash()); pushed.current = false; };
    // a section link followed on this page (an edited address, a shared link); closing a case file is not one
    const hash = (e) => { const s = sectionFromHash(); if (s && !/#projects\//.test(e.oldURL)) goTo(s); };
    window.addEventListener('popstate', pop);
    window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('hashchange', hash); };
  }, []);

  const openProject = useCallback((slug) => { history.pushState(null, '', `#projects/${slug}`); pushed.current = true; setOpen(slug); }, []);
  const closeProject = useCallback(() => {
    if (pushed.current) history.back();                   // the entry this sheet added: Back and the close button agree
    else { history.replaceState(null, '', '#projects'); setOpen(null); }
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('m-locked', !!open || menu); }, [open, menu]);

  return (
    <>
      <a className="m-skip" href="#profile">Skip to content</a>
      <Chrome menu={menu} setMenu={setMenu} />
      <main className="m-main" aria-hidden={open || menu ? 'true' : undefined}>
        <Content onOpen={openProject} />
      </main>
      <ProjectSheet slug={open} onClose={closeProject} />
    </>
  );
}
