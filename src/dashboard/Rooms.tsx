import { useContext, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { HouseContext } from './houseContext';
import type { BoardProject, BoardTask } from '../data/board';
import { Count, WorkSummary, useSeen } from './charts';
import { Glyph, type GlyphName } from './icons';
import type { RoomKey } from './isoScene';
import Pov, { POV_DOOR, POV_LAMP } from './Pov';
import { countsOf } from './stats';

/*
 * The rooms of the house: what each is called, what it is for, its address, and the
 * page it opens (the room seen from inside, then its menu). Only the work room's menu,
 * the projects, exists yet. The order here is the numbering used on the house's pins.
 */

export type Room = { key: RoomKey; slug: string; name: string; short: string; menu: string; icon: GlyphName; object: string };

export const rooms: Room[] = [
  { key: 'work', slug: 'kerja', name: 'Ruang Kerja', short: 'Kerja', menu: 'Project', icon: 'work', object: 'Laptop' },
  { key: 'books', slug: 'baca', name: 'Ruang Baca', short: 'Baca', menu: 'Buku', icon: 'book', object: 'Rak buku' },
  { key: 'music', slug: 'musik', name: 'Ruang Musik', short: 'Musik', menu: 'Gitar', icon: 'music', object: 'Gitar' },
  { key: 'tv', slug: 'tv', name: 'Ruang TV', short: 'TV', menu: 'Film dan series', icon: 'tv', object: 'TV' },
  { key: 'links', slug: 'lampiran', name: 'Ruang Lampiran', short: 'Lampiran', menu: 'Link tersimpan', icon: 'link', object: 'Papan tempel' },
  { key: 'run', slug: 'lari', name: 'Ruang Lari', short: 'Lari', menu: 'Track running', icon: 'shoe', object: 'Sepatu' },
  { key: 'pray', slug: 'ibadah', name: 'Ruang Ibadah', short: 'Ibadah', menu: 'Shalat', icon: 'pray', object: 'Sajadah' },
  { key: 'vocab', slug: 'vocabulary', name: 'Ruang Vocabulary', short: 'Vocab', menu: 'Belajar vocab bahasa Inggris', icon: 'vocab', object: 'Papan tulis' },
];

export const roomOf = (key: RoomKey) => rooms.find((r) => r.key === key)!;

/** "01" to "08": the room's number on the house and in the index. */
export const roomNo = (key: RoomKey) => String(rooms.findIndex((r) => r.key === key) + 1).padStart(2, '0');

const BASE = '/mydashboard';
export const roomHref = (key: RoomKey) => `${BASE}/${roomOf(key).slug}`;

const at = (b: { x: number; y: number; w: number; h: number }) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });

/** Lets a plain click move within the page, and leaves new-tab clicks to the browser. */
export const inPage = (go: () => void) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  go();
};

/**
 * A room's page: the room seen from inside (its door leads back to the house, its lamp
 * switches the theme), the room's number and name, then its menu.
 */
export function RoomPage(props: { room: RoomKey; onHome: () => void; onWork?: () => void; action?: ReactNode; stats?: ReactNode; children?: ReactNode }) {
  const r = roomOf(props.room);
  const house = useContext(HouseContext);
  return (
    <div className={`rm ${r.key}`}>
      <figure className="rm-hero">
        <Pov room={r.key} />
        <a className="hm-obj rm-door" style={at(POV_DOOR)} href={BASE} aria-label="Kembali ke rumah" onClick={inPage(props.onHome)}>
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
        <span className="rm-no" aria-hidden="true">
          {roomNo(r.key)}
        </span>
        <div className="rm-title">
          <h1>{r.name}</h1>
          <p>{r.menu}</p>
        </div>
        {props.stats}
        {props.action}
      </header>
      {props.children ?? (
        <div className="rm-empty">
          <span className="rm-empty-ic" aria-hidden="true">
            <Glyph name={r.icon} />
          </span>
          <div>
            <h2>Ruang ini masih kosong</h2>
            <p>
              Menu {r.menu} belum dibuat, jadi belum ada data untuk ditampilkan di sini. Yang sudah berisi baru Ruang Kerja, Ruang Lari, Ruang TV dan Ruang Vocabulary.
            </p>
          </div>
          <a className="bt" href={roomHref('work')} onClick={props.onWork && inPage(props.onWork)}>
            Buka Ruang Kerja
          </a>
        </div>
      )}
    </div>
  );
}

/** The work room's menu: every project with its progress, a way to add one, and how the work stands overall. */
export function WorkRoomPage(props: {
  projects: BoardProject[];
  tasks: BoardTask[];
  onOpen: (id: number) => void;
  onAdd: () => void;
  onHome: () => void;
  notice?: ReactNode;
}) {
  const [ref, seen] = useSeen<HTMLElement>();
  const all = countsOf(props.tasks);
  return (
    <RoomPage
      room="work"
      onHome={props.onHome}
      stats={
        <dl className="rm-stats">
          <div>
            <dt>Project</dt>
            <dd>
              <Count value={props.projects.length} />
            </dd>
          </div>
          <div>
            <dt>Task terbuka</dt>
            <dd>
              <Count value={all.not_started + all.in_progress} />
            </dd>
          </div>
          <div>
            <dt>Selesai</dt>
            <dd>
              <Count value={all.done} />
            </dd>
          </div>
        </dl>
      }
      action={
        <button type="button" className="bt p" onClick={props.onAdd}>
          <Glyph name="plus" />
          Project baru
        </button>
      }
    >
      {props.notice}
      <div className="rm-grid">
        <section ref={ref} className={seen ? 'rm-list in' : 'rm-list'} aria-label="Project">
          {props.projects.map((p, i) => {
            const c = countsOf(props.tasks.filter((t) => t.projectId === p.id));
            return (
              <a key={p.id} className="rm-row" href={`${BASE}/project/${p.id}`} style={{ ['--i' as string]: i } as CSSProperties} onClick={inPage(() => props.onOpen(p.id))}>
                <span className={`pj-init ${p.kind.toLowerCase()}`} aria-hidden="true">
                  {p.title.trim().charAt(0).toUpperCase()}
                </span>
                <span className="rm-row-tx">
                  <b>{p.title}</b>
                  <span>
                    {p.kind} · {c.total === 0 ? 'belum ada task' : `${c.done}/${c.total} task`}
                  </span>
                </span>
                <span className={c.pct === 100 ? 'ch-track full' : 'ch-track'} aria-hidden="true">
                  <i style={{ width: `${c.pct ?? 0}%` }} />
                </span>
                <span className="rm-pct">{c.pct === null ? '–' : `${c.pct}%`}</span>
              </a>
            );
          })}
          {props.projects.length === 0 && (
            <p className="rm-none">Belum ada project. Buat yang pertama dengan tombol Project baru; task-nya ditambahkan di halaman project itu.</p>
          )}
        </section>
        {props.tasks.length > 0 && (
          <aside className="dc" aria-label="Ringkasan semua project">
            <h2 className="dc-hd">Semua project</h2>
            <WorkSummary tasks={props.tasks} />
          </aside>
        )}
      </div>
    </RoomPage>
  );
}
