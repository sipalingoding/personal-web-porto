import { useContext, type ReactNode } from 'react';
import { HouseContext } from './houseContext';
import type { BoardProject, BoardTask } from '../data/board';
import { Glyph, type GlyphName } from './icons';
import type { RoomKey } from './isoScene';
import Pov, { POV_DOOR, POV_LAMP } from './Pov';

/*
 * The rooms of the house: what each is called, what it is for, its address, and the
 * page it opens (the room seen from inside, then its menu). Only the work room's menu,
 * the projects, exists yet.
 */

export type Room = { key: RoomKey; slug: string; name: string; menu: string; icon: GlyphName; object: string };

export const rooms: Room[] = [
  { key: 'work', slug: 'kerja', name: 'Ruang Kerja', menu: 'Project', icon: 'work', object: 'Laptop' },
  { key: 'books', slug: 'baca', name: 'Ruang Baca', menu: 'Buku', icon: 'book', object: 'Rak buku' },
  { key: 'music', slug: 'musik', name: 'Ruang Musik', menu: 'Gitar', icon: 'music', object: 'Gitar' },
  { key: 'tv', slug: 'tv', name: 'Ruang TV', menu: 'Movie', icon: 'tv', object: 'TV' },
  { key: 'links', slug: 'lampiran', name: 'Ruang Lampiran', menu: 'Link tersimpan', icon: 'link', object: 'Papan tempel' },
  { key: 'run', slug: 'lari', name: 'Ruang Lari', menu: 'Track running', icon: 'shoe', object: 'Sepatu' },
  { key: 'pray', slug: 'ibadah', name: 'Ruang Ibadah', menu: 'Shalat', icon: 'pray', object: 'Sajadah' },
  { key: 'vocab', slug: 'vocabulary', name: 'Ruang Vocabulary', menu: 'Belajar vocab bahasa Inggris', icon: 'vocab', object: 'Papan tulis' },
];

export const roomOf = (key: RoomKey) => rooms.find((r) => r.key === key)!;

const BASE = '/mydashboard';
export const roomHref = (key: RoomKey) => `${BASE}/${roomOf(key).slug}`;

const at = (b: { x: number; y: number; w: number; h: number }) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });

/**
 * A room's page: the room seen from inside (its door leads back to the house, its lamp
 * switches the theme), the room's name with the key that locks the dashboard, then its menu.
 */
export function RoomPage(props: { room: RoomKey; onHome: () => void; children?: ReactNode }) {
  const r = roomOf(props.room);
  const house = useContext(HouseContext);
  return (
    <div className={`rm ${r.key}`}>
      <figure className="rm-hero">
        <Pov room={r.key} />
        <a
          className="hm-obj rm-door"
          style={at(POV_DOOR)}
          href={BASE}
          aria-label="Kembali ke rumah"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            props.onHome();
          }}
        >
          <span className="hm-tag" aria-hidden="true">
            Kembali ke rumah
          </span>
        </a>
        {house && (
          <button
            type="button"
            className="hm-obj rm-lamp"
            style={at(POV_LAMP)}
            onClick={house.onTheme}
            aria-label={house.theme === 'dark' ? 'Nyalakan lampu (mode terang)' : 'Matikan lampu (mode gelap)'}
          >
            <span className="hm-tag below" aria-hidden="true">
              {house.theme === 'dark' ? 'Nyalakan lampu' : 'Matikan lampu'}
            </span>
          </button>
        )}
      </figure>
      <header className="rm-head">
        <span className="rm-ic" aria-hidden="true">
          <Glyph name={r.icon} />
        </span>
        <div>
          <h1>{r.name}</h1>
          <p>{r.menu}</p>
        </div>
        {house && (
          <button type="button" className="dsh-link rm-lock" onClick={house.onLock} aria-label="Kunci pintu (lock)">
            <svg className="dsh-ic" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10.25 2.5a3.25 3.25 0 1 1-2.9 4.72L2.5 12.1v1.4h1.75v-1.25H5.5V11h1.25l1.33-1.33A3.25 3.25 0 0 1 10.25 2.5zM11 5.25h.01" />
            </svg>
            <span className="dsh-tip" aria-hidden="true">
              Kunci pintu
            </span>
          </button>
        )}
      </header>
      {props.children ?? <p className="rm-soon">Menu {r.menu.toLowerCase()} sedang disiapkan.</p>}
    </div>
  );
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** The work room's menu: every project with its progress, and a way to add one. */
export function WorkRoomPage(props: {
  projects: BoardProject[];
  tasks: BoardTask[];
  onOpen: (id: number) => void;
  onAdd: () => void;
  onHome: () => void;
  notice?: ReactNode;
}) {
  return (
    <RoomPage room="work" onHome={props.onHome}>
      {props.notice}
      <section className="rm-list" aria-label="Project">
        {props.projects.map((p) => {
          const own = props.tasks.filter((t) => t.projectId === p.id);
          const done = own.filter((t) => t.status === 'done').length;
          const value = pct(done, own.length);
          return (
            <a
              key={p.id}
              className="rm-row"
              href={`${BASE}/project/${p.id}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                props.onOpen(p.id);
              }}
            >
              <span className={`hm-init ${p.kind.toLowerCase()}`} aria-hidden="true">
                {p.title.trim().charAt(0).toUpperCase()}
              </span>
              <span className="rm-row-tx">
                <b>{p.title}</b>
                <span>
                  {p.kind} · {done}/{own.length} task
                </span>
              </span>
              <span className="rm-bar" aria-hidden="true">
                <span style={{ width: `${value}%` }} />
              </span>
              <span className="rm-pct">{value}%</span>
            </a>
          );
        })}
        {props.projects.length === 0 && <p className="rm-soon">Belum ada project.</p>}
        <button type="button" className="rm-row add" onClick={props.onAdd}>
          <span className="hm-init" aria-hidden="true">
            <Glyph name="plus" />
          </span>
          <span className="rm-row-tx">
            <b>Add project</b>
          </span>
        </button>
      </section>
    </RoomPage>
  );
}
