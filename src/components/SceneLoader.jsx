import { useEffect, useRef } from 'react';
import { SCENE_PROGRESS } from '../three/quiet';
import './SceneLoader.css';

/**
 * A quiet "still preparing" mark for a section whose 3D scene is not ready yet: a short caption and a thin travelling line,
 * top right, in the section's own ink. Purely CSS-driven: it fades in after a moment only while the section root lacks its
 * ready / fallback class, so it never flashes when the scene is already prepared (or cached). Decorative (aria-hidden).
 * With `progress`, a third line names what the scene is doing and counts its real steps; there is no percentage to fake.
 */
export default function SceneLoader({ label = 'Preparing scene', progress = false }) {
  const ref = useRef(null), status = useRef(null);
  useEffect(() => {
    const section = progress && ref.current.closest('section');
    if (!section) return undefined;
    const show = (e) => {
      const { stage, done, total } = e.detail;
      status.current.textContent = total ? `${stage} ${done} / ${total}` : stage;
    };
    section.addEventListener(SCENE_PROGRESS, show);
    return () => section.removeEventListener(SCENE_PROGRESS, show);
  }, [progress]);
  return (
    <div ref={ref} className="pf-loader" aria-hidden="true">
      <span className="pf-loader-label">{label}</span>
      <span className="pf-loader-line" />
      {progress && <span ref={status} className="pf-loader-status" />}
    </div>
  );
}
