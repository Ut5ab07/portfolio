// Fine-line diagrams, one per project, drawn from what each project does (no imagery is claimed as output).
// Static SVG: no per-frame work. Elements with class "a" carry the accent and respond to the card's interaction state.
const W = 320, H = 132;
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function Scout() {          // a pitch; players compared by similarity
  const r = rng(7), pts = Array.from({ length: 14 }, () => [24 + r() * 272, 18 + r() * 96]);
  const q = [205, 62], near = [...pts].sort((a, b) => Math.hypot(a[0] - q[0], a[1] - q[1]) - Math.hypot(b[0] - q[0], b[1] - q[1])).slice(0, 3);
  return (<>
    <rect x="12" y="10" width="296" height="112" /><line x1="160" y1="10" x2="160" y2="122" /><circle cx="160" cy="66" r="18" />
    <rect x="12" y="38" width="34" height="56" /><rect x="274" y="38" width="34" height="56" />
    {pts.map(([x, y], i) => <circle key={i} className="d" cx={x} cy={y} r="2.2" />)}
    {near.map(([x, y], i) => <line key={i} className="a l" x1={q[0]} y1={q[1]} x2={x} y2={y} />)}
    <circle className="a f" cx={q[0]} cy={q[1]} r="3.4" /><circle className="a" cx={q[0]} cy={q[1]} r="9" />
  </>);
}
function Agent() {          // automated analysis: distributions, a fitted trend
  const r = rng(3), bars = Array.from({ length: 12 }, (_, i) => 18 + Math.sin(i * 0.7) * 14 + r() * 40);
  const line = bars.map((b, i) => `${i ? 'L' : 'M'}${30 + i * 24},${118 - (22 + i * 6.2)}`).join('');
  return (<>
    <line x1="18" y1="120" x2="306" y2="120" /><line x1="18" y1="14" x2="18" y2="120" />
    {[40, 66, 92].map((y) => <line key={y} className="g" x1="18" y1={y} x2="306" y2={y} />)}
    {bars.map((b, i) => <rect key={i} className={i === 9 ? 'a f' : 'd'} x={24 + i * 24} y={120 - b} width="11" height={b} />)}
    <path className="a l" d={line} />
  </>);
}
function Semantic() {       // an embedding space: clusters, a query and its nearest neighbours
  const r = rng(19), C = [[70, 46], [150, 92], [248, 50]];
  const pts = C.flatMap(([cx, cy]) => Array.from({ length: 11 }, () => [cx + (r() - 0.5) * 64, cy + (r() - 0.5) * 46]));
  const q = [228, 62], near = [...pts].sort((a, b) => Math.hypot(a[0] - q[0], a[1] - q[1]) - Math.hypot(b[0] - q[0], b[1] - q[1])).slice(0, 4);
  return (<>
    {C.map(([x, y], i) => <ellipse key={i} className="g" cx={x} cy={y} rx="40" ry="30" />)}
    {pts.map(([x, y], i) => <circle key={i} className="d" cx={x} cy={y} r="1.9" />)}
    {near.map(([x, y], i) => <line key={i} className="a l" x1={q[0]} y1={q[1]} x2={x} y2={y} />)}
    <circle className="a" cx={q[0]} cy={q[1]} r="22" strokeDasharray="2 3" /><circle className="a f" cx={q[0]} cy={q[1]} r="3.4" />
  </>);
}
function Graph() {          // users and movies as a bipartite graph; a recommendation through a shared connection
  const U = [24, 48, 72, 96, 116].map((y) => [64, y]), M = [18, 40, 62, 84, 106, 124].map((y) => [256, y]);
  const E = [[0, 0], [0, 2], [1, 2], [1, 3], [2, 1], [2, 4], [3, 3], [3, 5], [4, 4], [4, 0], [1, 5]];
  const hot = [[0, 2], [1, 2], [1, 5]];
  const isHot = (e) => hot.some((h) => h[0] === e[0] && h[1] === e[1]);
  return (<>
    <line className="g" x1="64" y1="10" x2="64" y2="124" /><line className="g" x1="256" y1="8" x2="256" y2="128" />
    {E.map((e, i) => <line key={i} className={isHot(e) ? 'a l' : ''} x1={U[e[0]][0]} y1={U[e[0]][1]} x2={M[e[1]][0]} y2={M[e[1]][1]} />)}
    {U.map(([x, y], i) => <circle key={i} className={i < 2 ? 'a f' : 'd'} cx={x} cy={y} r="3.6" />)}
    {M.map(([x, y], i) => <rect key={i} className={i === 5 ? 'a f' : 'd'} x={x - 3.4} y={y - 3.4} width="6.8" height="6.8" />)}
  </>);
}
function Api() {            // a request through authentication and permissions to the resources
  const res = [['courses', 26], ['enrollments', 52], ['progress', 78], ['reviews', 104]];
  return (<>
    <rect x="14" y="52" width="56" height="28" /><rect x="112" y="40" width="58" height="52" />
    <line className="a l" x1="70" y1="66" x2="112" y2="66" /><circle className="a f" cx="70" cy="66" r="2.6" />
    <line x1="141" y1="40" x2="141" y2="92" className="g" />
    {res.map(([n, y]) => (<g key={n}>
      <path className={n === 'progress' ? 'a l' : ''} d={`M170,66 C204,66 204,${y} 232,${y}`} fill="none" />
      <rect x="232" y={y - 8} width="76" height="16" className={n === 'progress' ? 'a' : ''} />
    </g>))}
  </>);
}
const ART = { scout: Scout, agent: Agent, semantic: Semantic, graph: Graph, api: Api };

export default function Motif({ kind, className = '' }) {
  const Art = ART[kind] || Scout;
  return (
    <svg className={`m-motif ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <Art />
    </svg>
  );
}
