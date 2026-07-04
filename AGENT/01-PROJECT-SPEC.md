# Spesifikasi produk — Aplikasi Pencatatan Keuangan Pribadi

## 1. Auth — Password gate

- Bukan sistem akun/registrasi. Satu password tunggal untuk mengakses seluruh aplikasi (dipakai sendiri oleh satu orang/keluarga).
- Halaman `/login`: satu input password + tombol masuk. Desain mengikuti tema glassmorphism di `02-DESIGN-SYSTEM.md` — jangan dibuat polos/berbeda dari halaman lain.
- Password asli disimpan sebagai hash (bcrypt/argon2) di environment variable `APP_PASSWORD_HASH`, **bukan** di database dan **bukan** plaintext.
- Verifikasi dilakukan di server (API route/server action), bukan di client.
- Jika berhasil, buat session token (JWT atau random token) disimpan di cookie `httpOnly`, `secure`, `sameSite=lax`, masa berlaku 30 hari (bisa diperpanjang tiap akses).
- Semua route selain `/login` dan asset statis wajib dicek sesi via middleware Next.js (`middleware.ts`). Kalau sesi tidak valid, redirect ke `/login`.
- Salah password: tampilkan pesan generik "Password salah, coba lagi" — jangan bocorkan info sistem apa pun (tidak ada "user not found", karena memang tidak ada konsep user).
- Rate limit sederhana: maksimal 10 percobaan per 15 menit per IP (in-memory cukup untuk skala single-user, tidak perlu Redis).
- Tombol "Keluar" yang menghapus cookie sesi, tersedia di navigasi utama.

## 2. Dompet (Wallets)

Field:
- `id`, `nama`, `tipe` (enum: `cash`, `bank`, `e_wallet`, `lainnya`), `saldo_awal` (decimal), `warna` (untuk badge), `dibuat_pada`

Perilaku:
- Saldo berjalan dompet = `saldo_awal` + total pemasukan ke dompet itu − total pengeluaran dari dompet itu ± transfer masuk/keluar. **Dihitung dinamis dari transaksi, jangan disimpan sebagai kolom yang di-update manual** (hindari data drift).
- CRUD penuh: tambah, edit nama/tipe/warna, hapus (hanya boleh hapus jika tidak punya transaksi — kalau ada transaksi, tampilkan konfirmasi "arsipkan" alih-alih hapus permanen, atau blok penghapusan dengan pesan jelas).
- Halaman daftar dompet menampilkan kartu per dompet dengan saldo berjalan masing-masing.
- Transfer antar dompet dicatat sebagai satu entitas transaksi bertipe `transfer` yang punya `dompet_asal_id` dan `dompet_tujuan_id` — bukan dua transaksi terpisah yang bisa desync.

## 3. Kategori

Field:
- `id`, `nama`, `jenis` (enum: `income`, `expense` — kategori transfer tidak butuh kategori), `warna`, `ikon` (nama ikon dari Tabler Icons), `is_default` (boolean)

Kategori default yang wajib di-seed saat migrasi awal:

Pengeluaran: Makanan & minuman, Transportasi, Tagihan & utilitas, Belanja, Kesehatan, Hiburan, Pendidikan, Lainnya.
Pemasukan: Gaji, Bonus, Hasil usaha, Investasi, Lainnya.

Perilaku:
- User bisa tambah kategori custom dengan nama, warna, dan ikon sendiri.
- Kategori default tidak bisa dihapus (biar histori transaksi lama tidak kehilangan referensi), tapi bisa disembunyikan dari daftar cepat kalau tidak dipakai.
- Kategori custom bisa diedit/dihapus, dengan validasi: kalau masih dipakai transaksi, transaksi itu dialihkan ke kategori "Lainnya" atau ditolak penghapusannya (pilih salah satu, jelaskan ke user lewat konfirmasi dialog).

## 4. Transaksi

Field:
- `id`, `tanggal`, `jumlah` (decimal, selalu positif — tanda +/- ditentukan oleh `jenis`), `jenis` (`income` | `expense` | `transfer`), `dompet_id` (atau `dompet_asal_id`/`dompet_tujuan_id` khusus transfer), `kategori_id` (null untuk transfer), `catatan` (opsional, teks bebas)

Perilaku:
- Form tambah transaksi: modal atau halaman terpisah, wajib validasi (jumlah > 0, tanggal tidak boleh kosong, dompet wajib dipilih, kategori wajib untuk income/expense).
- Edit dan hapus transaksi tersedia langsung dari baris tabel (inline action atau modal).
- Daftar transaksi ditampilkan sebagai tabel/list, diurutkan tanggal terbaru dulu, dengan pagination atau infinite scroll (pilih salah satu, pagination lebih sederhana untuk mulai).
- Filter yang wajib ada: rentang tanggal (dari–sampai, dengan preset "bulan ini", "bulan lalu", "3 bulan terakhir"), dompet (multi-select), kategori (multi-select), jenis (income/expense/transfer).
- Pencarian teks bebas di kolom catatan.
- Format semua nominal uang: Rupiah dengan pemisah ribuan, contoh `Rp 1.250.000`. Gunakan `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.

## 5. Dashboard

Isi halaman dashboard (halaman pertama setelah login):
- Kartu ringkasan besar di atas: total saldo gabungan semua dompet.
- Dua kartu di sebelahnya: total pemasukan bulan berjalan, total pengeluaran bulan berjalan (bandingkan dengan bulan lalu dalam bentuk persentase naik/turun kalau memungkinkan).
- Daftar kartu dompet dengan saldo masing-masing (klik untuk lihat detail transaksi dompet itu).
- Preview grafik tren 6 bulan terakhir (pemasukan vs pengeluaran).
- Preview breakdown pengeluaran bulan ini per kategori (top 5 kategori).
- 5 transaksi terbaru dengan link "lihat semua" ke halaman transaksi lengkap.

## 6. Grafik & laporan

- **Grafik tren bulanan**: line atau bar chart, sumbu X = bulan, dua seri data (pemasukan, pengeluaran), rentang bisa dipilih (3/6/12 bulan terakhir).
- **Breakdown kategori**: donut/pie chart pengeluaran per kategori untuk periode yang dipilih (default bulan berjalan), lengkap dengan legenda dan persentase.
- **Breakdown per dompet**: opsional, bar chart perbandingan saldo antar dompet.
- Semua grafik harus responsif dan tetap terbaca di layar mobile (bukan dipotong/overflow).

## 7. Non-fungsional

- Semua operasi tulis (create/update/delete) harus tervalidasi di server, jangan percaya validasi client saja.
- Tidak ada data keuangan yang boleh terekspos tanpa lolos password gate — termasuk API route harus ikut dicek sesi, bukan cuma halaman.
- Aplikasi harus tetap bisa dipakai walau koneksi lambat — tampilkan loading state yang jelas, bukan halaman kosong.
- Tidak perlu i18n multi-bahasa, tapi seluruh teks UI dalam Bahasa Indonesia.
