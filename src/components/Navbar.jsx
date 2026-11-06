import { useEffect, useRef } from 'react';
import { scrollToSection } from '../navigation/scrollToSection';
import './Navbar.css';

/** The one site-wide navbar. Takes its tint from the active section so it sits naturally inside each environment. */
export default function Navbar({ sections, active }) {
  const navRef = useRef(null);
  const theme = (sections.find((s) => s.id === active) || sections[0]).nav;

  // On narrow screens the bar scrolls horizontally: keep the active item in view (scrolls the bar only, never the page).
  useEffect(() => {
    // read in the next frame, when layout is already up to date, instead of forcing it during React's commit
    const raf = requestAnimationFrame(() => {
      const nav = navRef.current, link = nav && nav.querySelector('.pf-nav-on');
      if (!link || nav.scrollWidth <= nav.clientWidth) return;
      nav.scrollTo({ left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const tint = { '--nav-fg': theme.fg, '--nav-on': theme.on, '--nav-shade': theme.shade, '--nav-glow': theme.glow };
  return (<>
    <nav
      ref={navRef}
      className="pf-nav"
      aria-label="Primary"
      style={tint}
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={s.id === active ? 'pf-nav-on' : undefined}
          aria-current={s.id === active ? 'true' : undefined}
          onClick={(e) => { e.preventDefault(); scrollToSection(s.id); }}
        >
          {s.label}
        </a>
      ))}
    </nav>
    {/* Switch to the mobile edition, at the same section: a unit of its own in the top-right corner, apart from the section
        links. The choice is remembered for later visits to / (vercel.json). */}
    <a className="pf-edition" style={tint} href={`/mobile${active && active !== 'home' ? `#${active}` : ''}`}
      aria-label="Switch to the mobile edition" title="Mobile edition" onClick={() => {
        document.cookie = 'pf-edition=mobile; path=/; max-age=31536000; SameSite=Lax';
        // Back must return to this edition, which / no longer serves once the choice is saved: name it in this entry's URL
        if (window.location.pathname === '/') history.replaceState(history.state, '', `/cinematic${active && active !== 'home' ? `#${active}` : ''}`);
      }}>
      {/* Material Icons "smartphone" (Apache-2.0) */}
      <span className="pf-edition-box"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" /></svg></span>
    </a>
  </>);
}
