import { site } from '../data/site';
import { ArrowDown, ArrowUpRight } from './Icons';
import Lanyard from './Lanyard';

const facts = [
  { k: 'Based', v: 'Jakarta, Indonesia' },
  { k: 'Currently', v: 'Frontend Engineer, Bank Mandiri' },
  { k: 'Education', v: 'D3 Civil Engineering, Politeknik Negeri Bandung' },
  { k: 'Born', v: '27 May 1998' },
];

export default function About() {
  return (
    <section id="about">
      <div className="wrap">
        <div className="pcard">
          <Lanyard
            fields={[
              { label: 'Name', value: 'Salman Faris Siddiq' },
              { label: 'Role', value: 'Frontend Engineer' },
              { label: 'Company', value: 'Bank Mandiri' },
            ]}
            strapText="salman faris siddiq"
          />
          <span className="lbl">Drag the card</span>
        </div>
        <div>
          <span className="ix">
            <b>04/</b> About
          </span>
          <p className="big">
            I'm Salman, a frontend engineer in Jakarta. I build web apps for enterprise and
            banking.{' '}
            <span className="mu">
              I take a design from Figma to deployment, with the API work and the CI/CD in between.
            </span>
          </p>
          <dl className="facts">
            {facts.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>
          <div className="links">
            <a className="lnk" href={site.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
              <ArrowUpRight />
            </a>
            <a className="lnk" href={site.instagram} target="_blank" rel="noreferrer">
              Instagram
              <ArrowUpRight />
            </a>
            <a className="lnk" href={site.cv} download>
              Download CV
              <ArrowDown />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
