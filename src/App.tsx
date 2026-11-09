import Nav from './components/Nav';
import Hero from './components/Hero';
import Partners from './components/Partners';
import Work from './components/Work';
import Skills from './components/Skills';
import Experience from './components/Experience';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { useContent } from './data/useContent';
import { useTheme } from './hooks/useTheme';
import { useJakartaClock } from './hooks/useJakartaClock';

export default function App() {
  const { theme, toggle } = useTheme();
  const time = useJakartaClock();
  const content = useContent();

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Nav theme={theme} onToggleTheme={toggle} />
      <main id="main">
        <Hero theme={theme} time={time} stats={content.stats} />
        <Partners partners={content.partners} />
        <Work projects={content.projects} />
        <Skills />
        <Experience items={content.experience} />
        <About />
        <Contact />
      </main>
      <Footer time={time} />
    </>
  );
}
