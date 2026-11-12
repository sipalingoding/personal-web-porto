import { useId, type ReactNode } from 'react';
import { useDaysLeft } from './IsoHouse';
import type { RoomKey } from './isoScene';

/*
 * Each room seen from inside, standing in it and facing its far wall: the picture at the
 * top of a room's page. Flat shapes in a frame from x = -140 to 1100 (wall above y = 300,
 * floor below), coloured by class so they follow the light and dark theme, like the house.
 * The strip on the left has the door back to the house; on the right hangs the lamp that
 * switches the theme. The page puts buttons over both (see POV_DOOR, POV_LAMP).
 */

const FLOOR = 300;
const VB = { x: -140, w: 1240, h: 400 };

/** Door and lamp as boxes in percent of the picture, for the buttons laid over them. */
const pct = (x0: number, y0: number, x1: number, y1: number) => ({
  x: ((x0 + x1) / 2 - VB.x) / VB.w * 100,
  y: (y0 + y1) / 2 / VB.h * 100,
  w: (x1 - x0) / VB.w * 100,
  h: (y1 - y0) / VB.h * 100,
});
export const POV_DOOR = pct(-116, 92, -24, 300);
export const POV_LAMP = pct(990, 0, 1070, 120);

/** The door in the left wall strip, shut, with a mat in front of it. */
function Door() {
  return (
    <g>
      <rect className="p-white" x="-116" y="92" width="92" height="208" rx="4" />
      <rect className="p-door" x="-108" y="100" width="76" height="200" rx="2" />
      <rect className="p-doorpanel" x="-100" y="110" width="26" height="80" rx="2" />
      <rect className="p-doorpanel" x="-66" y="110" width="26" height="80" rx="2" />
      <rect className="p-doorpanel" x="-100" y="202" width="26" height="88" rx="2" />
      <rect className="p-doorpanel" x="-66" y="202" width="26" height="88" rx="2" />
      <rect className="p-knob" x="-50" y="194" width="14" height="5" rx="2.5" />
      <ellipse className="p-doormat" cx="-70" cy="312" rx="56" ry="8" />
    </g>
  );
}

/** A pendant lamp on the right: lit in the light theme, off in the dark one. */
function Lamp({ glow }: { glow: string }) {
  return (
    <g>
      <ellipse className="p-lampglow" fill={glow} cx="1030" cy="230" rx="150" ry="150" />
      <rect className="p-metal" x="1029" y="0" width="2" height="72" />
      <circle className="p-bulb" cx="1030" cy="106" r="9" />
      <path className="p-lampshade" d="M992 108q0-38 38-38t38 38z" />
    </g>
  );
}

/** Wall, floor with planks and the skirting board, then the room's own things. */
function Frame({ label, children }: { label: string; children: (ids: Ids) => ReactNode }) {
  const id = useId().replace(/:/g, '');
  const ids = { screen: `url(#${id}-s)`, glow: `url(#${id}-g)` };
  return (
    <svg className="pov" viewBox={`${VB.x} 0 ${VB.w} ${VB.h}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a63c9" />
          <stop offset="1" stopColor="#1b2a52" />
        </linearGradient>
        <radialGradient id={`${id}-g`}>
          <stop offset="0" stopColor="#ffc94a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffc94a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect className="p-wall" x={VB.x} width={VB.w} height={FLOOR} />
      <rect className="p-floor" x={VB.x} y={FLOOR} width={VB.w} height="100" />
      {[318, 340, 366, 396].map((y) => (
        <rect key={y} className="p-plank" x={VB.x} y={y} width={VB.w} height="1.5" />
      ))}
      <rect className="p-skirt" x={VB.x} y={FLOOR - 8} width={VB.w} height="8" />
      <Door />
      {children(ids)}
      <Lamp glow={ids.glow} />
    </svg>
  );
}

type Ids = { screen: string; glow: string };

function Window({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect className="p-white" x={x - 8} y={y - 8} width={w + 16} height={h + 16} rx="4" />
      <rect className="p-glass" x={x} y={y} width={w} height={h} rx="2" />
      <rect className="p-white" x={x + w / 2 - 3} y={y} width="6" height={h} />
      <rect className="p-white" x={x} y={y + h / 2 - 3} width={w} height="6" />
      <rect className="p-trim" x={x - 14} y={y + h + 8} width={w + 28} height="7" rx="3" />
    </g>
  );
}

function Plant({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${FLOOR}) scale(${s})`}>
      <ellipse className="p-shadow" cx="0" cy="0" rx="34" ry="6" />
      <circle className="p-leaf" cx="-14" cy="-64" r="20" />
      <circle className="p-leaf2" cx="14" cy="-72" r="18" />
      <circle className="p-leaf3" cx="0" cy="-92" r="16" />
      <circle className="p-leaf" cx="4" cy="-58" r="14" />
      <path className="p-pot" d="M-22 -46h44l-6 46h-32z" />
    </g>
  );
}

function Rug({ x, w }: { x: number; w: number }) {
  return <ellipse className="p-rug" cx={x} cy="340" rx={w / 2} ry="30" />;
}

/* ------------------------------------------------------------------ work */

function Countdown({ x, y, screen }: { x: number; y: number; screen: string }) {
  const { days, year } = useDaysLeft();
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="p-white" x="-6" y="-6" width="212" height="112" rx="8" />
      <rect fill={screen} width="200" height="100" rx="4" />
      <text className="p-cap" x="18" y="28">
        {days === 0 ? `AKHIR ${year}` : `MENUJU ${year + 1}`}
      </text>
      {days === 0 ? (
        <text className="p-num" x="18" y="74" style={{ fontSize: 26 }}>
          Hari terakhir
        </text>
      ) : (
        <>
          <text className="p-num" x="18" y="80">
            {days}
          </text>
          <text className="p-tx" x={26 + String(days).length * 27} y="78">
            hari lagi
          </text>
        </>
      )}
    </g>
  );
}

function WorkPov() {
  return (
    <Frame label="Ruang kerja dilihat dari depan: meja dengan monitor dan laptop, papan kanban dan layar hitung mundur di dinding">
      {(ids) => (
        <g>
          <Window x={56} y={60} w={150} h={130} />
          {/* Kanban board: three columns of sticky notes. */}
          <rect className="p-trim" x="252" y="42" width="216" height="140" rx="6" />
          <rect className="p-white" x="258" y="48" width="204" height="128" rx="4" />
          {[0, 1, 2].map((c) => (
            <g key={c}>
              <rect className="p-trim" x={268 + c * 66} y="58" width="54" height="5" rx="2.5" />
              {Array.from({ length: 3 - c }, (_, r) => (
                <rect key={r} className={['p-note', 'p-note2', 'p-note3'][c]} x={268 + c * 66} y={72 + r * 32} width="54" height="26" rx="3" />
              ))}
            </g>
          ))}
          <Countdown x={690} y={56} screen={ids.screen} />
          {/* Desk with a drawer unit. */}
          <ellipse className="p-shadow" cx="500" cy={FLOOR} rx="230" ry="10" />
          <rect className="p-metal" x="318" y="222" width="10" height="78" />
          <rect className="p-cab" x="588" y="222" width="96" height="78" rx="3" />
          <rect className="p-trim" x="598" y="248" width="76" height="2" />
          <rect className="p-trim" x="598" y="274" width="76" height="2" />
          <rect className="p-desk" x="296" y="208" width="408" height="14" rx="4" />
          {/* Monitor and laptop. */}
          <rect className="p-metal" x="484" y="196" width="14" height="14" />
          <rect className="p-metal" x="458" y="206" width="66" height="5" rx="2.5" />
          <rect className="p-dark" x="404" y="104" width="174" height="96" rx="6" />
          <rect fill={ids.screen} x="410" y="110" width="162" height="84" rx="3" />
          <rect className="p-code" x="424" y="126" width="64" height="5" rx="2.5" />
          <rect className="p-code2" x="424" y="140" width="96" height="5" rx="2.5" />
          <rect className="p-code" x="436" y="154" width="70" height="5" rx="2.5" />
          <rect className="p-code2" x="436" y="168" width="44" height="5" rx="2.5" />
          <rect className="p-laptop" x="326" y="150" width="70" height="54" rx="4" />
          <rect fill={ids.screen} x="331" y="155" width="60" height="44" rx="2" />
          <rect className="p-laptop" x="318" y="203" width="86" height="6" rx="3" />
          <rect className="p-mug" x="602" y="186" width="16" height="22" rx="3" />
          <path className="p-pot" d="M638 186h28l-4 22h-20z" />
          <circle className="p-leaf" cx="646" cy="174" r="10" />
          <circle className="p-leaf2" cx="658" cy="168" r="9" />
          {/* The chair in front of the desk, seen from behind. */}
          <rect className="p-chair" x="448" y="208" width="104" height="70" rx="18" />
          <rect className="p-metal" x="494" y="276" width="12" height="16" />
          <rect className="p-metal" x="452" y="290" width="96" height="6" rx="3" />
          <circle className="p-dark" cx="458" cy="298" r="5" />
          <circle className="p-dark" cx="542" cy="298" r="5" />
          <Plant x={900} s={1.1} />
        </g>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ books */

const bookColours = ['p-bk1', 'p-bk2', 'p-bk3', 'p-bk4', 'p-bk5'];

function Shelf({ x, w }: { x: number; w: number }) {
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const rows = [52, 116, 180, 244];
  return (
    <g>
      <ellipse className="p-shadow" cx={x + w / 2} cy={FLOOR} rx={w / 2 + 10} ry="8" />
      <rect className="p-shelf" x={x} y="26" width={w} height={FLOOR - 26} rx="4" />
      {rows.map((top) => {
        const books: ReactNode[] = [];
        let bx = x + 16;
        while (bx < x + w - 24) {
          const bw = 12 + rnd() * 10;
          const bh = 38 + rnd() * 18;
          books.push(<rect key={bx} className={bookColours[Math.floor(rnd() * 5)]} x={bx} y={top + 58 - bh} width={bw} height={bh} rx="2" />);
          bx += bw + 2 + (rnd() < 0.12 ? 18 : 0);
        }
        return (
          <g key={top}>
            <rect className="p-shelfin" x={x + 10} y={top - 4} width={w - 20} height="62" />
            {books}
            <rect className="p-shelfedge" x={x + 6} y={top + 58} width={w - 12} height="6" />
          </g>
        );
      })}
    </g>
  );
}

function BooksPov() {
  return (
    <Frame label="Ruang baca dilihat dari depan: rak buku besar, kursi santai, lampu berdiri dan jendela">
      {(ids) => (
        <>
          <Shelf x={96} w={420} />
          <Window x={606} y={60} w={150} h={130} />
          <Rug x={700} w={340} />
          <ellipse fill={ids.glow} cx="860" cy="250" rx="150" ry="110" />
          {/* Floor lamp. */}
          <ellipse className="p-metal" cx="868" cy="297" rx="26" ry="5" />
          <rect className="p-metal" x="865" y="108" width="6" height="190" />
          <path className="p-shade" d="M838 78h60l14 44h-88z" />
          {/* Side table with a mug and books. */}
          <rect className="p-metal" x="560" y="242" width="6" height="56" />
          <ellipse className="p-wood" cx="563" cy="242" rx="34" ry="7" />
          <rect className="p-bk2" x="540" y="226" width="34" height="8" rx="2" />
          <rect className="p-bk3" x="544" y="218" width="28" height="8" rx="2" />
          <rect className="p-mug" x="578" y="220" width="12" height="16" rx="2" />
          {/* Armchair facing us. */}
          <ellipse className="p-shadow" cx="710" cy={FLOOR} rx="120" ry="8" />
          <rect className="p-sofa" x="628" y="150" width="164" height="110" rx="26" />
          <rect className="p-cushion" x="646" y="232" width="128" height="34" rx="12" />
          <rect className="p-sofa2" x="604" y="200" width="44" height="92" rx="16" />
          <rect className="p-sofa2" x="772" y="200" width="44" height="92" rx="16" />
          <rect className="p-wood2" x="626" y="290" width="8" height="10" />
          <rect className="p-wood2" x="786" y="290" width="8" height="10" />
          <rect className="p-bk1" x="690" y="236" width="40" height="8" rx="2" />
        </>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ music */

function GuitarFront({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className="p-guitar2" x="-12" y="-196" width="24" height="26" rx="5" />
      <rect className="p-neck" x="-7" y="-172" width="14" height="112" />
      <circle className="p-guitar" cx="0" cy="-58" r="30" />
      <circle className="p-guitar" cx="0" cy="-8" r="42" />
      <circle className="p-hole" cx="0" cy="-40" r="11" />
      <rect className="p-guitar2" x="-16" y="4" width="32" height="7" rx="3" />
      {[-4, 0, 4].map((dx) => (
        <rect key={dx} className="p-string" x={dx - 0.5} y="-172" width="1" height="180" />
      ))}
    </g>
  );
}

function MusicPov() {
  return (
    <Frame label="Ruang musik dilihat dari depan: piringan hitam dan poster di dinding, amplifier, gitar di stand, stool dan speaker">
      {() => (
        <>
          {[[200, 104], [296, 84], [392, 104]].map(([cx, cy]) => (
            <g key={cx}>
              <circle className="p-record" cx={cx} cy={cy} r="38" />
              <circle className="p-groove" cx={cx} cy={cy} r="27" />
              <circle className="p-label" cx={cx} cy={cy} r="12" />
            </g>
          ))}
          <rect className="p-poster" x="660" y="40" width="120" height="160" rx="4" />
          <circle className="p-purple" cx="720" cy="104" r="34" />
          <rect className="p-white" x="684" y="160" width="72" height="8" rx="4" />
          <rect className="p-white" x="696" y="176" width="48" height="6" rx="3" />
          <Rug x={520} w={420} />
          {/* Amp. */}
          <ellipse className="p-shadow" cx="160" cy={FLOOR} rx="90" ry="8" />
          <rect className="p-amp" x="84" y="190" width="152" height="110" rx="8" />
          <rect className="p-ampface" x="96" y="200" width="128" height="18" rx="3" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} className="p-knob" cx={110 + i * 24} cy="209" r="4.5" />
          ))}
          <rect className="p-grille" x="96" y="226" width="128" height="64" rx="4" />
          {/* Guitar on its stand. */}
          <path className="p-metal-line" d="M490 300l30-60 30 60M520 240v-20" />
          <GuitarFront x={520} y={262} />
          {/* Stool. */}
          <path className="p-metal-line" d="M664 300l14-74M736 300l-14-74" />
          <ellipse className="p-stool" cx="700" cy="222" rx="44" ry="10" />
          {/* Speaker. */}
          <ellipse className="p-shadow" cx="860" cy={FLOOR} rx="56" ry="7" />
          <rect className="p-amp" x="812" y="134" width="96" height="166" rx="8" />
          <circle className="p-grille" cx="860" cy="246" r="34" />
          <circle className="p-knob" cx="860" cy="246" r="12" />
          <circle className="p-grille" cx="860" cy="172" r="20" />
        </>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ tv */

function TvPov() {
  return (
    <Frame label="Ruang TV dilihat dari belakang sofa: TV di atas bufet, tanaman, dan meja kopi">
      {(ids) => (
        <>
          <Window x={56} y={60} w={130} h={130} />
          <rect className="p-white" x="804" y="56" width="104" height="80" rx="4" />
          <rect className="p-bk4" x="812" y="64" width="88" height="64" rx="2" />
          <circle className="p-white" cx="836" cy="88" r="10" />
          <path className="p-leaf" d="M812 128l30-34 22 22 14-12 22 24z" />
          {/* Console with the TV on it. */}
          <ellipse className="p-shadow" cx="480" cy={FLOOR} rx="240" ry="9" />
          <rect className="p-wood" x="250" y="232" width="460" height="60" rx="6" />
          <rect className="p-wood2" x="400" y="240" width="2" height="44" />
          <rect className="p-wood2" x="558" y="240" width="2" height="44" />
          <rect className="p-wood2" x="262" y="292" width="8" height="8" />
          <rect className="p-wood2" x="690" y="292" width="8" height="8" />
          <rect className="p-metal" x="472" y="212" width="16" height="20" />
          <rect className="p-metal" x="436" y="226" width="88" height="6" rx="3" />
          <rect className="p-dark" x="290" y="56" width="380" height="160" rx="8" />
          <rect fill={ids.screen} x="298" y="64" width="364" height="144" rx="4" />
          <path className="p-play" d="M466 112v48l40-24z" />
          <rect className="p-playbar" x="318" y="188" width="324" height="4" rx="2" />
          <rect className="p-play" x="318" y="188" width="110" height="4" rx="2" />
          <path className="p-pot" d="M268 200h32l-5 32h-22z" />
          <circle className="p-leaf" cx="276" cy="186" r="14" />
          <circle className="p-leaf2" cx="292" cy="178" r="12" />
          <rect className="p-amp" x="640" y="196" width="40" height="36" rx="4" />
          <Plant x={810} s={1.05} />
          {/* Coffee table and, in front of us, the back of the sofa. */}
          <rect className="p-wood" x="372" y="304" width="216" height="12" rx="4" />
          <ellipse className="p-bowl" cx="430" cy="300" rx="22" ry="7" />
          <rect className="p-sofa" x="120" y="336" width="720" height="80" rx="28" />
          <rect className="p-sofa2" x="96" y="320" width="76" height="96" rx="24" />
          <rect className="p-sofa2" x="788" y="320" width="76" height="96" rx="24" />
        </>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ links */

function LinksPov() {
  const cards = ['p-card1', 'p-card2', 'p-card3', 'p-card4', 'p-card2', 'p-card1', 'p-card3', 'p-card4'];
  const pos = cards.map((_, i) => [250 + (i % 4) * 118 + (i >= 4 ? 18 : 0), 70 + Math.floor(i / 4) * 92 + (i % 2 ? 8 : 0)]);
  return (
    <Frame label="Ruang lampiran dilihat dari depan: papan gabus penuh kartu link yang disambung benang, lemari arsip dan kardus">
      {() => (
        <>
          <rect className="p-boardframe" x="214" y="36" width="532" height="232" rx="8" />
          <rect className="p-cork" x="224" y="46" width="512" height="212" rx="4" />
          {cards.map((c, i) => {
            const [x, y] = pos[i];
            return (
              <g key={i}>
                <rect className="p-white" x={x} y={y} width="88" height="66" rx="4" />
                <rect className={c} x={x + 8} y={y + 10} width="22" height="22" rx="4" />
                <rect className="p-trim" x={x + 36} y={y + 13} width="42" height="4" rx="2" />
                <rect className="p-trim" x={x + 36} y={y + 24} width="28" height="4" rx="2" />
                <rect className="p-trim" x={x + 8} y={y + 44} width="70" height="4" rx="2" />
              </g>
            );
          })}
          <path className="p-string" d={`M${pos[0][0] + 44} ${pos[0][1]}L${pos[5][0] + 44} ${pos[5][1]}L${pos[2][0] + 44} ${pos[2][1]}L${pos[7][0] + 44} ${pos[7][1]}`} />
          <path className="p-string" d={`M${pos[4][0] + 44} ${pos[4][1]}L${pos[1][0] + 44} ${pos[1][1]}L${pos[6][0] + 44} ${pos[6][1]}L${pos[3][0] + 44} ${pos[3][1]}`} />
          {pos.map(([x, y], i) => (
            <circle key={i} className="p-pin" cx={x + 44} cy={y} r="5" />
          ))}
          {/* Archive boxes and a filing cabinet. */}
          <ellipse className="p-shadow" cx="120" cy={FLOOR} rx="80" ry="7" />
          <rect className="p-carton" x="52" y="226" width="136" height="74" rx="4" />
          <rect className="p-carton2" x="66" y="170" width="108" height="58" rx="4" />
          <rect className="p-cartonline" x="104" y="250" width="32" height="8" rx="3" />
          <rect className="p-cartonline" x="104" y="190" width="32" height="8" rx="3" />
          <ellipse className="p-shadow" cx="850" cy={FLOOR} rx="70" ry="7" />
          <rect className="p-cab" x="790" y="120" width="120" height="180" rx="6" />
          {[150, 210, 270].map((y) => (
            <g key={y}>
              <rect className="p-trim" x="798" y={y + 22} width="104" height="2" />
              <rect className="p-metal" x="834" y={y - 6} width="32" height="7" rx="3" />
            </g>
          ))}
          <rect className="p-bk1" x="804" y="104" width="64" height="16" rx="3" />
          <rect className="p-bk2" x="812" y="92" width="52" height="12" rx="3" />
        </>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ run */

/** A running shoe from the side, toe to the right, sitting on y. */
function Shoe({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className={c} d="M0 -6V-28q0-6 6-6h12q4 0 6 4l6 10q14 4 26 8q10 3 10 10v6z" />
      <rect className="p-sole" x="-2" y="-8" width="70" height="8" rx="4" />
      <path className="p-white" d="M26 -24l4 6M32 -22l4 6M38 -20l4 6" style={{ stroke: '#fff', strokeWidth: 2 }} />
    </g>
  );
}

function RunPov() {
  const colours = ['p-orange', 'p-blue', 'p-pink', 'p-lime', 'p-orange', 'p-blue'];
  return (
    <Frame label="Ruang sepatu dilihat dari depan: rak sepatu lari, medali di dinding dan treadmill">
      {() => (
        <>
          {/* Medals hanging from a bar. */}
          <rect className="p-wood2" x="560" y="40" width="240" height="8" rx="4" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path className={['p-blue', 'p-pink', 'p-lime', 'p-orange'][i]} d={`M${584 + i * 56} 48l10 44h8l10-44z`} />
              <circle className="p-gold" cx={600 + i * 56} cy="104" r="15" />
              <circle className="p-gold2" cx={600 + i * 56} cy="104" r="8" />
            </g>
          ))}
          {/* Shoe rack. */}
          <ellipse className="p-shadow" cx="230" cy={FLOOR} rx="170" ry="8" />
          <rect className="p-shelf" x="70" y="110" width="320" height="190" rx="5" />
          {[166, 228, 290].map((y, r) => (
            <g key={y}>
              <rect className="p-shelfin" x="80" y={y - 50} width="300" height="50" />
              <Shoe x={92} y={y} c={colours[r * 2]} />
              <Shoe x={230} y={y} c={colours[r * 2 + 1]} />
              <rect className="p-shelfedge" x="76" y={y} width="308" height="6" />
            </g>
          ))}
          <Shoe x={160} y={110} c="p-blue" />
          {/* Treadmill from the side, console on the right. */}
          <ellipse className="p-shadow" cx="700" cy={FLOOR} rx="200" ry="9" />
          <rect className="p-amp" x="500" y="264" width="380" height="30" rx="12" />
          <rect className="p-dark" x="520" y="258" width="320" height="10" rx="5" />
          <path className="p-metal-line thick" d="M846 264L874 140M800 164h80" />
          <rect className="p-amp" x="842" y="118" width="70" height="30" rx="8" />
          <rect className="p-display" x="852" y="124" width="50" height="16" rx="3" />
          <rect className="p-bottle" x="452" y="250" width="22" height="50" rx="8" />
          <rect className="p-blue" x="455" y="240" width="16" height="12" rx="4" />
        </>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ prayer */

function PrayPov() {
  return (
    <Frame label="Ruang ibadah dilihat dari depan: mihrab di dinding kiblat, sajadah, kaligrafi, rehal dengan Al-Qur'an dan lentera">
      {(ids) => (
        <>
          {/* Calligraphy either side of the mihrab. */}
          {[196, 644].map((x) => (
            <g key={x}>
              <rect className="p-boardframe" x={x} y="78" width="124" height="110" rx="6" />
              <rect className="p-callig" x={x + 7} y="85" width="110" height="96" rx="3" />
              {/* A crescent and a star. */}
              <circle className="p-gold" cx={x + 56} cy="133" r="30" />
              <circle className="p-callig" cx={x + 68} cy="126" r="26" />
              <path className="p-gold" d={`M${x + 86} 112l3.5 7.5 8 1-6 5.5 1.6 8-7.1-4-7.1 4 1.6-8-6-5.5 8-1z`} />
            </g>
          ))}
          {/* The mihrab: an arched niche in the qibla wall, a lamp hanging in it. */}
          <path className="p-mihrab" d="M404 300V156q0-84 76-100 76 16 76 100v144z" />
          <path className="p-mihrab2" d="M424 300V164q0-68 56-82 56 14 56 82v136z" />
          <rect className="p-gold" x="479" y="82" width="2" height="34" />
          <path className="p-gold" d="M468 116h24l-4 26h-16z" />
          <ellipse fill={ids.glow} cx="480" cy="150" rx="60" ry="60" />
          {/* The prayer mat on the floor in front of it, its arch toward the qibla. */}
          <path className="p-sajadah" d="M418 302h124l34 92H384z" />
          <path className="p-sajadah2" d="M426 308h108l28 80H398z" />
          <path className="p-sajadah" d="M434 314h92l22 68H412z" />
          <path className="p-gold" d="M456 336v-12q24-14 48 0v12z" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} className="p-gold" x={424 + i * 26} y="372" width="10" height="4" rx="2" />
          ))}
          {/* The Qur'an open on its stand. */}
          <path className="p-metal-line wood" d="M610 300l40-52M650 300l-40-52" />
          <path className="p-quran" d="M600 252l30 8 30-8v-8l-30 8-30-8z" />
          <path className="p-white" d="M604 246l26 7 26-7v-4l-26 7-26-7z" />
          {/* A low shelf with books, a lantern and a plant. */}
          <ellipse className="p-shadow" cx="120" cy={FLOOR} rx="70" ry="7" />
          <rect className="p-shelf" x="60" y="220" width="124" height="80" rx="4" />
          <rect className="p-shelfin" x="68" y="232" width="108" height="26" />
          <rect className="p-quran" x="74" y="236" width="12" height="22" rx="2" />
          <rect className="p-bk2" x="88" y="240" width="10" height="18" rx="2" />
          <rect className="p-quran" x="100" y="238" width="11" height="20" rx="2" />
          <rect className="p-white" x="120" y="246" width="40" height="12" rx="3" />
          <ellipse fill={ids.glow} cx="820" cy="250" rx="70" ry="70" />
          <rect className="p-gold" x="800" y="296" width="40" height="5" rx="2" />
          <rect className="p-lantern" x="804" y="236" width="32" height="60" rx="3" />
          <path className="p-gold" d="M800 236h40l-8-14h-24z" />
          <rect className="p-gold" x="818" y="208" width="4" height="14" />
          <Plant x={910} s={1.05} />
        </>
      )}
    </Frame>
  );
}

/* ------------------------------------------------------------------ vocabulary */

const words: [string, string][] = [
  ['curious', 'penasaran'],
  ['brave', 'berani'],
  ['journey', 'perjalanan'],
  ['grateful', 'bersyukur'],
];

function VocabPov() {
  const flags = ['p-orange', 'p-blue', 'p-lime', 'p-pink', 'p-gold', 'p-orange', 'p-blue', 'p-lime'];
  return (
    <Frame label="Ruang vocabulary dilihat dari depan: papan tulis berisi kosakata bahasa Inggris dan artinya, bendera huruf, meja belajar dengan kamus dan globe, balok huruf">
      {() => (
        <>
          {/* Alphabet bunting along the top of the wall. */}
          <path className="p-metal-line string" d="M150 30q330 40 660 0" />
          {flags.map((c, i) => {
            const x = 190 + i * 76;
            const y = 34 + Math.sin(((i + 0.5) / flags.length) * Math.PI) * 18;
            return (
              <g key={i}>
                <path className={c} d={`M${x - 22} ${y}h44l-22 38z`} />
                <text className="p-flag" x={x} y={y + 20}>
                  {'ABCDEFGH'[i]}
                </text>
              </g>
            );
          })}
          {/* The chalkboard. */}
          <rect className="p-boardframe" x="224" y="84" width="512" height="190" rx="8" />
          <rect className="p-chalkboard" x="234" y="94" width="492" height="170" rx="4" />
          <text className="p-chalk title" x="260" y="132">
            Vocabulary
          </text>
          <rect className="p-chalk-line" x="260" y="142" width="132" height="2.5" rx="1.25" />
          {words.map(([en, id], i) => (
            <text key={en} className="p-chalk" x={i < 2 ? 260 : 486} y={184 + (i % 2) * 40}>
              {en}
              <tspan className="p-chalk-id"> · {id}</tspan>
            </text>
          ))}
          <rect className="p-boardframe" x="216" y="270" width="528" height="10" rx="4" />
          <rect className="p-white" x="620" y="263" width="26" height="7" rx="3" />
          <rect className="p-gold2" x="652" y="263" width="18" height="7" rx="3" />
          {/* Study desk with a dictionary, flashcards and a globe. */}
          <ellipse className="p-shadow" cx="850" cy={FLOOR} rx="100" ry="8" />
          <rect className="p-metal" x="772" y="236" width="8" height="64" />
          <rect className="p-metal" x="920" y="236" width="8" height="64" />
          <rect className="p-desk" x="760" y="226" width="180" height="12" rx="4" />
          <path className="p-bk1" d="M780 226l40-10 40 10z" />
          <path className="p-white" d="M786 224l34-8v8zM820 216l34 8h-34z" />
          <rect className="p-note" x="868" y="214" width="26" height="12" rx="2" />
          <rect className="p-note2" x="872" y="208" width="26" height="12" rx="2" />
          <rect className="p-metal" x="914" y="196" width="4" height="30" />
          <ellipse className="p-metal" cx="916" cy="224" rx="14" ry="4" />
          <circle className="p-globe" cx="916" cy="180" r="22" />
          <path className="p-leaf2" d="M902 172q8-10 18-4t4 14q-10 6-16-2z" />
          {/* Letter blocks on the floor. */}
          <ellipse className="p-shadow" cx="140" cy={FLOOR} rx="80" ry="7" />
          {[
            [70, 252, 'p-orange', 'A'],
            [118, 252, 'p-blue', 'B'],
            [166, 252, 'p-lime', 'C'],
            [94, 204, 'p-pink', 'D'],
          ].map(([x, y, c, l]) => (
            <g key={l as string}>
              <rect className={c as string} x={x as number} y={y as number} width="46" height="46" rx="6" />
              <rect className="p-white" x={(x as number) + 9} y={(y as number) + 9} width="28" height="28" rx="4" />
              <text className="p-block" x={(x as number) + 23} y={(y as number) + 31}>
                {l}
              </text>
            </g>
          ))}
        </>
      )}
    </Frame>
  );
}

const povs: Record<RoomKey, () => ReactNode> = {
  vocab: VocabPov,
  pray: PrayPov,
  work: WorkPov,
  books: BooksPov,
  music: MusicPov,
  tv: TvPov,
  links: LinksPov,
  run: RunPov,
};

export default function Pov({ room }: { room: RoomKey }) {
  const View = povs[room];
  return <View />;
}
