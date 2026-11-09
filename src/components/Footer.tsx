import { navLinks, site } from '../data/site';
import { ArrowUp } from './Icons';
import { Logo } from './Nav';

export default function Footer({ time }: { time: string }) {
  return (
    <footer>
      <div className="wrap">
        <div className="fcols">
          <div className="about">
            <Logo />
            <p>Frontend engineer building for the web, from the Figma file to the deploy pipeline.</p>
            <a className="lnk" href={`mailto:${site.email}`}>
              {site.email}
            </a>
          </div>
          <div>
            <span className="ix">Sitemap</span>
            <ul>
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </div>
          <div>
            <span className="ix">Elsewhere</span>
            <ul>
              <li>
                <a href={site.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={site.instagram} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`}>Email</a>
              </li>
              <li>
                <a href={site.cv} download>
                  CV
                </a>
              </li>
            </ul>
          </div>
          <div>
            <span className="ix">Based</span>
            <ul>
              <li className="s">Jakarta, Indonesia</li>
              <li className="s">{time}</li>
              <li className="s">Bahasa Indonesia, English</li>
            </ul>
          </div>
        </div>
        <div className="fbar">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span>Code. Craft. Deliver.</span>
          <a className="up" href="#top">
            Back to top
            <ArrowUp />
          </a>
        </div>
        <span className="giant" aria-hidden="true">
          Salman Faris<span>.</span>
        </span>
      </div>
    </footer>
  );
}
