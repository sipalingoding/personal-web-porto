import { skillArt, type SkillArtKey } from './SkillArt';

type Skill = {
  group: string;
  title: string;
  desc: string;
  tools: string[];
  art: SkillArtKey;
};

const skills: Skill[] = [
  {
    group: 'Frontend',
    title: 'Interfaces',
    desc: 'Built from reusable components, sized for real screens.',
    tools: ['react', 'angular', 'next.js', 'html · css'],
    art: 'tree',
  },
  {
    group: 'Frontend',
    title: 'State and UI kits',
    desc: 'Predictable state and consistent component libraries.',
    tools: ['redux', 'tailwind', 'ant design', 'angular material'],
    art: 'flow',
  },
  {
    group: 'Data',
    title: 'Maps and APIs',
    desc: 'REST endpoints and the Google Maps API, wired into field workflows.',
    tools: ['rest', 'google maps api'],
    art: 'map',
  },
  {
    group: 'Data',
    title: 'Dashboards',
    desc: 'Charts and reporting views people check every day.',
    tools: ['apexcharts'],
    art: 'chart',
  },
  {
    group: 'Delivery',
    title: 'CI/CD and servers',
    desc: 'Pipelines that build, test and deploy to the servers I set up.',
    tools: ['git', 'jenkins', 'nginx', 'linux'],
    art: 'pipeline',
  },
  {
    group: 'Design',
    title: 'Figma to code',
    desc: 'From the design file to a working, deployed screen.',
    tools: ['figma', 'vs code'],
    art: 'pen',
  },
];

export default function Skills() {
  return (
    <section id="skills">
      <div className="wrap">
        <div className="shd">
          <div>
            <span className="ix">
              <b>02/</b> Skills
            </span>
            <h2 className="hd">
              <span className="ln">Six things</span>
              <span className="ln mu">I build with.</span>
            </h2>
          </div>
          <p>
            Interfaces in React and Angular, the data and APIs behind them, the pipeline that ships
            them, and the Figma file they start from.
          </p>
        </div>
        <div className="cards">
          {skills.map((s, i) => {
            const Art = skillArt[s.art];
            return (
              <article className="card" key={s.title}>
                <div className="hdr">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="grp">{s.group}</span>
                </div>
                <div className="art">
                  <Art />
                </div>
                <div className="tx">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <ul className="chips" aria-label={`${s.title} tools`}>
                    {s.tools.map((t) => (
                      <li className="chip" key={t}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
