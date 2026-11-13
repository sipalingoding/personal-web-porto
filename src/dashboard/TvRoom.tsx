import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError, adminRequest } from '../data/api';
import { TV_LIMITS, tmdbImage, tvKinds, tvPlatforms, tvStatusLabel, tvStatuses, type TvData, type TvHit, type TvItem, type TvKind, type TvPlatform, type TvStatus } from '../data/tv';
import { Count, useSeen } from './charts';
import { Glyph, IconButton } from './icons';
import { FormActions, Modal } from './ProjectBoard';
import { RoomPage } from './Rooms';
import { dateDay } from './runPlan';
import { dayKey } from './stats';

/*
 * Ruang TV: the films and series watched, being watched, or waiting, each with its
 * platform (Netflix, Apple TV+…). The list can be narrowed by status, type and platform;
 * beside it, how many titles each platform holds. Typing a title searches TMDB, which
 * brings the poster and year and says where the title streams in Indonesia; platforms
 * TMDB knows are shown with their logos.
 */

type Api = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<T>;
const msg = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan.');

const OTHER = '__other';

/** A platform's logo, or its first letter when there is none. */
function PlatformMark({ name, logo }: { name: string; logo: string | null }) {
  return logo ? (
    <img className="tv-logo" src={tmdbImage(logo, 92)} alt="" loading="lazy" />
  ) : (
    <span className="tv-logo none" aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** One to five stars; the filled ones are the rating. */
function Stars({ value }: { value: number }) {
  return (
    <span className="tv-stars" role="img" aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} className={n <= value ? 'on' : undefined} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.9l1.85 3.86 4.2.57-3.07 2.93.75 4.19L8 11.42l-3.73 2.03.75-4.19L1.95 6.33l4.2-.57z" />
        </svg>
      ))}
    </span>
  );
}

function TvForm(props: {
  item: TvItem | null;
  platforms: TvPlatform[];
  api: Api;
  onSaved: (t: TvItem) => void;
  onDeleted: (id: number) => void;
  onClose: () => void;
}) {
  const t = props.item;
  // What the Platform list offers: TMDB's platforms for the country when they loaded, the built-in ones otherwise.
  const base: TvPlatform[] = props.platforms.length ? props.platforms : tvPlatforms.map((name) => ({ name, logo: null }));
  const [offers, setOffers] = useState<TvPlatform[]>([]);
  const choices = [...offers, ...base, { name: 'Bioskop', logo: null }].filter((p, i, all) => all.findIndex((x) => x.name === p.name) === i);
  const [title, setTitle] = useState(t?.title ?? '');
  const [kind, setKind] = useState<TvKind>(t?.kind ?? 'Film');
  const [platform, setPlatform] = useState(t?.platform ?? choices[0].name);
  const custom = platform === OTHER || !choices.some((p) => p.name === platform);
  const [other, setOther] = useState('');
  const [status, setStatus] = useState<TvStatus>(t?.status ?? 'done');
  const [rating, setRating] = useState<number | null>(t?.rating ?? null);
  const [watchedOn, setWatchedOn] = useState(t?.watchedOn ?? (t ? '' : dayKey(new Date())));
  const [note, setNote] = useState(t?.note ?? '');
  // The TMDB title this entry is tied to; typing a different title lets go of it.
  const [picked, setPicked] = useState<TvHit | null>(t?.tmdbId ? { tmdbId: t.tmdbId, kind: t.kind, title: t.title, year: t.year, poster: t.poster } : null);
  const [hits, setHits] = useState<TvHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { title: useId(), kind: useId(), platform: useId(), other: useId(), status: useId(), date: useId(), note: useId(), rating: useId() };

  // Search a moment after typing stops; a title that was just picked is not searched again.
  useEffect(() => {
    const q = title.trim();
    if (q.length < 2 || picked?.title === title) {
      setHits(null);
      setSearching(false);
      return;
    }
    let live = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      props
        .api<{ hits: TvHit[] }>('GET', `/tv/search?q=${encodeURIComponent(q)}`)
        .then((res) => {
          if (!live) return;
          setHits(res.hits);
          setSearchNote('');
        })
        .catch((err: unknown) => {
          if (!live) return;
          setHits(null);
          setSearchNote(`Pencarian tidak tersedia (${msg(err)}). Judul tetap bisa diketik sendiri.`);
        })
        .finally(() => live && setSearching(false));
    }, 350);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [title]);

  const pick = (h: TvHit) => {
    setPicked(h);
    setTitle(h.title);
    setKind(h.kind);
    setHits(null);
    props
      .api<{ platforms: TvPlatform[] }>('GET', `/tv/where/${h.kind}/${h.tmdbId}`)
      .then((res) => {
        setOffers(res.platforms);
        if (res.platforms[0]) setPlatform(res.platforms[0].name);
      })
      .catch(() => setOffers([]));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Judul wajib diisi.');
    const where = platform === OTHER ? other.trim() : platform;
    const linked = picked?.title === title ? picked : null;
    const logo = choices.find((p) => p.name === where)?.logo ?? (t && t.platform === where ? t.platformLogo : null);
    if (!where) return setError('Tulis nama platformnya.');
    setBusy(true);
    setError('');
    try {
      const payload = {
        title,
        kind,
        platform: where,
        status,
        rating,
        watchedOn: status === 'done' ? watchedOn || null : null,
        note,
        year: linked?.year ?? null,
        poster: linked?.poster ?? null,
        tmdbId: linked?.tmdbId ?? null,
        platformLogo: logo,
      };
      const res = t ? await props.api<{ item: TvItem }>('PUT', `/tv/items/${t.id}`, payload) : await props.api<{ item: TvItem }>('POST', '/tv/items', payload);
      props.onSaved(res.item);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!t) return;
    setBusy(true);
    try {
      await props.api('DELETE', `/tv/items/${t.id}`);
      props.onDeleted(t.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={t ? 'Edit tontonan' : 'Tambah tontonan'} onClose={props.onClose}>
      <form className="kb-form" onSubmit={save} noValidate>
        <div className="adm-field">
          <label htmlFor={ids.title}>Judul</label>
          <div className="tv-title">
            {picked?.title === title && picked.poster && <img className="tv-poster" src={tmdbImage(picked.poster, 92)} alt="" />}
            <input id={ids.title} autoFocus autoComplete="off" placeholder="Ketik judul untuk mencari" value={title} maxLength={TV_LIMITS.title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <p className="ft-hint" role="status">
            {searching
              ? 'Mencari…'
              : hits && hits.length === 0
                ? 'Tidak ada judul yang cocok di TMDB. Judul ini tetap bisa disimpan.'
                : picked?.title === title
                  ? `Dari TMDB: ${picked.kind}${picked.year ? `, ${picked.year}` : ''}.`
                  : searchNote}
          </p>
          {hits && hits.length > 0 && (
            <ul className="tv-hits" aria-label="Hasil pencarian">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.tmdbId}`}>
                  <button type="button" onClick={() => pick(h)}>
                    {h.poster ? <img className="tv-poster" src={tmdbImage(h.poster, 92)} alt="" loading="lazy" /> : <span className="tv-poster none" aria-hidden="true" />}
                    <span className="rn-run-tx">
                      <b>{h.title}</b>
                      <span>
                        {h.kind}
                        {h.year ? ` · ${h.year}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <fieldset className="kb-choice">
          <legend>Jenis</legend>
          {tvKinds.map((k) => (
            <label key={k}>
              <input type="radio" name={ids.kind} value={k} checked={kind === k} onChange={() => setKind(k)} />
              <span>{k}</span>
            </label>
          ))}
        </fieldset>
        {offers.length > 0 && (
          <div className="tv-offers">
            <span>Tersedia di Indonesia:</span>
            {offers.map((p) => (
              <button key={p.name} type="button" className={platform === p.name ? 'bt on' : 'bt'} aria-pressed={platform === p.name} onClick={() => setPlatform(p.name)}>
                <PlatformMark name={p.name} logo={p.logo} />
                {p.name}
              </button>
            ))}
          </div>
        )}
        <div className="rn-pair">
          <div className="adm-field">
            <label htmlFor={ids.platform}>Platform</label>
            <span className="adm-select">
              <select
                id={ids.platform}
                value={custom ? OTHER : platform}
                onChange={(e) => {
                  // An unlisted platform of an edited title moves into the text field.
                  if (e.target.value === OTHER && platform !== OTHER) setOther(custom ? platform : '');
                  setPlatform(e.target.value);
                }}
              >
                {choices.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
                <option value={OTHER}>Lainnya…</option>
              </select>
            </span>
          </div>
          {custom && (
            <div className="adm-field">
              <label htmlFor={ids.other}>Nama platform</label>
              <input
                id={ids.other}
                value={platform === OTHER ? other : platform}
                maxLength={TV_LIMITS.platform}
                onChange={(e) => {
                  setPlatform(OTHER);
                  setOther(e.target.value);
                }}
              />
            </div>
          )}
        </div>
        <fieldset className="kb-choice">
          <legend>Status</legend>
          {tvStatuses.map((s) => (
            <label key={s}>
              <input type="radio" name={ids.status} value={s} checked={status === s} onChange={() => setStatus(s)} />
              <span>{tvStatusLabel[s]}</span>
            </label>
          ))}
        </fieldset>
        {status === 'done' && (
          <div className="adm-field">
            <label htmlFor={ids.date}>Selesai ditonton (opsional)</label>
            <input id={ids.date} type="date" value={watchedOn} onChange={(e) => setWatchedOn(e.target.value)} />
          </div>
        )}
        <fieldset className="kb-choice tv-rate">
          <legend>Rating (opsional)</legend>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n}>
              <input type="radio" name={ids.rating} value={n} checked={rating === n} onChange={() => setRating(n)} onClick={() => rating === n && setRating(null)} />
              <span>{n}</span>
            </label>
          ))}
          <p className="ft-hint">{rating ? `${rating} dari 5. Klik angka yang sama untuk menghapus rating.` : 'Belum diberi rating.'}</p>
        </fieldset>
        <div className="adm-field">
          <label htmlFor={ids.note}>Catatan (opsional)</label>
          <textarea id={ids.note} rows={2} value={note} maxLength={TV_LIMITS.note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <FormActions
          busy={busy}
          isNew={!t}
          error={error}
          onDelete={remove}
          deleteText={
            <>
              Hapus <b>{t?.title}</b> dari daftar? Tidak bisa dibatalkan.
            </>
          }
        />
      </form>
    </Modal>
  );
}

const statusOrder: Record<TvStatus, number> = { watching: 0, planned: 1, done: 2 };

export default function TvRoom(props: { adminKey: string; onLocked: () => void; onHome: () => void }) {
  const [data, setData] = useState<TvData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<{ item: TvItem | null } | null>(null);
  const [platforms, setPlatforms] = useState<TvPlatform[]>([]);
  const [status, setStatus] = useState<TvStatus | 'all'>('all');
  const [kind, setKind] = useState<TvKind | 'all'>('all');
  const [platform, setPlatform] = useState('all');
  const [ref, seen] = useSeen<HTMLUListElement>();
  const ids = { kind: useId(), platform: useId() };

  const api: Api = async (method, path, body) => {
    try {
      return await adminRequest(props.adminKey, method, path, body);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) props.onLocked();
      throw err;
    }
  };

  useEffect(() => {
    let live = true;
    setLoadError('');
    api<TvData>('GET', '/tv')
      .then((res) => live && setData(res))
      .catch((err: unknown) => live && setLoadError(msg(err)));
    return () => {
      live = false;
    };
    // Only the key and retries decide when to load.
  }, [props.adminKey, attempt]);

  // TMDB's platforms for the form; without them the built-in list is used.
  useEffect(() => {
    let live = true;
    adminRequest<{ platforms: TvPlatform[] }>(props.adminKey, 'GET', '/tv/platforms')
      .then((res) => live && setPlatforms(res.platforms))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [props.adminKey]);

  if (!data) {
    return (
      <RoomPage room="tv" onHome={props.onHome}>
        {loadError ? (
          <div className="adm-error" role="alert">
            <p>Daftar tontonan tidak bisa dimuat: {loadError}</p>
            <IconButton icon="retry" label="Coba lagi" onClick={() => setAttempt((n) => n + 1)} />
          </div>
        ) : (
          <p className="adm-status busy" role="status">
            Memuat daftar tontonan…
          </p>
        )}
      </RoomPage>
    );
  }

  const { items } = data;
  const count = (test: (t: TvItem) => boolean) => items.filter(test).length;
  // Platforms by how many titles they hold; the same order is used in the filter.
  const perPlatform = [...new Set(items.map((t) => t.platform))]
    .map((name) => ({
      name,
      logo: items.find((t) => t.platform === name && t.platformLogo)?.platformLogo ?? null,
      n: count((t) => t.platform === name),
      done: count((t) => t.platform === name && t.status === 'done'),
    }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const most = Math.max(1, ...perPlatform.map((p) => p.n));
  const activePlatform = platform === 'all' || perPlatform.some((p) => p.name === platform) ? platform : 'all';
  const shown = items
    .filter((t) => (status === 'all' || t.status === status) && (kind === 'all' || t.kind === kind) && (activePlatform === 'all' || t.platform === activePlatform))
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (b.watchedOn ?? '').localeCompare(a.watchedOn ?? '') || b.id - a.id);
  const rated = items.filter((t) => t.rating);
  const filtered = status !== 'all' || kind !== 'all' || activePlatform !== 'all';

  return (
    <RoomPage
      room="tv"
      onHome={props.onHome}
      stats={
        <dl className="rm-stats">
          <div>
            <dt>Film</dt>
            <dd>
              <Count value={count((t) => t.kind === 'Film')} />
            </dd>
          </div>
          <div>
            <dt>Series</dt>
            <dd>
              <Count value={count((t) => t.kind === 'Series')} />
            </dd>
          </div>
          <div>
            <dt>Selesai</dt>
            <dd>
              <Count value={count((t) => t.status === 'done')} />
            </dd>
          </div>
        </dl>
      }
      action={
        <button type="button" className="bt p" onClick={() => setDialog({ item: null })}>
          <Glyph name="plus" />
          Tambah tontonan
        </button>
      }
    >
      <div className="rm-grid">
        <div className="rn-main">
          <div className="tv-bar">
            <div className="tv-tabs" role="group" aria-label="Status">
              {(['all', ...tvStatuses] as const).map((s) => (
                <button key={s} type="button" className={status === s ? 'on' : undefined} aria-pressed={status === s} onClick={() => setStatus(s)}>
                  {s === 'all' ? 'Semua' : tvStatusLabel[s]}
                  <span>{s === 'all' ? items.length : count((t) => t.status === s)}</span>
                </button>
              ))}
            </div>
            <div className="pj-filter">
              <label className="sr-only" htmlFor={ids.kind}>
                Jenis
              </label>
              <span className="adm-select">
                <select id={ids.kind} value={kind} onChange={(e) => setKind(e.target.value as TvKind | 'all')}>
                  <option value="all">Film dan series</option>
                  {tvKinds.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </span>
              <label className="sr-only" htmlFor={ids.platform}>
                Platform
              </label>
              <span className="adm-select">
                <select id={ids.platform} value={activePlatform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="all">Semua platform</option>
                  {perPlatform.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.n})
                    </option>
                  ))}
                </select>
              </span>
            </div>
          </div>

          <section className="rn-history" aria-label="Daftar tontonan">
            {shown.length === 0 ? (
              <p className="rm-none">
                {items.length === 0
                  ? 'Belum ada tontonan. Tambahkan film atau series pertama dengan tombol Tambah tontonan.'
                  : 'Tidak ada judul yang cocok dengan pilihan ini. Ubah status, jenis atau platformnya.'}
              </p>
            ) : (
              <ul>
                {shown.map((t, i) => (
                  <li key={t.id} className="tv-row" style={{ ['--i' as string]: Math.min(i, 14) } as CSSProperties}>
                    <button type="button" className="tv-row-main" aria-label={`Edit ${t.title}`} onClick={() => setDialog({ item: t })}>
                      {t.poster ? (
                        <img className="tv-poster" src={tmdbImage(t.poster, 92)} alt="" loading="lazy" />
                      ) : (
                        <span className={`tv-kind ${t.kind.toLowerCase()}`} aria-hidden="true">
                          <Glyph name={t.kind === 'Film' ? 'film' : 'tv'} />
                        </span>
                      )}
                      <span className="rn-run-tx">
                        <b>{t.title}</b>
                        <span>
                          {t.kind}
                          {t.year ? ` · ${t.year}` : ''}
                          {t.status === 'done' && t.watchedOn ? ` · selesai ${dateDay(t.watchedOn)}` : ''}
                          {t.note ? ` · ${t.note}` : ''}
                        </span>
                      </span>
                      <span className="tv-plat">
                        <PlatformMark name={t.platform} logo={t.platformLogo} />
                        <span>{t.platform}</span>
                      </span>
                      <span className={`tl-status tv-st ${t.status}`}>{tvStatusLabel[t.status]}</span>
                      {t.rating ? <Stars value={t.rating} /> : <span className="tv-stars none">Belum dirating</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="tv-credit">
            Pencarian judul, poster dan logo platform memakai TMDB API; dashboard ini tidak didukung atau disertifikasi oleh TMDB. Data ketersediaan platform dari JustWatch.
          </p>
          {filtered && shown.length > 0 && (
            <p className="pj-filter-note" role="status">
              Menampilkan {shown.length} dari {items.length} judul
            </p>
          )}
        </div>

        <aside className="rn-side">
          <section className="dc">
            <h2 className="dc-hd">Judul per platform</h2>
            {perPlatform.length === 0 ? (
              <p className="dc-note">Platform muncul di sini setelah ada tontonan yang ditambahkan.</p>
            ) : (
              <ul ref={ref} className={seen ? 'ch-feat in' : 'ch-feat'}>
                {perPlatform.map((p, i) => (
                  <li key={p.name}>
                    <span className="ch-feat-name tv-plat">
                      <PlatformMark name={p.name} logo={p.logo} />
                      <span>{p.name}</span>
                    </span>
                    <span className="ch-feat-n">
                      {p.n} judul, {p.done} selesai
                    </span>
                    <span className="ch-track" aria-hidden="true">
                      <i style={{ width: `${(p.n / most) * 100}%`, ['--i' as string]: i } as CSSProperties} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dc">
            <h2 className="dc-hd">Sejauh ini</h2>
            <dl className="rn-facts">
              <div>
                <dt>Sedang ditonton</dt>
                <dd>{count((t) => t.status === 'watching')}</dd>
              </div>
              <div>
                <dt>Ingin ditonton</dt>
                <dd>{count((t) => t.status === 'planned')}</dd>
              </div>
              <div>
                <dt>Rating rata-rata</dt>
                <dd>{rated.length ? `${(rated.reduce((s, t) => s + t.rating!, 0) / rated.length).toFixed(1).replace('.', ',')} dari 5` : '–'}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {dialog && (
        <TvForm
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          platforms={platforms}
          api={api}
          onSaved={(t) => {
            setData({ items: [t, ...items.filter((x) => x.id !== t.id)] });
            setDialog(null);
          }}
          onDeleted={(id) => {
            setData({ items: items.filter((x) => x.id !== id) });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </RoomPage>
  );
}
