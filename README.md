# Portfolio — Salman Faris Siddiq

Situs portofolio satu halaman: React 19 + TypeScript + Vite. Tema gelap dan terang ikut pengaturan sistem pengunjung, bisa diganti lewat tombol di navigasi, dan pilihannya diingat di `localStorage`.

## Menjalankan

```bash
npm install
npm run dev       # server pengembangan di http://localhost:5173
npm run build     # cek tipe + build produksi ke folder dist/
npm run preview   # sajikan hasil build secara lokal
```

Butuh Node.js 20.19+ atau 22.12+.

## Data di Neon

Konten situs (CV, angka di hero, "Worked with", daftar proyek, experience) disimpan di Neon project **Personal Website**, branch `production`:

- **Postgres**: tabel `site_stats`, `partners`, `projects`, `experience`, `cv_file` (skema di `db/schema.sql`).
- **Object Storage**: bucket privat `documents` menyimpan PDF CV (`cv/`), logo partner (`logos/`), dan gambar proyek (`shots/`).
- **Function `api`** (`api/index.ts`, Hono): `GET /content` untuk situs, `GET /cv` untuk unduhan CV, `GET /logo/:id` untuk logo, `GET /shot/:id` untuk gambar proyek, dan rute `/admin/*` yang dilindungi `ADMIN_KEY`.

Logo di "Worked with" tampil dengan warna aslinya (SVG, PNG, JPEG, atau WebP, maksimal 2 MB; latar transparan paling rapi di kedua tema). Partner tanpa logo tampil sebagai nama.

Dashboard pribadi ada di **`/mydashboard`**, terpisah dari portofolio (tidak mengambil data situs) dan dikunci dengan `ADMIN_KEY` yang sama. Halaman depannya maket rumah isometrik: tiap ruang punya pin bernomor (01 sampai 08) yang membuka halaman ruang itu, dengan indeks ruang di bawahnya dan ringkasan di samping (sisa hari tahun ini, progress semua task, task selesai per hari). Yang sudah berisi baru Ruang Kerja: daftar project, lalu halaman tiap project dengan grafik progress, total task dibuat dan selesai, progress per fitur, serta papan kanban (Not started, On progress, Selesai) atau tampilan list. Data di tabel `board_*`, lewat rute `/admin/board/*`. **Ruang Lari** berisi jadwal menuju lari sejauh umur di ulang tahun berikutnya (lari tiap 2 hari: 5 km di hari kerja, lari panjang di akhir pekan mulai 10 km dan naik 1 km tiap minggu), peta rute dari file GPX (Leaflet + OpenStreetMap), dan riwayat lari. Tanggal lahir dan tanggal mulai diisi di halamannya, tidak disimpan di kode. Data di tabel `runs` dan `run_settings`, lewat rute `/admin/run/*`. **Ruang Vocabulary** memberi 5 kata bahasa Inggris baru per hari (bank kata A2 menuju B1 di `src/data/vocab.ts`, tiap kata dalam satu kalimat) ditambah 5 kata hari sebelumnya untuk diulang; data di tabel `vocab_days`, lewat rute `/admin/vocab/*`. **Ruang TV** mencatat film dan series beserta platformnya (Netflix, Apple TV+, dan lainnya), status, rating dan tanggal selesai; data di tabel `tv_items`, lewat rute `/admin/tv/*`. Pencarian judul, poster dan logo platform memakai TMDB lewat Function; isi `TMDB_API_KEY` di `.env.local` (API key gratis dari themoviedb.org) lalu deploy. Tanpa key itu, judul diketik manual dan platform tampil sebagai teks. **Ruang Lampiran** mengumpulkan link tersimpan dari Threads, X, Instagram, TikTok atau situs lain, dikelompokkan per kategori (Kuliner, Programmer, Wisata, Event, dan kategori buatan sendiri); data di tabel `saved_links`, lewat rute `/admin/links/*`. Ruang lain masih kosong.

Kelola datanya di **`/data-project`** (tidak ada link dari situs; ketik URL-nya). Masukkan nilai `ADMIN_KEY` dari `.env.local`.

```bash
neon deploy --env .env.local   # deploy bucket + Function setelah mengubah neon.ts atau api/
npm run db:migrate             # terapkan db/schema.sql (aman diulang)
npm run db:seed                # isi tabel kosong dari data bawaan di src/data/
```

URL Function dibaca dari `.env.local` saat build (`vite.config.ts`). Kalau API tidak bisa dihubungi, situs tetap tampil dengan data bawaan di `src/data/`.

## Sebelum deploy

1. **CV**: unggah PDF di `/data-project`. Semua tombol "Download CV" mengarah ke `GET /cv` di Function.
2. **Env**: hosting perlu `NEON_BRANCH_ID` dan `NEON_FUNCTION_HOST_SUFFIX` saat build (atau `VITE_API_URL` berisi URL Function). Jangan taruh `DATABASE_URL` atau `ADMIN_KEY` di hosting frontend; keduanya hanya dipakai Function dan skrip lokal.
3. **Rewrite**: `/data-project` adalah route sisi klien, jadi hosting harus mengarahkan path itu ke `index.html`. Untuk Vercel sudah diatur di `vercel.json`; di hosting lain (Netlify, Nginx) buat rewrite yang sama.
4. **Deploy**: hasil `npm run build` ada di `dist/` dan berupa file statis, jadi bisa diunggah ke Vercel, Netlify, Cloudflare Pages, atau hosting biasa (Nginx/Apache). Di Vercel/Netlify cukup pilih preset **Vite**.

## Struktur

```
public/
  favicon.svg
  images/            halftone-dark.webp, halftone-light.webp, portrait.webp
api/                 Neon Function (Hono): index.ts, validate.ts
db/                  schema.sql, migrate.ts, seed.ts
neon.ts              layanan Neon (bucket, Function, ADMIN_KEY)
src/
  admin/             halaman /data-project
  dashboard/         halaman /mydashboard (dashboard pribadi, sidebar ikon)
  data/
    site.ts          email, tautan sosial, link CV, menu
    content.ts       tipe konten + data bawaan (seed dan fallback)
    projects.ts      proyek bawaan di bagian "Selected work"
    experience.ts    timeline bawaan
    api.ts           pemanggil API
    useContent.ts    memuat konten dari Neon
  hooks/
    useTheme.ts      tema gelap/terang (class `light` di <html>)
    useJakartaClock.ts  jam WIB di hero dan footer
  components/        Nav, Hero, Partners, Work (+WorkPreview), Skills (+SkillArt),
                     Experience, About, Contact, Footer, Icons
  styles/global.css  semua token warna dan gaya
```

## Mengubah konten

- **Proyek, experience, CV, angka, partner**: ubah di `/data-project`. Field `discipline` menentukan bagian proyek (Frontend, Backend, UI/UX Designer). Jumlah proyek, tab, nomor, dan indikator progres menyesuaikan otomatis.
- **Warna**: token ada di bagian atas `src/styles/global.css` (`:root` untuk gelap, `:root.light` untuk terang). Aksen utama: `--acc`.
- **Gambar proyek**: unggah di `/data-project` → Project list → buka proyek → "Images in place of the sketch". Bisa pilih beberapa file sekaligus (PNG, JPEG, WebP, atau SVG, maksimal 5 MB per file, maksimal 12 per proyek). Urutan diatur dengan tombol ← →, gambar pertama tampil duluan. Lalu Save. Di situs, gambar tampil satu per satu dengan panah dan deretan thumbnail (tombol panah kiri/kanan di keyboard juga bisa), dan bisa diklik untuk ukuran penuh. Proyek tanpa gambar tetap memakai sketsa (`WorkPreview.tsx`).
- **Job description proyek**: isi "Job description" di tiap proyek, satu tugas per baris (maksimal 20). Baris kosong diabaikan. Kalau diisi, tombol "Job description" muncul di detail proyek dan membuka modal berisi daftar tugasnya. Proyek tanpa job description tidak menampilkan tombol.
- **Domain proyek**: isi "Domain (optional)" di tiap proyek (cukup `example.com`; tersimpan sebagai `https://example.com/`). Baris Domain hanya muncul di detail proyek kalau diisi.
- **Form kontak**: tidak ada backend. Tombol "Send message" membuka aplikasi email pengunjung dengan isian form. Kalau nanti mau kirim langsung, sambungkan ke layanan seperti Formspree atau endpoint API sendiri di `Contact.tsx`.

## Font

Geist dan Geist Mono (SIL Open Font License) dipasang lewat `@fontsource-variable`, jadi ikut terbundel dan tidak bergantung ke Google Fonts.
# personal-web-porto
