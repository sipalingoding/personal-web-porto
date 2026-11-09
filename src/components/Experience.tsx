import type { Experience as ExperienceItem } from '../data/experience';
import { site } from '../data/site';
import { ArrowDown } from './Icons';

export default function Experience({ items }: { items: ExperienceItem[] }) {
  return (
    <section id="experience">
      <div className="wrap">
        <div className="lft">
          <span className="ix">
            <b>03/</b> Experience
          </span>
          <h2 className="hd">
            <span className="ln">Four years in.</span>
            <span className="ln mu">Still shipping.</span>
          </h2>
          <p className="lead">
            Most of my work is at Bank Mandiri, building the tools appraisers and operations teams
            use. Alongside it, I take on freelance builds for culture, government and private
            clients.
          </p>
          <a className="btn p" href={site.cv} download>
            Download CV
            <ArrowDown />
          </a>
        </div>

        <ol className="tline">
          {items.map((e) => (
            <li className={e.current ? 'it now' : 'it'} key={`${e.period}-${e.title}`}>
              <span className="when">{e.place ? `${e.period} · ${e.place}` : e.period}</span>
              <h3>{e.title}</h3>
              <p className="org">{e.org}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
