// Line drawings for the six skill cards. Colours come from CSS classes (see .sv in global.css).

const mid = { textAnchor: 'middle' } as const;

function Tree() {
  return (
    <svg className="sv" viewBox="0 0 400 300" aria-hidden="true">
      <rect className="pn" x="150" y="30" width="100" height="40" rx="8" />
      <text className="tm" x="200" y="55" {...mid}>{'<App/>'}</text>
      <path className="o" d="M200 70V104M80 104H320M80 104V134M200 104V134M320 104V134" />
      <circle className="a" cx="200" cy="104" r="4.5" />
      <rect className="pn" x="30" y="134" width="100" height="38" rx="8" />
      <text className="tm" x="80" y="158" {...mid}>{'<Nav/>'}</text>
      <rect className="pa" x="150" y="134" width="100" height="38" rx="8" />
      <text className="tm" x="200" y="158" {...mid}>{'<Map/>'}</text>
      <rect className="pn" x="270" y="134" width="100" height="38" rx="8" />
      <text className="tm" x="320" y="158" {...mid}>{'<Form/>'}</text>
      <path className="o" d="M200 172V202M140 202H260M140 202V228M260 202V228" />
      <rect className="pn" x="100" y="228" width="80" height="34" rx="8" />
      <text className="tm" x="140" y="250" {...mid}>{'<Pin/>'}</text>
      <rect className="pn" x="220" y="228" width="80" height="34" rx="8" />
      <text className="tm" x="260" y="250" {...mid}>{'<Card/>'}</text>
    </svg>
  );
}

function DataFlow() {
  const arrow = 'M-6 -5 6 0-6 5z';
  return (
    <svg className="sv" viewBox="0 0 400 300" aria-hidden="true">
      <circle className="o dsh" cx="200" cy="150" r="96" />
      <path className="a" d={arrow} transform="translate(268 82) rotate(45)" />
      <path className="f" d={arrow} transform="translate(268 218) rotate(135)" />
      <path className="f" d={arrow} transform="translate(132 218) rotate(225)" />
      <path className="f" d={arrow} transform="translate(132 82) rotate(315)" />
      <rect className="pn" x="154" y="39" width="92" height="30" rx="8" />
      <text className="tm" x="200" y="59" {...mid}>view</text>
      <rect className="pa" x="250" y="135" width="92" height="30" rx="8" />
      <text className="tm" x="296" y="155" {...mid}>action</text>
      <rect className="pn" x="154" y="231" width="92" height="30" rx="8" />
      <text className="tm" x="200" y="251" {...mid}>reducer</text>
      <rect className="pn" x="58" y="135" width="92" height="30" rx="8" />
      <text className="tm" x="104" y="155" {...mid}>store</text>
      <text className="tm" x="200" y="155" {...mid}>dispatch()</text>
    </svg>
  );
}

function MapRoute() {
  return (
    <svg className="sv" viewBox="0 0 400 300" aria-hidden="true">
      <rect className="o" x="40" y="24" width="320" height="226" rx="8" />
      <path className="gr" d="M120 24V250M200 24V250M280 24V250M40 80H360M40 136H360M40 192H360" />
      <path className="o" d="M40 212C110 204 150 176 190 124S290 64 360 74" />
      <path className="ao dsh" d="M72 226C120 206 150 196 176 162S236 100 300 86" />
      <circle className="f" cx="72" cy="226" r="5" />
      <path className="a" d="M300 86C291 74 286 67 286 60a14 14 0 1 1 28 0c0 7-5 14-14 26z" />
      <circle className="bgf" cx="300" cy="60" r="5" />
      <text className="tm" x="40" y="278">-6.2088, 106.8456</text>
    </svg>
  );
}

function Chart() {
  const bars = [
    { x: 84, y: 170 },
    { x: 128, y: 140 },
    { x: 172, y: 185 },
    { x: 216, y: 110 },
    { x: 260, y: 150 },
  ];
  const points: [number, number][] = [
    [96, 150],
    [140, 120],
    [184, 165],
    [228, 92],
    [272, 130],
    [316, 58],
  ];
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun'];
  return (
    <svg className="sv" viewBox="0 0 400 300" aria-hidden="true">
      <path className="gr" d="M60 90H360M60 140H360M60 190H360" />
      <path className="o" d="M60 36V240H360" />
      {bars.map((b) => (
        <rect key={b.x} className="m" x={b.x} y={b.y} width="24" height={240 - b.y} rx="2" />
      ))}
      <rect className="a" x="304" y="78" width="24" height="162" rx="2" />
      <polyline className="o" points={points.map((p) => p.join(',')).join(' ')} />
      {points.map(([cx, cy]) => (
        <circle key={cx} className="pn" cx={cx} cy={cy} r="4" />
      ))}
      {months.map((m, i) => (
        <text key={m} className="tm" x={96 + i * 44} y="264" {...mid}>
          {m}
        </text>
      ))}
    </svg>
  );
}

function Pipeline() {
  const steps = [
    { x: 70, label: 'commit' },
    { x: 163, label: 'build' },
    { x: 256, label: 'test' },
  ];
  return (
    <svg className="sv" viewBox="0 0 400 300" aria-hidden="true">
      <path className="o" d="M90 96H143M183 96H236M276 96H329" />
      {steps.map((s) => (
        <g key={s.x}>
          <circle className="pn" cx={s.x} cy="96" r="20" />
          <circle className="f" cx={s.x} cy="96" r="4" />
          <text className="tm" x={s.x} y="140" {...mid}>
            {s.label}
          </text>
        </g>
      ))}
      <circle className="a" cx="349" cy="96" r="20" />
      <text className="tm" x="349" y="140" {...mid}>deploy</text>
      <path className="o dsh" d="M349 150V191H262" />
      {[180, 206, 232].map((y) => (
        <g key={y}>
          <rect className="pn" x="140" y={y} width="120" height="22" rx="4" />
          <circle className="f" cx="156" cy={y + 11} r="3" />
        </g>
      ))}
      <circle className="a" cx="244" cy="191" r="3" />
      <text className="tm" x="140" y="280">nginx · linux</text>
    </svg>
  );
}

function PenTool() {
  return (
    <svg className="sv" viewBox="0 0 400 300" aria-hidden="true">
      <text className="tm" x="50" y="38">frame · 1440 × 900</text>
      <rect className="o dsh" x="50" y="50" width="300" height="200" />
      <path className="hl" d="M90 210L140 90M310 110L250 250" />
      <path className="o thk" d="M90 210C140 90 250 250 310 110" />
      <circle className="f" cx="140" cy="90" r="4" />
      <circle className="f" cx="250" cy="250" r="4" />
      <rect className="pn" x="85" y="205" width="10" height="10" />
      <rect className="a" x="305" y="105" width="10" height="10" />
    </svg>
  );
}

export const skillArt = {
  tree: Tree,
  flow: DataFlow,
  map: MapRoute,
  chart: Chart,
  pipeline: Pipeline,
  pen: PenTool,
};

export type SkillArtKey = keyof typeof skillArt;
