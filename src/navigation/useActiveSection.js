import { useEffect, useState } from 'react';

// The active section is the one crossing the middle of the viewport. Read-only: this only observes scroll position and
// never cancels or redirects wheel/touch input, so each section keeps sole ownership of its own scroll interactions.
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { setActive(id); return; }
      }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(measure); };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    queue();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); };
  }, [ids]);

  return active;
}
