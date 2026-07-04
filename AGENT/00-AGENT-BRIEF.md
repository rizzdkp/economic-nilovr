# Agent brief — Aplikasi Pencatatan Keuangan Pribadi

Baca file ini terlebih dahulu sebelum menyentuh kode apa pun. File ini adalah peta jalan; detail teknis ada di file-file lain dalam folder yang sama.

## Urutan baca file

1. `00-AGENT-BRIEF.md` (file ini) — konteks & aturan main
2. `01-PROJECT-SPEC.md` — semua fitur & requirement fungsional
3. `02-DESIGN-SYSTEM.md` — aturan visual glassmorphism & anti-AI-slop
4. `03-TECH-ARCHITECTURE.md` — stack, skema database, struktur folder, API
5. `04-DEPLOYMENT-VPS.md` — cara deploy ke VPS dengan domain sendiri

## Ringkasan proyek

Aplikasi web pencatatan keuangan pribadi, dilindungi satu password (bukan sistem multi-user), dengan multi-dompet, kategori, filter transaksi, dan dashboard visual. Tema visual: glassmorphism yang terasa dirancang manusia, bukan template AI generik.

## Urutan eksekusi (wajib berurutan)

Kerjakan tahap demi tahap. Jangan lompat ke tahap berikutnya sebelum tahap sebelumnya selesai dan bebas error.

1. **Setup project & tooling** — init Next.js + TypeScript + Tailwind, install dependency dari `03-TECH-ARCHITECTURE.md`, setup ESLint/Prettier.
2. **Database & schema** — buat schema Prisma sesuai `03-TECH-ARCHITECTURE.md`, jalankan migrasi awal, seed kategori default.
3. **Auth password gate** — implementasi sesuai spesifikasi auth di `01-PROJECT-SPEC.md`.
4. **CRUD inti** — dompet → kategori → transaksi (urutan ini penting karena transaksi bergantung pada dompet & kategori).
5. **Dashboard & UI** — bangun layout sesuai `02-DESIGN-SYSTEM.md`, terapkan ke semua halaman yang sudah ada fungsinya.
6. **Chart & laporan** — grafik tren dan breakdown kategori.
7. **Responsive pass** — uji ulang semua halaman di breakpoint mobile/tablet/desktop.
8. **Build & error check** — jalankan `npm run build`, pastikan nol error TypeScript dan nol warning ESLint yang blocking.
9. **Deployment** — ikuti `04-DEPLOYMENT-VPS.md` langkah demi langkah, jangan skip verifikasi di tiap langkah.

Setelah setiap tahap selesai, tulis ringkasan singkat: apa yang selesai, file apa yang dibuat/diubah, dan apakah build/test lolos.

## Scope lock

Hanya kerjakan yang tertulis di `01-PROJECT-SPEC.md`. Jangan menambah:
- Sistem multi-user / registrasi akun
- Integrasi bank/payment gateway
- Notifikasi email/push
- Fitur AI/prediksi otomatis

Kalau merasa ada fitur "yang pasti dibutuhkan" tapi tidak tertulis di spec, tulis sebagai catatan/rekomendasi di akhir, jangan langsung diimplementasikan.

## Stop conditions — berhenti dan tanya dulu sebelum:

- Menjalankan migrasi database yang destruktif (drop table, reset data) di luar tahap setup awal
- Mengubah domain/DNS/konfigurasi server di luar yang diinstruksikan di `04-DEPLOYMENT-VPS.md`
- Install dependency besar di luar daftar di `03-TECH-ARCHITECTURE.md`
- Mengubah kredensial (password gate, database, SSH) tanpa konfirmasi eksplisit

## Definisi "selesai tanpa error"

- `npm run build` sukses tanpa error
- Tidak ada `any` yang tidak perlu di TypeScript (gunakan tipe yang benar dari Prisma client)
- Semua halaman bisa diakses dan berfungsi setelah password gate dilewati
- Aplikasi berjalan stabil di VPS, bisa diakses lewat domain dengan HTTPS aktif (bukan hanya `localhost`)
- Tidak ada console error di browser saat navigasi normal (buka dashboard, tambah transaksi, ganti dompet, lihat grafik)

## Placeholder yang harus diganti user sebelum deploy

Semua file di sini memakai placeholder berikut — user akan mengisi nilai aslinya:

| Placeholder | Diisi dengan |
|---|---|
| `yourdomain.com` | Domain asli milik user |
| `your_vps_ip` | IP address VPS |
| `your_db_password` | Password database PostgreSQL |
| `your_app_password_hash` | Hash password untuk gerbang login aplikasi |
| `your_ssh_user` | Username SSH di VPS |

Jangan pernah menaruh nilai asli kredensial langsung di kode atau di commit — selalu lewat file `.env` yang di-gitignore.
