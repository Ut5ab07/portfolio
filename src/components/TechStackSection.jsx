import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { STATIONS } from './stack/stackData';
import { registerScene, whenNear } from '../navigation/sceneQueue';
import SceneLoader from './SceneLoader';
import './TechStackSection.css';

/**
 * Stack (04): Mission Control on Mars. A research facility interior (three.js, lazy-loaded) with a wide observation window
 * over the Martian desert. Three physical workstations are the navigation: click one (or its label, or use the keyboard) to
 * open its technology panel. Nothing here listens to the scroll wheel; the page scrolls past normally.
 * Props: id (keep "stack"), className, stations (defaults to stackData.js).
 */
export default function TechStackSection({ id = 'stack', className = '', stations = STATIONS }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const markRefs = useRef({});
  const panelRef = useRef(null);
  const returnFocus = useRef(null);
  const panelBox = useRef(null);                // open panel's box in section coordinates (labels behind it move aside)
  const anchors = useRef(null);                 // last station anchors from the scene
  const placeRef = useRef(null);
  const closeRef = useRef(() => {});
  const [open, setOpen] = useState(null);       // station id shown in the panel
  const [hover, setHover] = useState(null);     // station under the pointer (scene) or a focused / hovered label
  const [icons, setIcons] = useState({});
  const [phase, setPhase] = useState('');        // '' | 'ms-ready' | 'ms-fallback' (kept in state: React owns className)

  // scene lifecycle: prepared in the background in its turn (loading queue; its models and textures download right after Home is
  // ready), or at once when the visitor approaches; renders only while on screen
  useEffect(() => {
    const root = rootRef.current;
    let dead = false, inView = false;
    const fail = (err) => { console.warn('TechStackSection: WebGL unavailable or failed', err); if (!dead) setPhase('ms-fallback'); q.ready(); };
    const placeMarks = (a) => {
      anchors.current = a;
      const W = root.clientWidth, H = root.clientHeight, m = 18, pb = panelBox.current;
      for (const s of stations) {
        const el = markRefs.current[s.id], p = a[s.id];
        if (!el || !p) continue;
        // off screen (narrow phones): pin the label to the nearest edge, pointing toward its station
        let x = Math.min(W - m, Math.max(m, p.behind ? (p.x < W / 2 ? W - m : m) : p.x)), y = Math.min(H - 90, Math.max(70, p.y));
        let edge = p.on ? '' : x <= m + 1 ? 'left' : x >= W - m - 1 ? 'right' : 'y';
        // behind the open panel: pin the label just outside the panel's edge, pointing toward its station, so it stays clickable
        const w = el.offsetWidth, h = el.offsetHeight;
        const bx = edge === 'left' ? x : edge === 'right' ? x - w : x - w / 2, by = edge === 'left' || edge === 'right' ? y - h / 2 : y - h - 14;
        if (pb && bx < pb.r + 8 && bx + w > pb.l - 8 && by < pb.b + 8 && by + h + 14 > pb.t - 8) {
          if (pb.side === 'right') { x = pb.l - 12; edge = 'right'; }
          else if (pb.side === 'left') { x = pb.r + 12; edge = 'left'; }
          else y = pb.t - 8;
        }
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.dataset.edge = edge;
      }
    };
    placeRef.current = placeMarks;
    const load = () => {
      import('./stack/StackScene').then(({ createStackScene }) => {
        if (dead) return;
        try {
          sceneRef.current = createStackScene(canvasRef.current, {
            onReady: () => { if (!dead) { setPhase('ms-ready'); q.ready(); } },
            onError: fail,
            onHover: (h) => setHover(h),
            onSelect: (sid) => openStation(sid, null),
            onMiss: () => closeRef.current(),
            onAnchors: placeMarks,
          });
          sceneRef.current.setVisible(inView);
        } catch (err) { fail(err); }
      }).catch(fail);
      import('./stack/icons').then((m) => { if (!dead) setIcons(m); }).catch(() => {});
    };
    const q = registerScene('stack', { start: load, prefetch: () => import('./stack/assets').then((m) => m.prefetchStackAssets()).catch(() => {}) });
    const near = whenNear(root, () => q.urgent());
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (sceneRef.current) sceneRef.current.setVisible(inView); }, { rootMargin: '-1px 0px' });
    io.observe(root);
    return () => { dead = true; near(); io.disconnect(); q.unregister(); if (sceneRef.current) sceneRef.current.dispose(); sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openStation = useCallback((sid, from) => {
    returnFocus.current = from || markRefs.current[sid] || null;
    setOpen(sid);
  }, []);
  const close = useCallback(() => {
    setOpen(null);
    const f = returnFocus.current; returnFocus.current = null;
    if (f && f.focus) f.focus({ preventScroll: true });
  }, []);

  closeRef.current = () => { if (open) close(); };

  // measure the open panel (layout box, unaffected by its entrance animation) so labels it would cover move beside it
  useLayoutEffect(() => {
    const measure = () => {
      const el = panelRef.current;
      if (!open || !el || !el.offsetWidth) panelBox.current = null;
      else {
        const l = el.offsetLeft, t = el.offsetTop, r = l + el.offsetWidth, b = t + el.offsetHeight, W = rootRef.current.clientWidth;
        panelBox.current = { l, t, r, b, side: el.offsetWidth > W * 0.7 ? 'bottom' : l + el.offsetWidth / 2 > W / 2 ? 'right' : 'left' };
      }
      if (anchors.current && placeRef.current) placeRef.current(anchors.current);
    };
    measure();
    if (!open) return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  // while a panel is open, a click anywhere outside it closes it (labels, the rail and the stations themselves switch instead;
  // clicks on empty parts of the scene arrive through the scene's onMiss)
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      const t = e.target;
      if (!(t instanceof Element) || !t.isConnected) return;
      if (t.closest('.ms-panel, .ms-mark, .ms-rail-b, .ms-gl')) return;
      close();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open, close]);

  // keep the scene in step with the interface
  useEffect(() => { if (sceneRef.current) sceneRef.current.setSelected(open); }, [open]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setHover(hover); }, [hover]);
  // a newly opened panel takes focus (without scrolling the page); Esc closes it
  useEffect(() => {
    if (!open) return;
    const h = panelRef.current && panelRef.current.querySelector('h3');
    if (h) h.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const cur = stations.find((s) => s.id === open);

  return (
    <section ref={rootRef} id={id} className={`ms-root ${phase}${open ? ' ms-open' : ''}${open === 'tools' ? ' ms-open-left' : ''} ${className}`.replace(/\s+/g, ' ').trim()} aria-label="Technology stack: Mission Control">
      <canvas ref={canvasRef} className="ms-gl" aria-hidden="true" />
      <div className="ms-shade" aria-hidden="true" />
      <SceneLoader label="Establishing Mars link" progress />

      <header className="ms-head">
        <p className="ms-kicker">STACK <i /> <em>MISSION CONTROL</em></p>
        <h2 className="ms-title">Mission Control</h2>
        <p className="ms-sub">Select a workstation to inspect its systems.</p>
      </header>

      {/* labels that follow the three stations; real buttons, so they work with the keyboard and on touch */}
      <div className="ms-marks">
        {stations.map((s) => (
          <button key={s.id} type="button" ref={(el) => { markRefs.current[s.id] = el; }}
            className={`ms-mark${hover === s.id ? ' ms-hot' : ''}${open === s.id ? ' ms-sel' : ''}`}
            aria-pressed={open === s.id} aria-controls={`${id}-panel`}
            onClick={(e) => openStation(s.id, e.currentTarget)}
            onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}>
            <span className="ms-mark-dot" aria-hidden="true" />
            <span className="ms-mark-l">{s.short}</span>
          </button>
        ))}
      </div>

      {/* the station rail: all three categories, always one click away */}
      <nav className="ms-rail" aria-label="Workstations">
        {stations.map((s) => (
          <button key={s.id} type="button" className={`ms-rail-b${open === s.id ? ' ms-sel' : ''}`} aria-pressed={open === s.id}
            onClick={(e) => openStation(s.id, e.currentTarget)}
            onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
            {s.short}
          </button>
        ))}
      </nav>

      <aside ref={panelRef} id={`${id}-panel`} className={`ms-panel${cur ? ' ms-on' : ''}${cur && cur.id === 'tools' ? ' ms-left' : ''}`}
        role="region" aria-label={cur ? `${cur.title} technologies` : undefined} hidden={!cur}>
        {cur && (
          <>
            <div className="ms-panel-top">
              <p className="ms-status"><i aria-hidden="true" />ONLINE</p>
              <div className="ms-switch" role="group" aria-label="Switch workstation">
                {stations.map((s) => (
                  <button key={s.id} type="button" aria-pressed={s.id === cur.id} aria-label={s.title}
                    className={s.id === cur.id ? 'ms-sel' : ''} onClick={() => setOpen(s.id)}>{s.tab}</button>
                ))}
              </div>
              <button type="button" className="ms-close" onClick={close}>CLOSE <span aria-hidden="true">×</span></button>
            </div>
            <h3 tabIndex={-1}>{cur.title}</h3>
            <p className="ms-desc">{cur.desc}</p>
            <div className="ms-groups">
              {cur.groups.map((g) => (
                <section key={g.name} className="ms-group" aria-label={g.name}>
                  <h4>{g.name}</h4>
                  <ul>
                    {g.items.map(([name, icon, mono]) => {
                      const ic = icon && icons[icon];
                      return (
                        <li key={name}>
                          <span className={`ms-ico${ic ? '' : ' ms-mono'}`} aria-hidden="true">
                            {ic ? <svg viewBox="0 0 24 24"><path d={ic.path} /></svg> : <b>{mono}</b>}
                          </span>
                          <span className="ms-nm">{name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </aside>
    </section>
  );
}
