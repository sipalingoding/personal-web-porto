import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError, adminRequest } from '../data/api';
import { VOCAB_LEVEL, VOCAB_PER_DAY, vocabBank, vocabOf, type VocabData, type VocabDay, type VocabPos, type VocabWord } from '../data/vocab';
import { Count, Ring, useSeen } from './charts';
import { IconButton } from './icons';
import { RoomPage } from './Rooms';
import { dateDay, dateLong } from './runPlan';

/*
 * Ruang Vocabulary: each day five new English words, each inside one sentence, and the
 * five words of the day before to go over again. A word is ticked off once it is known;
 * the day is done when all of them are. Review words keep their meaning covered until it
 * is asked for, so they are recalled rather than read.
 */

const posLabel: Record<VocabPos, string> = { v: 'kata kerja', n: 'kata benda', adj: 'kata sifat', adv: 'kata keterangan' };

const DAY = 86_400_000;
const shift = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * DAY).toISOString().slice(0, 10);

const wordsOf = (d: VocabDay) => [...d.fresh, ...d.review];
const complete = (d: VocabDay) => wordsOf(d).length > 0 && wordsOf(d).every((w) => d.done.includes(w));

/** Days in a row with every word ticked, counted back from today (or from yesterday while today is still open). */
function streakOf(data: VocabData) {
  const by = new Map(data.days.map((d) => [d.day, d]));
  let day = data.today;
  if (!by.get(day) || !complete(by.get(day)!)) day = shift(day, -1);
  let n = 0;
  while (by.get(day) && complete(by.get(day)!)) {
    n++;
    day = shift(day, -1);
  }
  return n;
}

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(w: VocabWord) {
  window.speechSynthesis.cancel();
  const say = new SpeechSynthesisUtterance(`${w.word}. ${w.sentence.replaceAll('*', '')}`);
  say.lang = 'en-US';
  say.rate = 0.9;
  window.speechSynthesis.speak(say);
}

/** The sentence with its word marked. */
function Sentence({ text }: { text: string }) {
  const [before, word, after] = text.split('*');
  return (
    <p className="vc-sentence" lang="en">
      {before}
      <mark>{word}</mark>
      {after}
    </p>
  );
}

function WordCard(props: { word: VocabWord; done: boolean; quiz: boolean; index: number; onToggle: () => void }) {
  const { word: w, done } = props;
  const [shown, setShown] = useState(false);
  const open = !props.quiz || shown || done;
  return (
    <li className={done ? 'vc-word done' : 'vc-word'} style={{ ['--i' as string]: props.index } as CSSProperties}>
      <div className="vc-word-hd">
        <b lang="en">{w.word}</b>
        <span>{posLabel[w.pos]}</span>
        {canSpeak && <IconButton icon="sound" label={`Dengarkan ${w.word}`} tone="ghost" size="sm" onClick={() => speak(w)} />}
      </div>
      <Sentence text={w.sentence} />
      {open ? (
        <p className="vc-meaning">{w.meaning}</p>
      ) : (
        <button type="button" className="vc-reveal" onClick={() => setShown(true)}>
          Lihat arti
        </button>
      )}
      <button type="button" className="vc-check" aria-pressed={done} onClick={props.onToggle}>
        <span className={done ? 'kb-check done' : 'kb-check'} aria-hidden="true" />
        {done ? 'Sudah hafal' : 'Tandai hafal'}
      </button>
    </li>
  );
}

/** The last two weeks as cells: every word ticked, some ticked, or none. */
function Fortnight({ data }: { data: VocabData }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const by = new Map(data.days.map((d) => [d.day, d]));
  const cells = Array.from({ length: 14 }, (_, i) => {
    const day = shift(data.today, i - 13);
    const d = by.get(day);
    const state = !d || d.done.length === 0 ? 'none' : complete(d) ? 'full' : 'part';
    const text = !d ? 'tidak dibuka' : `${d.done.length} dari ${wordsOf(d).length} kata`;
    return { day, state, text };
  });
  const full = cells.filter((c) => c.state === 'full').length;
  return (
    <div ref={ref} className={seen ? 'vc-days in' : 'vc-days'}>
      <div className="vc-cells" role="img" aria-label={`14 hari terakhir: ${full} hari selesai penuh. ${cells.map((c) => `${dateDay(c.day)} ${c.text}`).join(', ')}`}>
        {cells.map((c, i) => (
          <span key={c.day} className={c.state} title={`${dateDay(c.day)}: ${c.text}`} style={{ ['--i' as string]: i } as CSSProperties} />
        ))}
      </div>
      <div className="ch-axis" aria-hidden="true">
        <span>{dateDay(cells[0].day)}</span>
        <span>Hari ini</span>
      </div>
      <ul className="vc-key">
        <li>
          <i className="full" aria-hidden="true" />
          Semua hafal
        </li>
        <li>
          <i className="part" aria-hidden="true" />
          Sebagian
        </li>
        <li>
          <i aria-hidden="true" />
          Belum
        </li>
      </ul>
    </div>
  );
}

export default function VocabRoom(props: { adminKey: string; onLocked: () => void; onHome: () => void }) {
  const [data, setData] = useState<VocabData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const call = async <T,>(method: 'POST' | 'PUT', path: string, body?: unknown) => {
    try {
      return await adminRequest<T>(props.adminKey, method, path, body);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) props.onLocked();
      throw err;
    }
  };

  useEffect(() => {
    let live = true;
    setLoadError('');
    call<VocabData>('POST', '/vocab/open')
      .then((res) => live && setData(res))
      .catch((err: unknown) => live && setLoadError(err instanceof Error ? err.message : 'Terjadi kesalahan.'));
    return () => {
      live = false;
    };
    // Only the key and retries decide when to load.
  }, [props.adminKey, attempt]);

  const today = data?.days.find((d) => d.day === data.today) ?? null;

  if (!data || !today) {
    return (
      <RoomPage room="vocab" onHome={props.onHome}>
        {loadError ? (
          <div className="adm-error" role="alert">
            <p>Kata hari ini tidak bisa dimuat: {loadError}</p>
            <IconButton icon="retry" label="Coba lagi" onClick={() => setAttempt((n) => n + 1)} />
          </div>
        ) : (
          <p className="adm-status busy" role="status">
            Menyiapkan kata hari ini…
          </p>
        )}
      </RoomPage>
    );
  }

  /** Ticks a word on or off: shown at once, then saved; a failed save puts it back. */
  const toggle = async (word: string) => {
    const before = today.done;
    const done = before.includes(word) ? before.filter((w) => w !== word) : [...before, word];
    const put = (list: string[]) => setData((d) => d && { ...d, days: d.days.map((x) => (x.day === today.day ? { ...x, done: list } : x)) });
    put(done);
    setError('');
    try {
      await call('PUT', `/vocab/days/${today.day}/done`, { words: done });
    } catch (err) {
      put(before);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  };

  const all = wordsOf(today);
  const doneToday = all.filter((w) => today.done.includes(w)).length;
  const known = new Set(data.days.flatMap((d) => d.done)).size;
  const given = new Set(data.days.flatMap((d) => d.fresh)).size;
  const streak = streakOf(data);
  const reviewFrom = data.days.find((d) => d.day < today.day && d.fresh.length > 0)?.day;
  const past = data.days.filter((d) => d.day !== today.day);
  const cards = (list: string[], quiz: boolean) =>
    list.flatMap((word, i) => {
      const w = vocabOf.get(word);
      return w ? [<WordCard key={word} word={w} index={i} quiz={quiz} done={today.done.includes(word)} onToggle={() => toggle(word)} />] : [];
    });

  return (
    <RoomPage
      room="vocab"
      onHome={props.onHome}
      stats={
        <dl className="rm-stats">
          <div>
            <dt>Hari ini</dt>
            <dd>
              <Count value={doneToday} />/{all.length}
            </dd>
          </div>
          <div>
            <dt>Runtun</dt>
            <dd>
              <Count value={streak} /> hari
            </dd>
          </div>
          <div>
            <dt>Kata dihafal</dt>
            <dd>
              <Count value={known} />
            </dd>
          </div>
        </dl>
      }
    >
      {error && (
        <div className="adm-error kb-error" role="alert">
          <p>Tanda hafal tidak tersimpan: {error}</p>
          <IconButton icon="close" label="Tutup" tone="ghost" size="sm" onClick={() => setError('')} />
        </div>
      )}
      <div className="rm-grid">
        <div className="vc-main">
          <section aria-labelledby="vc-new">
            <h2 className="vc-hd" id="vc-new">
              {VOCAB_PER_DAY} kata baru hari ini
              <span>{dateLong(today.day)}</span>
            </h2>
            {today.fresh.length > 0 ? (
              <ul className="vc-list">{cards(today.fresh, false)}</ul>
            ) : (
              <p className="rm-empty">Semua {vocabBank.length} kata di bank sudah diberikan. Bank kata perlu ditambah supaya ada kata baru lagi.</p>
            )}
          </section>

          <section aria-labelledby="vc-review">
            <h2 className="vc-hd" id="vc-review">
              Ulang kata sebelumnya
              {reviewFrom && <span>dari {dateDay(reviewFrom)}</span>}
            </h2>
            {today.review.length > 0 ? (
              <ul className="vc-list">{cards(today.review, true)}</ul>
            ) : (
              <p className="rm-empty">Belum ada kata untuk diulang di hari pertama. Mulai besok, lima kata hari ini muncul lagi di sini.</p>
            )}
          </section>

          {past.length > 0 && (
            <section className="vc-history" aria-labelledby="vc-past">
              <h2 className="vc-hd" id="vc-past">
                Riwayat
                <span>{past.length} hari</span>
              </h2>
              {past.map((d) => (
                <details key={d.day}>
                  <summary>
                    <span className={complete(d) ? 'kb-check done' : d.done.length ? 'kb-check in_progress' : 'kb-check'} aria-hidden="true" />
                    <b>{dateDay(d.day)}</b>
                    <span>
                      {d.done.length} dari {wordsOf(d).length} kata hafal
                    </span>
                  </summary>
                  <dl>
                    {d.fresh.map((word) => (
                      <div key={word}>
                        <dt lang="en">{word}</dt>
                        <dd>{vocabOf.get(word)?.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
            </section>
          )}
        </div>

        <aside className="rn-side">
          <section className="dc">
            <h2 className="dc-hd">Hari ini</h2>
            <div className="ws-top">
              <Ring pct={all.length ? Math.round((doneToday / all.length) * 100) : null} size={84} label={`${doneToday} dari ${all.length} kata hafal hari ini`}>
                <span className="ch-num">
                  {doneToday}/{all.length}
                </span>
              </Ring>
              <p className="ws-lead">
                {all.length > 0 && doneToday === all.length ? (
                  <>
                    <b>Selesai.</b> Semua kata hari ini sudah hafal; kata baru datang besok.
                  </>
                ) : (
                  <>
                    <b>{all.length - doneToday}</b> kata lagi untuk menyelesaikan hari ini.
                  </>
                )}
              </p>
            </div>
          </section>

          <section className="dc">
            <h2 className="dc-hd">14 hari terakhir</h2>
            <Fortnight data={data} />
          </section>

          <section className="dc">
            <h2 className="dc-hd">
              Bank kata
              <span>
                {VOCAB_LEVEL.now} ke {VOCAB_LEVEL.next}
              </span>
            </h2>
            <p className="ws-lead">
              <b>{given}</b> dari <b>{vocabBank.length}</b> kata sudah diberikan. Sisanya cukup untuk {Math.floor((vocabBank.length - given) / VOCAB_PER_DAY)} hari lagi.
            </p>
            <span className="ch-track" role="progressbar" aria-label="Kata yang sudah diberikan" aria-valuemin={0} aria-valuemax={vocabBank.length} aria-valuenow={given}>
              <i style={{ width: `${(given / vocabBank.length) * 100}%` }} />
            </span>
          </section>
        </aside>
      </div>
    </RoomPage>
  );
}
