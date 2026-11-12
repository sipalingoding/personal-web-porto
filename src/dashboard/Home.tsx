import { useContext, useRef, useState } from 'react';
import { HouseContext } from './houseContext';
import { Glyph } from './icons';
import IsoHouse, { scene } from './IsoHouse';
import type { RoomKey } from './isoScene';
import { rooms } from './Rooms';

/*
 * The dashboard's front page: only the isometric house. One object in each room opens
 * that room's page (the TV, the laptop, the bookcase, the guitar, the shoes, the pinboard);
 * hovering it shows a tag with the room's name. The character walks to the room first.
 * The lamp by the front door switches the theme and the front door locks the dashboard.
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

export function HomeView(props: { onRoom: (room: RoomKey) => void }) {
  const [room, go] = useRoom();
  const house = useContext(HouseContext);
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

  return (
    <div className="hm">
      <div className="hm-map">
        <div className="hm-scene" style={{ aspectRatio: `${scene.width} / ${scene.height}`, ['--ar' as string]: scene.width / scene.height }}>
          <IsoHouse
            room={room}
            onArrive={(key) => {
              if (pending.current !== key) return;
              pending.current = null;
              props.onRoom(key);
            }}
          />
          {rooms.map((r) => {
            const o = scene.objects[r.key];
            return (
              <button
                key={r.key}
                type="button"
                className={`hm-obj ${r.key}`}
                style={{ left: `${o.x + o.w / 2}%`, top: `${o.y + o.h / 2}%`, width: `${o.w}%`, height: `${o.h}%` }}
                onClick={() => enter(r.key)}
                aria-label={`${r.name}: ${r.menu}`}
              >
                <span className="hm-tag" aria-hidden="true">
                  <span className="hm-tag-ic">
                    <Glyph name={r.icon} />
                  </span>
                  {r.name}
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
    </div>
  );
}
