import { Suspense, lazy, useId, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react';
import { ApiError, adminRequest } from '../data/api';
import { RUN_LIMITS, type Run, type RunPoint, type RunSettings } from '../data/run';
import { Count, Tip, useSeen, useWidth } from './charts';
import { Glyph, IconButton } from './icons';
import { FormActions, Modal } from './ProjectBoard';
import { RoomPage } from './Rooms';
import {
  LONG_START_KM,
  WEEKDAY_KM,
  dateDay,
  dateLong,
  daysBetween,
  goalOf,
  kmByDate,
  kmText,
  paceText,
  parseGpx,
  parseTime,
  planOf,
  planStatusLabel,
  statusOf,
  timeText,
  tracePoints,
  useRunData,
  weeksOf,
  type PlanDay,
  type PlanWeek,
} from './runPlan';
import { dayKey } from './stats';

/*
 * Ruang Lari: the plan toward running one's age on the next birthday, the route of a run
 * on a map, and the history of logged runs. Runs are logged by hand or from a GPX file,
 * which also brings the route.
 */

const RunMap = lazy(() => import('./RunMap'));

type Api = <T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown) => Promise<T>;
const msg = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan.');

const kindLabel: Record<PlanDay['kind'], string> = { weekday: 'Hari kerja', weekend: 'Lari panjang akhir pekan', birthday: 'Hari ulang tahun' };

const inDays = (n: number) => (n <= 0 ? 'Hari ini' : n === 1 ? 'Besok' : `${n} hari lagi`);

/** A route drawn small, north up. */
function Trace({ route, size = 40 }: { route: RunPoint[]; size?: number }) {
  return (
    <svg className="rn-trace" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <polyline points={tracePoints(route, size, 4)} />
    </svg>
  );
}

/* ------------------------------------------------------------------ forms */

/** The two dates the plan is built from. Shown in the page before they are set, and in a dialog after. */
function SettingsForm(props: { settings: RunSettings | null; api: Api; onSaved: (s: RunSettings) => void }) {
  const [birthday, setBirthday] = useState(props.settings?.birthday ?? '');
  const [start, setStart] = useState(props.settings?.start ?? dayKey(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ids = { birthday: useId(), start: useId() };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!birthday) return setError('Isi tanggal lahir dulu.');
    if (!start) return setError('Isi tanggal mulai program.');
    if (birthday >= start) return setError('Tanggal lahir harus sebelum tanggal mulai program.');
    setBusy(true);
    setError('');
    try {
      const res = await props.api<{ settings: RunSettings }>('PUT', '/run/settings', { birthday, start });
      props.onSaved(res.settings);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  return (
    <form className="kb-form" onSubmit={save} noValidate>
      <div className="rn-pair">
        <div className="adm-field">
          <label htmlFor={ids.birthday}>Tanggal lahir</label>
          <input id={ids.birthday} type="date" value={birthday} max={start || undefined} onChange={(e) => setBirthday(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor={ids.start}>Program mulai</label>
          <input id={ids.start} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
      </div>
      <p className="ft-hint">
        Jadwal dihitung dari dua tanggal ini: lari tiap 2 hari sejak program mulai, {WEEKDAY_KM} km di hari kerja, dan lari panjang di akhir pekan mulai {LONG_START_KM} km
        lalu naik 1 km tiap minggu sampai sejauh umur di ulang tahun berikutnya.
      </p>
      {error && (
        <p className="adm-status error" role="alert">
          {error}
        </p>
      )}
      <div className="kb-dialog-actions">
        <span />
        <button type="submit" className="bt p" disabled={busy}>
          <Glyph name="check" />
          {props.settings ? 'Simpan' : 'Buat jadwal'}
        </button>
      </div>
    </form>
  );
}

/** Logs a run or edits one. A GPX file fills in the distance, the time and the date, and brings the route. */
function RunForm(props: { run: Run | null; date: string; km: number | null; api: Api; onSaved: (r: Run) => void; onDeleted: (id: number) => void; onClose: () => void }) {
  const r = props.run;
  const [date, setDate] = useState(r?.date ?? props.date);
  const [km, setKm] = useState(r ? String(r.km) : props.km ? String(props.km) : '');
  const [time, setTime] = useState(r?.seconds ? timeText(r.seconds) : '');
  const [note, setNote] = useState(r?.note ?? '');
  const [route, setRoute] = useState<RunPoint[] | null>(r?.route ?? null);
  const [fileNote, setFileNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const ids = { date: useId(), km: useId(), time: useId(), note: useId(), file: useId() };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    try {
      const track = parseGpx(await f.text(), RUN_LIMITS.routePoints);
      setRoute(track.route);
      setKm(String(track.km));
      if (track.seconds) setTime(timeText(track.seconds));
      if (track.date) setDate(track.date);
      setFileNote(`${f.name}: ${kmText(track.km)} km${track.seconds ? `, ${timeText(track.seconds)}` : ''}. Jarak, waktu dan tanggal diisi dari file ini.`);
    } catch (err) {
      setFileNote('');
      setError(msg(err));
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const distance = Number(km.replace(',', '.'));
    if (!date) return setError('Isi tanggal lari.');
    if (!Number.isFinite(distance) || distance <= 0) return setError('Isi jarak dalam km, misalnya 5 atau 10,5.');
    if (distance > RUN_LIMITS.km) return setError(`Jarak paling jauh ${RUN_LIMITS.km} km.`);
    const seconds = time.trim() ? parseTime(time) : null;
    if (time.trim() && seconds === null) return setError('Tulis waktu sebagai menit:detik atau jam:menit:detik, misalnya 32:15.');
    setBusy(true);
    setError('');
    try {
      const payload = { date, km: distance, seconds, note, route };
      const res = r ? await props.api<{ run: Run }>('PATCH', `/run/runs/${r.id}`, payload) : await props.api<{ run: Run }>('POST', '/run/runs', payload);
      props.onSaved(res.run);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!r) return;
    setBusy(true);
    try {
      await props.api('DELETE', `/run/runs/${r.id}`);
      props.onDeleted(r.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={r ? 'Edit lari' : 'Catat lari'} onClose={props.onClose}>
      <form className="kb-form" onSubmit={save} noValidate>
        <div className="adm-field">
          <label htmlFor={ids.file}>Rute dari file GPX (opsional)</label>
          <div className="rn-file">
            {route && <Trace route={route} size={44} />}
            <input ref={file} id={ids.file} className="sr-only" type="file" accept=".gpx,application/gpx+xml" onChange={(e) => readFile(e.target.files?.[0])} />
            <button type="button" className="bt" onClick={() => file.current?.click()}>
              <Glyph name="plus" />
              {route ? 'Ganti file' : 'Pilih file GPX'}
            </button>
            {route && (
              <button
                type="button"
                className="bt"
                onClick={() => {
                  setRoute(null);
                  setFileNote('');
                  if (file.current) file.current.value = '';
                }}
              >
                Hapus rute
              </button>
            )}
          </div>
          <p className="ft-hint" role="status">
            {fileNote || (route ? `Rute tersimpan, ${route.length} titik.` : 'Ekspor GPX dari jam atau aplikasi lari untuk menampilkan rutenya di peta.')}
          </p>
        </div>
        <div className="rn-pair">
          <div className="adm-field">
            <label htmlFor={ids.date}>Tanggal</label>
            <input id={ids.date} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor={ids.km}>Jarak (km)</label>
            <input id={ids.km} inputMode="decimal" autoFocus={!r} placeholder="5" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
        </div>
        <div className="adm-field">
          <label htmlFor={ids.time}>Waktu (opsional)</label>
          <input id={ids.time} inputMode="numeric" placeholder="menit:detik" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor={ids.note}>Catatan (opsional)</label>
          <textarea id={ids.note} rows={2} value={note} maxLength={RUN_LIMITS.note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <FormActions
          busy={busy}
          isNew={!r}
          error={error}
          onDelete={remove}
          deleteText={
            <>
              Hapus lari <b>{r && dateDay(r.date)}</b> ({r && kmText(r.km)} km)? Tidak bisa dibatalkan.
            </>
          }
        />
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ graphics */

/**
 * The long run week by week: the plan as a stepped line that climbs to the goal, and the
 * longest run actually logged each week as a bar under it.
 */
function PlanChart({ weeks, goalKm, today }: { weeks: PlanWeek[]; goalKm: number; today: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const w = useWidth(ref);
  const [at, setAt] = useState<number | null>(null);
  const H = 200;
  const m = { l: 30, r: 14, t: 26, b: 24 };
  const top = Math.ceil(Math.max(goalKm, ...weeks.map((k) => k.actual ?? 0)) / 10) * 10;
  const iw = Math.max(1, w - m.l - m.r);
  const ih = H - m.t - m.b;
  const band = iw / weeks.length;
  const x = (i: number) => m.l + i * band;
  const y = (v: number) => m.t + ih - (v / top) * ih;
  const planned = weeks.map((k, i) => ({ i, km: k.plan })).filter((p): p is { i: number; km: number } => p.km !== null);
  const line = planned.map((p, n) => `${n === 0 ? 'M' : 'L'}${x(p.i)} ${y(p.km)}H${x(p.i + 1)}`).join('');
  const now = weeks.findIndex((k, i) => k.key <= today && (weeks[i + 1]?.key ?? '9999') > today);
  const bar = Math.max(2, Math.min(18, band - 2));

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setAt(Math.max(0, Math.min(weeks.length - 1, Math.floor((e.clientX - box.left - m.l) / band))));
  };

  return (
    <div ref={ref} className={seen ? 'ch-burn rn-chart in' : 'ch-burn rn-chart'}>
      <ul className="ch-legend">
        <li>
          <i className="bar" aria-hidden="true" />
          Lari terjauh minggu itu
        </li>
        <li>
          <i className="made" aria-hidden="true" />
          Rencana lari panjang
        </li>
      </ul>
      <div className="ch-burn-plot">
        {w > 0 && (
          <svg
            width={w}
            height={H}
            role="img"
            aria-label={`Rencana lari panjang per minggu dari ${planned[0]?.km ?? goalKm} km sampai ${goalKm} km, ${weeks.length} minggu.`}
            onPointerMove={move}
            onPointerDown={move}
            onPointerLeave={() => setAt(null)}
          >
            {[0, top / 2, top].map((v) => (
              <g key={v}>
                <line className="ch-grid" x1={m.l} x2={w - m.r} y1={y(v)} y2={y(v)} />
                <text className="ch-tick" x={m.l - 8} y={y(v) + 4} textAnchor="end">
                  {v}
                </text>
              </g>
            ))}
            {now >= 0 && <rect className="rn-now" x={x(now)} y={m.t} width={band} height={ih} />}
            {at !== null && <rect className="rn-hover" x={x(at)} y={m.t} width={band} height={ih} />}
            {weeks.map(
              (k, i) =>
                k.actual !== null && (
                  <path
                    key={k.key}
                    className="rn-bar"
                    style={{ ['--i' as string]: i } as CSSProperties}
                    d={`M${x(i) + (band - bar) / 2} ${y(0)}V${y(k.actual) + 3}q0 -3 3 -3h${bar - 6}q3 0 3 3V${y(0)}Z`}
                  />
                ),
            )}
            <path className="ch-line made" d={line} pathLength={1} />
            <circle className="rn-goal" cx={x(weeks.length - 1) + band / 2} cy={y(goalKm)} r="5" />
            <text className="ch-tick rn-goal-tx" x={w - m.r} y={y(goalKm) - 11} textAnchor="end">
              {goalKm} km
            </text>
            <text className="ch-tick" x={m.l} y={H - 6}>
              {weeks[0].label}
            </text>
            <text className="ch-tick" x={w - m.r} y={H - 6} textAnchor="end">
              {weeks[weeks.length - 1].goal ? 'Ulang tahun' : weeks[weeks.length - 1].label}
            </text>
          </svg>
        )}
        {at !== null && w > 0 && (
          <Tip x={((x(at) + band / 2) / w) * 100} side={at > weeks.length / 2 ? 'l' : 'r'}>
            <span>Minggu {weeks[at].label}</span>
            <b>{weeks[at].plan === null ? 'Tanpa lari panjang' : `Rencana ${kmText(weeks[at].plan!)} km`}</b>
            <b>{weeks[at].actual === null ? 'Belum ada lari' : `Terjauh ${kmText(weeks[at].actual!)} km`}</b>
          </Tip>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

type Dialog = { type: 'run'; run: Run | null; date: string; km: number | null } | { type: 'settings' };

export default function RunRoom(props: { adminKey: string; onLocked: () => void; onHome: () => void }) {
  const { data, setData, error, retry } = useRunData(props.adminKey, props.onLocked);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  const api: Api = async (method, path, body) => {
    try {
      return await adminRequest(props.adminKey, method, path, body);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) props.onLocked();
      throw err;
    }
  };

  if (!data) {
    return (
      <RoomPage room="run" onHome={props.onHome}>
        {error ? (
          <div className="adm-error" role="alert">
            <p>Data lari tidak bisa dimuat: {error}</p>
            <IconButton icon="retry" label="Coba lagi" onClick={retry} />
          </div>
        ) : (
          <p className="adm-status busy" role="status">
            Memuat data lari…
          </p>
        )}
      </RoomPage>
    );
  }

  const saveSettings = (settings: RunSettings) => {
    setData({ ...data, settings });
    setDialog(null);
  };

  if (!data.settings) {
    return (
      <RoomPage room="run" onHome={props.onHome}>
        <section className="dc rn-setup" aria-label="Buat jadwal lari">
          <h2 className="dc-hd">Buat jadwal lari</h2>
          <SettingsForm settings={null} api={api} onSaved={saveSettings} />
        </section>
      </RoomPage>
    );
  }

  const { settings, runs } = data;
  const today = dayKey(new Date());
  const goal = goalOf(settings);
  const plan = planOf(settings);
  const logged = kmByDate(runs);
  const weeks = weeksOf(plan, runs);
  const left = daysBetween(today, goal.date);
  const totalKm = runs.reduce((sum, r) => sum + r.km, 0);
  const next = plan.find((d) => d.date >= today && statusOf(d, logged, today) !== 'done') ?? null;
  const nextAt = next ? plan.indexOf(next) : plan.length;
  const schedule = plan.slice(Math.max(0, nextAt - 2), nextAt + 6);
  const due = plan.filter((d) => d.date < today);
  const kept = due.filter((d) => statusOf(d, logged, today) === 'done').length;
  const longest = runs.reduce((best, r) => Math.max(best, r.km), 0);
  const timed = runs.filter((r) => r.seconds);
  const planFor = new Map(plan.map((d) => [d.date, d]));
  const withRoute = runs.filter((r) => r.route);
  const shown = withRoute.find((r) => r.id === picked) ?? withRoute[0] ?? null;

  const log = (date = today, km: number | null = planFor.get(date)?.km ?? null) => setDialog({ type: 'run', run: null, date, km });

  return (
    <RoomPage
      room="run"
      onHome={props.onHome}
      stats={
        <dl className="rm-stats">
          <div>
            <dt>Target</dt>
            <dd>
              <Count value={goal.age} /> km
            </dd>
          </div>
          <div>
            <dt>{left >= 0 ? 'Hari lagi' : 'Hari lewat'}</dt>
            <dd>
              <Count value={Math.abs(left)} />
            </dd>
          </div>
          <div>
            <dt>Total lari</dt>
            <dd>
              {kmText(Math.round(totalKm * 10) / 10)} km
            </dd>
          </div>
        </dl>
      }
      action={
        <div className="rn-actions">
          <button type="button" className="bt" onClick={() => setDialog({ type: 'settings' })}>
            <Glyph name="pencil" />
            Atur
          </button>
          <button type="button" className="bt p" onClick={() => log()}>
            <Glyph name="plus" />
            Catat lari
          </button>
        </div>
      }
    >
      <div className="rm-grid">
        <div className="rn-main">
          <section className="dc">
            <h2 className="dc-hd">
              Lari panjang tiap minggu, menuju {goal.age} km pada {dateLong(goal.date)}
            </h2>
            <PlanChart weeks={weeks} goalKm={goal.age} today={today} />
          </section>

          <section className="dc rn-mapcard" aria-label="Peta lari">
            <h2 className="dc-hd">
              Peta lari
              {shown && (
                <span>
                  {dateDay(shown.date)} · {kmText(shown.km)} km
                </span>
              )}
            </h2>
            {shown?.route ? (
              <Suspense
                fallback={
                  <p className="rn-map dc-note" role="status">
                    Memuat peta…
                  </p>
                }
              >
                <RunMap route={shown.route} label={`Rute lari ${dateLong(shown.date)}, ${kmText(shown.km)} km`} />
              </Suspense>
            ) : (
              <p className="dc-note">Belum ada rute. Saat mencatat lari, pilih file GPX dari jam atau aplikasi lari; rutenya tampil di peta ini.</p>
            )}
          </section>

          <section className="rn-history" aria-label="Riwayat lari">
            <h2 className="rn-history-hd">
              Riwayat lari
              <span>{runs.length} kali</span>
            </h2>
            {runs.length === 0 ? (
              <p className="rm-none">Belum ada lari yang dicatat. Catat lari pertama dengan tombol Catat lari di atas.</p>
            ) : (
              <ul>
                {runs.map((r, i) => {
                  const target = planFor.get(r.date);
                  return (
                    <li key={r.id} className={shown?.id === r.id ? 'rn-run on' : 'rn-run'} style={{ ['--i' as string]: Math.min(i, 12) } as CSSProperties}>
                      <button
                        type="button"
                        className="rn-run-main"
                        disabled={!r.route}
                        aria-pressed={r.route ? shown?.id === r.id : undefined}
                        aria-label={`${dateLong(r.date)}, ${kmText(r.km)} km${r.route ? ': tampilkan di peta' : ''}`}
                        onClick={() => setPicked(r.id)}
                      >
                        {r.route ? <Trace route={r.route} /> : <span className="rn-trace none" aria-hidden="true" />}
                        <span className="rn-run-tx">
                          <b>{dateDay(r.date)}</b>
                          <span>{r.note || (target ? `Target ${kmText(target.km)} km${(logged.get(r.date) ?? 0) >= target.km ? ', tercapai' : ''}` : 'Di luar jadwal')}</span>
                        </span>
                        <span className="rn-fig">
                          <b>{kmText(r.km)}</b> km
                        </span>
                        <span className="rn-fig">{r.seconds ? timeText(r.seconds) : '–'}</span>
                        <span className="rn-fig">{r.seconds ? `${paceText(r.seconds, r.km)} /km` : '–'}</span>
                      </button>
                      <IconButton icon="pencil" label={`Edit lari ${dateDay(r.date)}`} tone="ghost" size="sm" onClick={() => setDialog({ type: 'run', run: r, date: r.date, km: null })} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="rn-side">
          <section className="dc">
            <h2 className="dc-hd">Lari berikutnya</h2>
            {next ? (
              <>
                <p className="rn-next">
                  <b>
                    <Count value={next.km} />
                  </b>
                  <span>km</span>
                </p>
                <p className="rn-next-tx">
                  <b>{dateLong(next.date)}</b>
                  <span>
                    {kindLabel[next.kind]} · {inDays(daysBetween(today, next.date))}
                  </span>
                </p>
                {next.date === today && (
                  <button type="button" className="bt" onClick={() => log(today, next.km)}>
                    <Glyph name="check" />
                    Catat lari hari ini
                  </button>
                )}
              </>
            ) : (
              <p className="dc-note">Jadwal ini sudah selesai. Buka Atur dan geser tanggal mulai untuk menyusun jadwal ke ulang tahun berikutnya.</p>
            )}
          </section>

          <section className="dc">
            <h2 className="dc-hd">Jadwal</h2>
            <ol className="rn-plan">
              {schedule.map((d, i) => {
                const st = statusOf(d, logged, today);
                return (
                  <li key={d.date} className={st} style={{ ['--i' as string]: i } as CSSProperties}>
                    <span className={`rn-mark ${st}`} role="img" aria-label={planStatusLabel[st]} title={planStatusLabel[st]} />
                    <span className="rn-plan-tx">
                      <b>{dateDay(d.date)}</b>
                      <span>{d.kind === 'weekday' ? planStatusLabel[st] : `${kindLabel[d.kind]} · ${planStatusLabel[st]}`}</span>
                    </span>
                    <span className="rn-fig">
                      <b>{kmText(d.km)}</b> km
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="dc">
            <h2 className="dc-hd">Sejauh ini</h2>
            <dl className="rn-facts">
              <div>
                <dt>Jadwal ditepati</dt>
                <dd>{due.length === 0 ? '–' : `${kept} dari ${due.length}`}</dd>
              </div>
              <div>
                <dt>Lari terjauh</dt>
                <dd>{longest ? `${kmText(longest)} km` : '–'}</dd>
              </div>
              <div>
                <dt>Pace rata-rata</dt>
                <dd>
                  {timed.length
                    ? `${paceText(
                        timed.reduce((s, r) => s + r.seconds!, 0),
                        timed.reduce((s, r) => s + r.km, 0),
                      )} /km`
                    : '–'}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {dialog?.type === 'settings' && (
        <Modal title="Atur jadwal lari" onClose={() => setDialog(null)}>
          <SettingsForm settings={settings} api={api} onSaved={saveSettings} />
        </Modal>
      )}
      {dialog?.type === 'run' && (
        <RunForm
          key={dialog.run?.id ?? 'new'}
          run={dialog.run}
          date={dialog.date}
          km={dialog.km}
          api={api}
          onSaved={(r) => {
            const rest = runs.filter((x) => x.id !== r.id);
            setData({ ...data, runs: [...rest, r].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id) });
            if (r.route) setPicked(r.id);
            setDialog(null);
          }}
          onDeleted={(id) => {
            setData({ ...data, runs: runs.filter((x) => x.id !== id) });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </RoomPage>
  );
}
