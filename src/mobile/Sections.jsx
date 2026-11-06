import { useState } from 'react';
import { PERSON, WORK, STACK, CONTACT, short, gmailCompose, instaHandle } from './content';
import { goTo } from './nav';
import Motif from './Motif';
import { Arrow, GitHubIcon, LinkedInIcon, InstagramIcon, MailIcon, CopyIcon, DoneIcon, TechMark } from './icons';

// Section opener: kicker, a hairline to the right edge, and the title.
function Head({ kicker, title }) {
  return (
    <header className="m-head" data-reveal>
      <p className="m-head-row"><span className="m-head-k">{kicker}</span><span className="m-head-rule" /></p>
      <h2 className="m-head-t">{title}</h2>
    </header>
  );
}

// Faint survey contours behind the opening: static, drawn once.
function Contours() {
  const lines = Array.from({ length: 9 }, (_, k) => {
    const r = 40 + k * 26, pts = [];
    for (let a = 0; a <= 64; a++) {
      const t = (a / 64) * Math.PI * 2, w = 1 + 0.13 * Math.sin(3 * t + k * 0.6) + 0.07 * Math.sin(5 * t - k);
      pts.push(`${(300 + Math.cos(t) * r * w * 1.18).toFixed(1)},${(170 + Math.sin(t) * r * w * 0.78).toFixed(1)}`);
    }
    return <polyline key={k} points={pts.join(' ')} className={k === 3 ? 'a' : undefined} />;
  });
  return <svg className="m-contours" viewBox="0 0 420 380" aria-hidden="true" focusable="false">{lines}</svg>;
}

export function Home() {
  const [first, middle, ...rest] = PERSON.name.split(' ');
  return (
    <section id="home" className="m-sec m-home" aria-label="Introduction">
      <Contours />
      <h1 className="m-name" data-reveal>
        <span>{first}</span><span className="m-name-it">{middle}</span><span>{rest.join(' ')}</span>
      </h1>
      <dl className="m-places" data-reveal>
        <div><dt>Currently in</dt><dd>{PERSON.based}</dd></div>
        <div><dt>Originally from</dt><dd>{PERSON.origin}</dd></div>
      </dl>
      <p className="m-intro" data-reveal>{PERSON.intro}</p>
      <a className="m-next" href="#profile" onClick={(e) => { e.preventDefault(); goTo('profile'); }}>
        <span className="m-next-line" aria-hidden="true" />
        <span className="m-next-l"><span className="m-dim">Next</span> About &amp; Education</span>
        <Arrow className="m-down" />
      </a>
    </section>
  );
}

export function About() {
  const ed = Object.fromEntries(PERSON.education.map((e) => [e.label, e.value]));
  return (
    <section id="profile" className="m-sec m-about" aria-labelledby="about-t">
      <Head kicker="About & Education" title={<span id="about-t">A practical interest in data and intelligent systems</span>} />
      <div className="m-about-grid">
        <p className="m-lead" data-reveal>{PERSON.lead}</p>
        <figure className="m-portrait" data-reveal>
          <img src={PERSON.portrait.src} srcSet={`${PERSON.portrait.small} 320w, ${PERSON.portrait.src} ${PERSON.portrait.w}w`} sizes="(min-width: 700px) 40vw, 62vw"
            width={PERSON.portrait.w} height={PERSON.portrait.h} alt={`Portrait of ${PERSON.name}`} loading="lazy" decoding="async" />
          <figcaption><span>{PERSON.name}</span></figcaption>
        </figure>
        <div className="m-about-text">
          {PERSON.about.map((p, i) => <p key={i} data-reveal>{p}</p>)}
        </div>
      </div>

      <div className="m-edu" data-reveal>
        <p className="m-label">Education</p>
        <ol className="m-timeline">
          <li className="m-now">
            <span className="m-tl-dot" aria-hidden="true" />
            <p className="m-tl-meta"><span>{ed.Years}</span><span className="m-accent">{ed.Status}</span></p>
            <h3>{ed.Programme}</h3>
            <p className="m-tl-inst">{ed.Institution}</p>
          </li>
        </ol>
      </div>

      <div className="m-interests" data-reveal>
        <p className="m-label">Technical interests</p>
        <ul>
          {PERSON.interests.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <a className="m-btn" href={PERSON.resume} download>
        <span>Download résumé</span><span className="m-btn-meta">PDF</span><Arrow className="m-down" />
      </a>
    </section>
  );
}

export function Projects({ onOpen }) {
  return (
    <section id="projects" className="m-sec m-work" aria-labelledby="work-t">
      <Head kicker="Projects" title={<span id="work-t">Selected work, examined in detail</span>} />
      <ul className="m-cards">
        {WORK.map((w) => (
          <li key={w.slug} className="m-card" data-reveal>
            <button type="button" className="m-card-hit" onClick={() => onOpen(w.slug)} aria-haspopup="dialog">
              <span className="m-card-top"><span>{w.tech.length} technologies</span></span>
              <span className="m-card-art"><Motif kind={w.motif} /></span>
              <span className="m-card-t">{w.title}</span>
              <span className="m-card-d">{w.desc}</span>
              <span className="m-card-tech">{w.tech.slice(0, 3).join('  ·  ')}{w.tech.length > 3 ? `  +${w.tech.length - 3}` : ''}</span>
              <span className="m-card-go">Open case file <Arrow /></span>
            </button>
            {w.repo && <a className="m-card-repo" href={w.repo} target="_blank" rel="noopener noreferrer" aria-label={`${w.title} on GitHub (opens in a new tab)`}><GitHubIcon /></a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chapter({ c, open, onToggle }) {
  const id = `stack-${c.id}`;
  return (
    <li className={`m-ch${open ? ' m-open' : ''}`} data-reveal>
      <h3>
        <button type="button" className="m-ch-hit" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span className="m-ch-t">{c.title}</span>
          <span className="m-ch-c">{c.count} tools</span>
          <span className="m-ch-x" aria-hidden="true" />
        </button>
      </h3>
      <div className="m-ch-body" id={id} role="region" aria-label={c.title} inert={!open}>
        <div className="m-ch-in">
          <p className="m-ch-d">{c.desc}</p>
          {c.groups.map((g) => (
            <div key={g.name} className="m-grp">
              <p className="m-label">{g.name}</p>
              <ul>{g.items.map((t) => <li key={t.name}><TechMark icon={t.icon} mono={t.mono} />{t.name}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}

export function Stack() {
  const [open, setOpen] = useState(STACK[0].id);
  return (
    <section id="stack" className="m-sec m-stack" aria-labelledby="stack-t">
      <Head kicker="Technical Stack" title={<span id="stack-t">Tools, grouped by the work they do</span>} />
      <ol className="m-chapters">
        {STACK.map((c) => <Chapter key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />)}
      </ol>
    </section>
  );
}

// The contact links, shown as icons only (the addresses stay in the labels for screen readers and in the tooltips).
// Email opens Gmail's compose window (in a new tab) with the address filled in. An entry without an address is left out.
const LINKS = [
  CONTACT.email && { name: 'Email', tip: CONTACT.email, label: `Email ${CONTACT.email} in Gmail`, href: gmailCompose(CONTACT.email), Icon: MailIcon },
  CONTACT.github && { name: 'GitHub', tip: short(CONTACT.github), label: `GitHub, ${short(CONTACT.github)}`, href: CONTACT.github, Icon: GitHubIcon },
  CONTACT.linkedin && { name: 'LinkedIn', tip: short(CONTACT.linkedin), label: `LinkedIn, ${short(CONTACT.linkedin)}`, href: CONTACT.linkedin, Icon: LinkedInIcon },
  CONTACT.instagram && { name: 'Instagram', tip: instaHandle(CONTACT.instagram), label: `Instagram, ${instaHandle(CONTACT.instagram)}`, href: CONTACT.instagram, Icon: InstagramIcon },
].filter(Boolean);

export function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    if (navigator.clipboard) navigator.clipboard.writeText(CONTACT.email).then(done, () => {}); else done();
  };
  return (
    <section id="contact" className="m-sec m-contact" aria-labelledby="contact-t">
      <Head kicker="Contact" title={<span id="contact-t">Every great idea starts with a conversation.</span>} />
      <ul className="m-links" data-reveal aria-label="Contact links">
        {LINKS.map(({ name, tip, label, href, Icon }) => (
          <li key={name}><a className="m-link" href={href} target="_blank" rel="noopener noreferrer" title={tip} aria-label={`${label} (opens in a new tab)`}><Icon className="m-ico" /></a></li>
        ))}
        {CONTACT.email && (
          <li><button type="button" className={`m-link${copied ? ' m-done' : ''}`} onClick={copy} title="Copy email address" aria-label={`Copy email address ${CONTACT.email}`}>
            {copied ? <DoneIcon className="m-ico" /> : <CopyIcon className="m-ico" />}
          </button></li>
        )}
      </ul>
      <p className="m-copied" role="status" aria-live="polite">{copied ? 'Email address copied' : ''}</p>
      <dl className="m-places m-places-end" data-reveal>
        <div><dt>Location</dt><dd>{CONTACT.based}</dd></div>
        <div><dt>Origin</dt><dd>{CONTACT.origin}</dd></div>
      </dl>
      <footer className="m-foot" data-reveal>
        <div className="m-foot-row">
          <button type="button" className="m-top" onClick={() => goTo('home')}><Arrow className="m-up" />Back to top</button>
        </div>
      </footer>
    </section>
  );
}
