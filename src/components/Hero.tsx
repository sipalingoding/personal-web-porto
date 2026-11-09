import type { CSSProperties } from 'react';
import type { Stats } from '../data/content';
import type { Theme } from '../hooks/useTheme';
import { site } from '../data/site';
import { ArrowDown } from './Icons';

type Props = { theme: Theme; time: string; stats: Stats };

export default function Hero({ theme, time, stats }: Props) {
  const art = theme === 'light' ? '/images/halftone-light.webp' : '/images/halftone-dark.webp';

  return (
    <section id="top">
      <div className="wrap">
        <div>
          <div className="tags-row">
            <span className="pill">
              <i aria-hidden="true" />
              Frontend Engineer @ Bank Mandiri
            </span>
            <span className="pill">jakarta · {time}</span>
          </div>
          <h1>
            <span className="ln">Code.</span>
            <span className="ln">Craft.</span>
            <span className="ln mu">
              Deliver.
              <span className="caret" aria-hidden="true" />
            </span>
          </h1>
          <p className="sub">
            Frontend engineer with <b>4 years of experience</b> building modern web applications.
            Specialised in <b>React and Angular</b>, building scalable, performant interfaces with
            modern tools and best practices.
          </p>
          <div className="ctas">
            <a className="btn p" href={site.cv} download>
              Download CV
              <ArrowDown />
            </a>
            <a className="btn g" href="#work">
              View selected work
            </a>
          </div>
          <div className="stats">
            <div className="stat">
              <b>
                {stats.projectsDelivered}
                <em>+</em>
              </b>
              <span>Projects delivered</span>
            </div>
            <div className="stat">
              <b>
                4<em>+</em>
              </b>
              <span>Years in IT</span>
            </div>
            <div className="stat">
              <b>{stats.coreFrameworks}</b>
              <span>Core frameworks</span>
            </div>
          </div>
        </div>
        <figure className="fig">
          <span className="fname">salman.png</span>
          <div className="sel">
            <span className="pop" style={{ '--src': `url(${art})` } as CSSProperties}>
              <img src={art} alt="Halftone portrait of Salman" width={540} height={640} />
            </span>
            <span className="h h1" />
            <span className="h h2" />
            <span className="h h3" />
            <span className="h h4" />
            <span className="dim">540 × 640</span>
          </div>
          <figcaption>halftone · 10 px grid</figcaption>
        </figure>
      </div>
    </section>
  );
}
