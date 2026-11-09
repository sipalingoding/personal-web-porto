import { stackText } from '../data/stack';
import type { Project } from '../data/projects';

/** A schematic browser window labelled with the open project. Swap for a real screenshot later. */
export default function WorkPreview({ project }: { project: Project }) {
  return (
    <svg className="sv" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect className="pn" x="40" y="40" width="720" height="440" rx="10" />
      <path className="o" d="M40 80H760" />
      <circle className="m" cx="66" cy="60" r="5" />
      <circle className="m" cx="84" cy="60" r="5" />
      <circle className="m" cx="102" cy="60" r="5" />
      <rect className="o" x="290" y="50" width="220" height="20" rx="6" />
      <text className="tm" x="400" y="64" textAnchor="middle">
        {project.file}
      </text>
      <text className="tm" x="80" y="128">
        {project.type}
      </text>
      <text className="tt" x="77" y="190" fontSize="58" fontWeight="500" letterSpacing="-3">
        {project.name}
      </text>
      <text className="tm" x="80" y="226">
        {stackText(project.stack)}
      </text>
      <rect className="o" x="80" y="256" width="170" height="196" rx="8" />
      <rect className="m" x="100" y="280" width="96" height="8" rx="2" />
      <rect className="a" x="100" y="304" width="120" height="8" rx="2" />
      <rect className="m" x="100" y="328" width="84" height="8" rx="2" />
      <rect className="m" x="100" y="352" width="108" height="8" rx="2" />
      <rect className="o" x="270" y="256" width="216" height="88" rx="8" />
      <rect className="m" x="290" y="278" width="72" height="8" rx="2" />
      <rect className="f" x="290" y="302" width="140" height="14" rx="3" />
      <rect className="o" x="502" y="256" width="218" height="88" rx="8" />
      <rect className="m" x="522" y="278" width="88" height="8" rx="2" />
      <rect className="f" x="522" y="302" width="110" height="14" rx="3" />
      <rect className="o" x="270" y="360" width="450" height="92" rx="8" />
      <rect className="m" x="290" y="420" width="26" height="18" />
      <rect className="m" x="330" y="404" width="26" height="34" />
      <rect className="m" x="370" y="412" width="26" height="26" />
      <rect className="m" x="410" y="392" width="26" height="46" />
      <rect className="m" x="450" y="400" width="26" height="38" />
      <rect className="a" x="490" y="380" width="26" height="58" />
      <path className="gr" d="M540 380V438" />
      <rect className="m" x="560" y="414" width="120" height="8" rx="2" />
    </svg>
  );
}
