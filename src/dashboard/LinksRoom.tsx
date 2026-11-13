import { useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError, adminRequest } from '../data/api';
import { LINK_LIMITS, linkCategories, linkSources, sourceOf, type LinkSource, type LinksData, type SavedLink } from '../data/links';
import { stackIconUrl } from '../data/stack';
import { Count, useSeen } from './charts';
import { Glyph, IconButton } from './icons';
import { FormActions, Modal } from './ProjectBoard';
import { RoomPage } from './Rooms';
import { dateDay } from './runPlan';
import { dayKey } from './stats';

/*
 * Ruang Lampiran: links saved from social media (Threads, X, Instagram, TikTok, or any
 * site), gathered on one page and sorted into categories such as Kuliner, Programmer,
 * Wisata and Event. Where a link comes from is read from its address. A row opens the
 * link in a new tab; the list narrows by category, by source, and by words typed.
 */

type Api = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<T>;
const msg = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan.');

const OTHER = '__other';

/** "https://www.instagram.com/p/abc/" reads as "instagram.com/p/abc". */
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#]+$/, '');

/** The source's logo (drawn in the text colour), or a link glyph for any other site. */
function SourceMark({ source }: { source: LinkSource }) {
  return (
    <span className="lk-src" title={source.name}>
      {source.icon ? <i style={{ ['--si' as string]: `url("${stackIconUrl(source.icon)}")` } as CSSProperties} aria-hidden="true" /> : <Glyph name="link" />}
      <span className="sr-only">{source.name}</span>
    </span>
  );
}

function LinkForm(props: { item: SavedLink | null; categories: string[]; api: Api; onSaved: (l: SavedLink) => void; onDeleted: (id: number) => void; onClose: () => void }) {
  const l = props.item;
  const [url, setUrl] = useState(l?.url ?? '');
  const [title, setTitle] = useState(l?.title ?? '');
  const [category, setCategory] = useState(l?.category ?? props.categories[0]);
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { url: useId(), title: useId(), category: useId(), other: useId() };
  const source = url.trim() ? sourceOf(/^[a-z][a-z\d+.-]*:/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`) : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return setError('Tempel link-nya dulu.');
    const where = category === OTHER ? other.trim() : category;
    if (!where) return setError('Tulis nama kategorinya.');
    setBusy(true);
    setError('');
    try {
      const payload = { url, title, category: where };
      const res = l ? await props.api<{ item: SavedLink }>('PUT', `/links/items/${l.id}`, payload) : await props.api<{ item: SavedLink }>('POST', '/links/items', payload);
      props.onSaved(res.item);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!l) return;
    setBusy(true);
    try {
      await props.api('DELETE', `/links/items/${l.id}`);
      props.onDeleted(l.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={l ? 'Edit link' : 'Simpan link'} onClose={props.onClose}>
      <form className="kb-form" onSubmit={save} noValidate>
        <div className="adm-field">
          <label htmlFor={ids.url}>Link</label>
          <input id={ids.url} autoFocus inputMode="url" autoComplete="off" placeholder="Tempel link dari Threads, X, Instagram atau TikTok" value={url} maxLength={LINK_LIMITS.url} onChange={(e) => setUrl(e.target.value)} />
          <p className="ft-hint lk-detect" role="status">
            {source ? (
              <>
                <SourceMark source={source} />
                Sumber: {source.name}
              </>
            ) : (
              'Sumbernya dikenali dari alamat link.'
            )}
          </p>
        </div>
        <div className="adm-field">
          <label htmlFor={ids.title}>Keterangan (opsional)</label>
          <input id={ids.title} placeholder="Isinya tentang apa" value={title} maxLength={LINK_LIMITS.title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <fieldset className="kb-choice">
          <legend>Kategori</legend>
          {props.categories.map((c) => (
            <label key={c}>
              <input type="radio" name={ids.category} value={c} checked={category === c} onChange={() => setCategory(c)} />
              <span>{c}</span>
            </label>
          ))}
          <label>
            <input type="radio" name={ids.category} value={OTHER} checked={category === OTHER} onChange={() => setCategory(OTHER)} />
            <span>Kategori baru…</span>
          </label>
        </fieldset>
        {category === OTHER && (
          <div className="adm-field">
            <label htmlFor={ids.other}>Nama kategori baru</label>
            <input id={ids.other} autoFocus value={other} maxLength={LINK_LIMITS.category} onChange={(e) => setOther(e.target.value)} />
          </div>
        )}
        <FormActions
          busy={busy}
          isNew={!l}
          error={error}
          onDelete={remove}
          deleteText={
            <>
              Hapus link <b>{l && (l.title || shortUrl(l.url))}</b>? Tidak bisa dibatalkan.
            </>
          }
        />
      </form>
    </Modal>
  );
}

export default function LinksRoom(props: { adminKey: string; onLocked: () => void; onHome: () => void }) {
  const [data, setData] = useState<LinksData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<{ item: SavedLink | null } | null>(null);
  const [category, setCategory] = useState('all');
  const [source, setSource] = useState('all');
  const [query, setQuery] = useState('');
  const [ref, seen] = useSeen<HTMLUListElement>();
  const ids = { source: useId(), query: useId() };

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
    api<LinksData>('GET', '/links')
      .then((res) => live && setData(res))
      .catch((err: unknown) => live && setLoadError(msg(err)));
    return () => {
      live = false;
    };
    // Only the key and retries decide when to load.
  }, [props.adminKey, attempt]);

  if (!data) {
    return (
      <RoomPage room="links" onHome={props.onHome}>
        {loadError ? (
          <div className="adm-error" role="alert">
            <p>Link tersimpan tidak bisa dimuat: {loadError}</p>
            <IconButton icon="retry" label="Coba lagi" onClick={() => setAttempt((n) => n + 1)} />
          </div>
        ) : (
          <p className="adm-status busy" role="status">
            Memuat link tersimpan…
          </p>
        )}
      </RoomPage>
    );
  }

  const items = data.items.map((l) => ({ ...l, source: sourceOf(l.url) }));
  // The built-in categories first, then any that were typed in, by name.
  const used = [...new Set(items.map((l) => l.category))];
  const categories = [...linkCategories, ...used.filter((c) => !(linkCategories as readonly string[]).includes(c)).sort((a, b) => a.localeCompare(b, 'id'))];
  const perCategory = categories.map((name) => ({ name, n: items.filter((l) => l.category === name).length })).filter((c) => c.n > 0);
  const most = Math.max(1, ...perCategory.map((c) => c.n));
  const sources = [...linkSources.map((s): LinkSource => s), { key: 'other', name: 'Situs lain', icon: null }].map((s) => ({ ...s, n: items.filter((l) => l.source.key === s.key).length }));
  const activeCategory = category === 'all' || used.includes(category) ? category : 'all';
  const words = query.trim().toLowerCase();
  const shown = items.filter(
    (l) =>
      (activeCategory === 'all' || l.category === activeCategory) &&
      (source === 'all' || l.source.key === source) &&
      (!words || l.title.toLowerCase().includes(words) || l.url.toLowerCase().includes(words) || l.category.toLowerCase().includes(words)),
  );
  const weekAgo = dayKey(new Date(Date.now() - 6 * 86_400_000));
  const thisWeek = items.filter((l) => dayKey(l.createdAt) >= weekAgo).length;
  const filtered = activeCategory !== 'all' || source !== 'all' || words !== '';

  return (
    <RoomPage
      room="links"
      onHome={props.onHome}
      stats={
        <dl className="rm-stats">
          <div>
            <dt>Link</dt>
            <dd>
              <Count value={items.length} />
            </dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>
              <Count value={perCategory.length} />
            </dd>
          </div>
          <div>
            <dt>7 hari ini</dt>
            <dd>
              <Count value={thisWeek} />
            </dd>
          </div>
        </dl>
      }
      action={
        <button type="button" className="bt p" onClick={() => setDialog({ item: null })}>
          <Glyph name="plus" />
          Simpan link
        </button>
      }
    >
      <div className="rm-grid">
        <div className="rn-main">
          <div className="tv-bar">
            <div className="tv-tabs" role="group" aria-label="Kategori">
              <button type="button" className={activeCategory === 'all' ? 'on' : undefined} aria-pressed={activeCategory === 'all'} onClick={() => setCategory('all')}>
                Semua
                <span>{items.length}</span>
              </button>
              {perCategory.map((c) => (
                <button key={c.name} type="button" className={activeCategory === c.name ? 'on' : undefined} aria-pressed={activeCategory === c.name} onClick={() => setCategory(c.name)}>
                  {c.name}
                  <span>{c.n}</span>
                </button>
              ))}
            </div>
            <div className="pj-filter lk-find">
              <label className="sr-only" htmlFor={ids.query}>
                Cari link
              </label>
              <input id={ids.query} type="search" placeholder="Cari keterangan atau alamat" value={query} onChange={(e) => setQuery(e.target.value)} />
              <label className="sr-only" htmlFor={ids.source}>
                Sumber
              </label>
              <span className="adm-select">
                <select id={ids.source} value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="all">Semua sumber</option>
                  {sources
                    .filter((s) => s.n > 0)
                    .map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name} ({s.n})
                      </option>
                    ))}
                </select>
              </span>
            </div>
          </div>

          <section className="rn-history" aria-label="Link tersimpan">
            {shown.length === 0 ? (
              <p className="rm-none">
                {items.length === 0
                  ? 'Belum ada link. Salin link postingan dari Threads, X, Instagram atau TikTok, lalu simpan di sini dengan tombol Simpan link.'
                  : 'Tidak ada link yang cocok. Ubah kategori, sumber atau kata pencariannya.'}
              </p>
            ) : (
              <ul>
                {shown.map((l, i) => (
                  <li key={l.id} className="lk-row" style={{ ['--i' as string]: Math.min(i, 14) } as CSSProperties}>
                    <a className="lk-row-main" href={l.url} target="_blank" rel="noreferrer">
                      <SourceMark source={l.source} />
                      <span className="rn-run-tx">
                        <b>{l.title || shortUrl(l.url)}</b>
                        <span>{l.title ? shortUrl(l.url) : l.source.name}</span>
                      </span>
                      <span className="lk-cat">{l.category}</span>
                      <time className="rn-fig" dateTime={l.createdAt}>
                        {dateDay(dayKey(l.createdAt))}
                      </time>
                    </a>
                    <IconButton icon="pencil" label={`Edit link ${l.title || shortUrl(l.url)}`} tone="ghost" size="sm" onClick={() => setDialog({ item: l })} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {filtered && shown.length > 0 && (
            <p className="pj-filter-note" role="status">
              Menampilkan {shown.length} dari {items.length} link
            </p>
          )}
        </div>

        <aside className="rn-side">
          <section className="dc">
            <h2 className="dc-hd">Link per kategori</h2>
            {perCategory.length === 0 ? (
              <p className="dc-note">Kategori muncul di sini setelah ada link yang disimpan.</p>
            ) : (
              <ul ref={ref} className={seen ? 'ch-feat in' : 'ch-feat'}>
                {perCategory.map((c, i) => (
                  <li key={c.name}>
                    <span className="ch-feat-name">{c.name}</span>
                    <span className="ch-feat-n">{c.n}</span>
                    <span className="ch-track" aria-hidden="true">
                      <i style={{ width: `${(c.n / most) * 100}%`, ['--i' as string]: i } as CSSProperties} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dc">
            <h2 className="dc-hd">Sumber</h2>
            <dl className="rn-facts lk-sources">
              {sources.map((s) => (
                <div key={s.key}>
                  <dt>
                    <SourceMark source={s} />
                    {s.name}
                  </dt>
                  <dd>{s.n}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      {dialog && (
        <LinkForm
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          categories={categories}
          api={api}
          onSaved={(l) => {
            const rest = data.items.filter((x) => x.id !== l.id);
            setData({ items: [l, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id) });
            setDialog(null);
          }}
          onDeleted={(id) => {
            setData({ items: data.items.filter((x) => x.id !== id) });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </RoomPage>
  );
}
