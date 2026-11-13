import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { WorkSummary, YearStrip } from './charts';
import { HouseContext } from './houseContext';
import { Glyph } from './icons';
import IsoHouse, { scene } from './IsoHouse';
import type { RoomKey } from './isoScene';
import { inPage, roomHref, roomNo, rooms } from './Rooms';
import { daysAgo, recentDone, useBoard } from './stats';

/*
 * The dashboard's front page: the isometric house as a model on a table, with a numbered
 * pin on the object that opens each room (the laptop, the bookcase, the TV…), the same
 * numbers in the index under it, and beside it what the calendar and the project board
 * say today. Pointing at a pin or an index entry lights that room; picking one walks the
 * character there, then opens the room's page. The lamp by the front door switches the
 * theme and the front door locks the dashboard.
 */


const ROOM_KEY = 'mydashboard.room';

/** The room the character is in, remembered in this browser between visits. */
function useRoom() {
  const [room, setRoom] = useState<RoomKey>(() => {
    try {
      const saved = localStorage.getItem(ROOM_KEY);
      if (saved && rooms.some((r) => r.key === saved)) return saved as RoomKey;
    } catch {
      /* storage blocked: start in the work room */
    }
    return 'work';
  });
  const go = (key: RoomKey) => {
    setRoom(key);
    try {
      localStorage.setItem(ROOM_KEY, key);
    } catch {
      /* not remembered, still moves */
    }
  };
  return [room, go] as const;
}

export function HomeView(props: { adminKey: string; onLocked: () => void; onRoom: (room: RoomKey) => void }) {
  const [room, go] = useRoom();
  const [hot, setHot] = useState<RoomKey | null>(null);
  const house = useContext(HouseContext);
  const { board, error, retry } = useBoard(props.adminKey, props.onLocked);
  // The room whose page opens once the character gets there.
  const pending = useRef<RoomKey | null>(null);

  const enter = (key: RoomKey) => {
    if (key === room) {
      props.onRoom(key);
      return;
    }
    pending.current = key;
    go(key);
  };

  // On a phone the model is wider than the screen: start with its middle in view.
  const map = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = map.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  const point = (key: RoomKey) => ({
    onPointerEnter: () => setHot(key),
    onPointerLeave: () => setHot(null),
    onFocus: () => setHot(key),
    onBlur: () => setHot(null),
  });

  const ar = scene.width / scene.height;
  const recent = board ? recentDone(board.tasks, 4) : [];
  const projectName = new Map(board?.projects.map((p) => [p.id, p.title]));

  return (
    <div className="hm">
      <div className="hm-main">
        <div className="hm-map" ref={map}>
          <div className="hm-scene" style={{ aspectRatio: `${scene.width} / ${scene.height}`, ['--ar' as string]: ar }}>
            <IsoHouse
              room={room}
              hot={hot}
              onArrive={(key) => {
                if (pending.current !== key) return;
                pending.current = null;
                props.onRoom(key);
              }}
            />
            {rooms.map((r, i) => {
              const o = scene.objects[r.key];
              const pin = scene.pins[r.key];
              const cx = o.x + o.w / 2;
              const cy = o.y + o.h / 2;
              return (
                <button
                  key={r.key}
                  type="button"
                  className={['hm-obj', r.key === room && 'here', r.key === hot && 'hot'].filter(Boolean).join(' ')}
                  style={{ left: `${cx}%`, top: `${cy}%`, width: `${o.w}%`, height: `${o.h}%` }}
                  onClick={() => enter(r.key)}
                  aria-label={`${r.name}: ${r.menu}`}
                  {...point(r.key)}
                >
                  <span className="hm-pin" aria-hidden="true" style={{ ['--dx' as string]: pin.x - cx, ['--dy' as string]: (pin.y - cy) / ar, ['--i' as string]: i } as CSSProperties}>
                    <b>{roomNo(r.key)}</b>
                    <span className="hm-pin-tx">
                      <span>{r.name}</span>
                    </span>
                  </span>
                </button>
              );
            })}
            {house && (
              <>
                <button
                  type="button"
                  className="hm-hot lamp"
                  style={{ left: `${scene.lamp.x}%`, top: `${scene.lamp.y}%` }}
                  onClick={house.onTheme}
                  aria-label={house.theme === 'dark' ? 'Nyalakan lampu (mode terang)' : 'Matikan lampu (mode gelap)'}
                >
                  <span className="hm-tag" aria-hidden="true">
                    {house.theme === 'dark' ? 'Nyalakan lampu' : 'Matikan lampu'}
                  </span>
                </button>
                <button
                  type="button"
                  className="hm-hot door"
                  style={{ left: `${scene.door.x}%`, top: `${scene.door.y}%` }}
                  onClick={house.onLock}
                  aria-label="Kunci pintu (lock)"
                >
                  <span className="hm-tag" aria-hidden="true">
                    Kunci pintu
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
        <nav aria-label="Daftar ruang">
          <ol className="hm-index">
            {rooms.map((r, i) => (
              <li key={r.key} style={{ ['--i' as string]: i } as CSSProperties}>
                <a
                  className={['hm-ix', r.key === room && 'here', r.key === hot && 'hot'].filter(Boolean).join(' ')}
                  href={roomHref(r.key)}
                  aria-label={`${r.name}: ${r.menu}`}
                  aria-current={r.key === room ? 'location' : undefined}
                  onClick={inPage(() => enter(r.key))}
                  {...point(r.key)}
                >
                  <span className="hm-ix-no">{roomNo(r.key)}</span>
                  <span className="hm-ix-tx">
                    <b>{r.short}</b>
                    <span>{r.key === 'run' ? 'Jadwal lari' : r.key === 'vocab' ? '5 kata per hari' : r.key === 'tv' ? 'Film dan series' : r.key !== 'work' ? 'Segera' : board ? `${board.projects.length} project` : 'Project'}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <aside className="hm-side" aria-label="Ringkasan">
        <section className="dc">
          <h2 className="dc-hd">Tahun ini</h2>
          <YearStrip />
        </section>

        <section className="dc">
          <h2 className="dc-hd">
            Ruang Kerja
            <a href={roomHref('work')} onClick={inPage(() => enter('work'))}>
              Buka
            </a>
          </h2>
          {board ? (
            board.tasks.length > 0 ? (
              <WorkSummary tasks={board.tasks} ringSize={84} />
            ) : (
              <p className="dc-note">
                {board.projects.length === 0 ? 'Belum ada project. Buka Ruang Kerja untuk membuat yang pertama.' : 'Project sudah ada, tetapi belum ada task di dalamnya.'}
              </p>
            )
          ) : error ? (
            <div className="dc-note" role="alert">
              <p>Data project tidak bisa dimuat: {error}</p>
              <button type="button" className="bt" onClick={retry}>
                <Glyph name="retry" />
                Coba lagi
              </button>
            </div>
          ) : (
            <p className="dc-note" role="status">
              Memuat data project…
            </p>
          )}
        </section>

        {board && board.tasks.length > 0 && (
          <section className="dc">
            <h2 className="dc-hd">Terakhir selesai</h2>
            {recent.length > 0 ? (
              <ol className="hm-recent">
                {recent.map((t, i) => (
                  <li key={t.id} style={{ ['--i' as string]: i } as CSSProperties}>
                    <span className="kb-check done" aria-hidden="true" />
                    <span className="hm-recent-tx">
                      <b>{t.title}</b>
                      <span>
                        {projectName.get(t.projectId)} · <time dateTime={t.doneAt}>{daysAgo(t.doneAt)}</time>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="dc-note">Belum ada task yang selesai.</p>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}
