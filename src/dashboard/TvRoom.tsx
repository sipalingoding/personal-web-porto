import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError, adminRequest } from '../data/api';
import { TV_LIMITS, tvKinds, tvPlatforms, tvStatusLabel, tvStatuses, type TvData, type TvItem, type TvKind, type TvStatus } from '../data/tv';
import { Count, useSeen } from './charts';
import { Glyph, IconButton } from './icons';
import { FormActions, Modal } from './ProjectBoard';
import { RoomPage } from './Rooms';
import { dateDay } from './runPlan';
import { dayKey } from './stats';

/*
 * Ruang TV: the films and series watched, being watched, or waiting, each with its
 * platform (Netflix, Apple TV+…). The list can be narrowed by status, type and platform;
 * beside it, how many titles each platform holds.
 */

type Api = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<T>;
const msg = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan.');

const OTHER = '__other';

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

function TvForm(props: { item: TvItem | null; api: Api; onSaved: (t: TvItem) => void; onDeleted: (id: number) => void; onClose: () => void }) {
  const t = props.item;
  const known = (tvPlatforms as readonly string[]).includes(t?.platform ?? tvPlatforms[0]);
  const [title, setTitle] = useState(t?.title ?? '');
  const [kind, setKind] = useState<TvKind>(t?.kind ?? 'Film');
  const [platform, setPlatform] = useState(known ? (t?.platform ?? tvPlatforms[0]) : OTHER);
  const [other, setOther] = useState(known ? '' : (t?.platform ?? ''));
  const [status, setStatus] = useState<TvStatus>(t?.status ?? 'done');
  const [rating, setRating] = useState<number | null>(t?.rating ?? null);
  const [watchedOn, setWatchedOn] = useState(t?.watchedOn ?? (t ? '' : dayKey(new Date())));
  const [note, setNote] = useState(t?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { title: useId(), kind: useId(), platform: useId(), other: useId(), status: useId(), date: useId(), note: useId(), rating: useId() };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Judul wajib diisi.');
    const where = platform === OTHER ? other.trim() : platform;
    if (!where) return setError('Tulis nama platformnya.');
    setBusy(true);
    setError('');
    try {
      const payload = { title, kind, platform: where, status, rating, watchedOn: status === 'done' ? watchedOn || null : null, note };
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
          <input id={ids.title} autoFocus value={title} maxLength={TV_LIMITS.title} onChange={(e) => setTitle(e.target.value)} />
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
        <div className="rn-pair">
          <div className="adm-field">
            <label htmlFor={ids.platform}>Platform</label>
            <span className="adm-select">
              <select id={ids.platform} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {tvPlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={OTHER}>Lainnya…</option>
              </select>
            </span>
          </div>
          {platform === OTHER && (
            <div className="adm-field">
              <label htmlFor={ids.other}>Nama platform</label>
              <input id={ids.other} value={other} maxLength={TV_LIMITS.platform} onChange={(e) => setOther(e.target.value)} />
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
    .map((name) => ({ name, n: count((t) => t.platform === name), done: count((t) => t.platform === name && t.status === 'done') }))
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
                      <span className={`tv-kind ${t.kind.toLowerCase()}`} aria-hidden="true">
                        <Glyph name={t.kind === 'Film' ? 'film' : 'tv'} />
                      </span>
                      <span className="rn-run-tx">
                        <b>{t.title}</b>
                        <span>
                          {t.kind}
                          {t.status === 'done' && t.watchedOn ? ` · selesai ${dateDay(t.watchedOn)}` : ''}
                          {t.note ? ` · ${t.note}` : ''}
                        </span>
                      </span>
                      <span className="tv-plat">{t.platform}</span>
                      <span className={`tl-status tv-st ${t.status}`}>{tvStatusLabel[t.status]}</span>
                      {t.rating ? <Stars value={t.rating} /> : <span className="tv-stars none">Belum dirating</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
                    <span className="ch-feat-name">{p.name}</span>
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
