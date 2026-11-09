import type { Theme } from '../hooks/useTheme';
import { navLinks } from '../data/site';
import { Moon, Sun } from './Icons';

type Props = { theme: Theme; onToggleTheme: () => void };

export function Logo() {
  return (
    <a href="#top" className="logo" aria-label="Salman Faris Siddiq, home">
      <span className="mk" aria-hidden="true">
        SF
      </span>
      salman
    </a>
  );
}

export default function Nav({ theme, onToggleTheme }: Props) {
  return (
    <header className="nav">
      <div className="wrap">
        <Logo />
        <nav aria-label="Main">
          <ul>
            {navLinks.map((l) => (
              <li className="dk" key={l.href}>
                <a className="u" href={l.href}>
                  <span className="n">{l.n}</span>
                  {l.label}
                </a>
              </li>
            ))}
            <li className="acts">
              <a className="btn p" href="#contact">
                Contact
              </a>
              <button
                className="tgl"
                type="button"
                aria-label="Light theme"
                aria-pressed={theme === 'light'}
                onClick={onToggleTheme}
              >
                <Sun />
                <Moon />
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
