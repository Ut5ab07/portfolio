import { useLayoutEffect } from 'react';
import Navbar from './components/Navbar';
import { SECTIONS } from './navigation/sections';
import { useActiveSection } from './navigation/useActiveSection';
import { startHashNavigation } from './navigation/hashNavigation';

const IDS = SECTIONS.map((s) => s.id);

export default function App() {
  const active = useActiveSection(IDS);
  // a link to a section (/#contact) lands there before the first paint; Back / Forward and hash changes follow the URL
  useLayoutEffect(() => { startHashNavigation(IDS); }, []);
  return (
    <>
      <Navbar sections={SECTIONS} active={active} />
      <main>
        {SECTIONS.map(({ id, Component }) => <Component key={id} id={id} />)}
      </main>
    </>
  );
}
