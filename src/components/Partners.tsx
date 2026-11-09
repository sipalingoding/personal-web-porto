import type { Partner } from '../data/content';
import PartnerMark from './PartnerMark';

export default function Partners({ partners }: { partners: Partner[] }) {
  if (partners.length === 0) return null;

  // The track is the list repeated four times; the CSS animation slides it by half,
  // so the loop is seamless as long as each half is wider than the viewport.
  const loop = Array.from({ length: 4 }, () => partners).flat();

  return (
    <section id="partners" aria-label="Partners">
      <div className="wrap">
        <span className="ix">Worked with</span>
        <ul className="sr-only">
          {partners.map((p) => (
            <li key={p.name}>{p.name}</li>
          ))}
        </ul>
        <div className="mq" aria-hidden="true">
          <div className="track">
            {loop.map((p, i) => (
              <span className="pname" key={i}>
                <PartnerMark partner={p} />
                <i>+</i>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
