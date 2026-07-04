# Design system — Glassmorphism, anti-AI-slop

Tujuan file ini: memastikan hasil akhir terasa dirancang oleh desainer manusia yang punya sudut pandang, bukan template generik yang keluar dari prompt AI biasa.

## 1. Prinsip anti-AI-slop (wajib dipatuhi)

Ciri "AI slop" yang harus DIHINDARI:
- Gradient default ungu-ke-biru atau ungu-ke-pink sebagai warna utama
- Emoji dipakai sebagai pengganti ikon di UI produksi
- Font sistem default (`Arial`, `sans-serif` generik) tanpa pertimbangan pairing
- Bayangan/blur yang berlebihan di semua elemen tanpa hierarki (semua kartu punya shadow sama beratnya)
- Spacing tidak konsisten (kadang 12px, kadang 18px, kadang 20px untuk hal yang sama)
- Border-radius acak-acakan (satu tombol 4px, tombol sebelahnya 12px)
- Copy UI generik seperti "Welcome back!" atau "Your dashboard" tanpa konteks

Yang harus dilakukan sebagai gantinya:
- Palet warna: 1 warna aksen yang disengaja (lihat token warna di bawah) + netral. Jangan pakai lebih dari 1 warna aksen untuk elemen non-semantik.
- Tipografi: satu font sans-serif untuk UI (contoh: Inter, atau Plus Jakarta Sans dari Google Fonts), gunakan hanya 2 bobot (regular 400, medium/semibold 500-600) — jangan campur banyak bobot dan banyak ukuran.
- Ikon: gunakan satu set ikon konsisten (Tabler Icons atau Lucide), jangan campur dua set ikon berbeda, jangan pakai emoji.
- Spacing: gunakan skala 4px (4, 8, 12, 16, 24, 32, 48) secara konsisten lewat Tailwind spacing scale — jangan pakai nilai custom sembarangan.
- Border-radius: satu nilai untuk kartu (misalnya 16px), satu nilai lebih kecil untuk tombol/input (8-10px). Konsisten di semua komponen sejenis.
- Copy: teks UI ditulis spesifik ke konteks aplikasi keuangan pribadi, bukan boilerplate ("Ringkasan bulan ini" bukan "Dashboard").

## 2. Efek glassmorphism

Terapkan pada: kartu ringkasan dashboard, modal/dialog form, sidebar/nav (opsional).

Resep CSS dasar (Tailwind arbitrary value atau custom class):

```css
.glass-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.12);
}

/* Dark mode */
.dark .glass-card {
  background: rgba(20, 20, 25, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

Aturan penting:
- Background di belakang kartu glass harus punya sesuatu untuk di-blur (gradient halus atau bentuk dekoratif lembut di layer paling belakang) — glassmorphism di atas background putih polos tidak akan terlihat efeknya.
- Jangan taruh efek blur di elemen yang isinya teks panjang/tabel padat (transaksi, misalnya) — glass cocok untuk kartu ringkasan, bukan tabel data. Tabel pakai surface solid biasa dengan border tipis.
- Kontras teks di atas glass card wajib dicek — teks gelap di atas glass terang, teks terang di atas glass gelap. Jangan sampai keterbacaan turun demi estetika.

## 3. Token warna

```css
:root {
  --accent: #3B7A57;        /* contoh: hijau tua terkontrol, ganti sesuai selera tapi tetap satu warna aksen */
  --accent-soft: #E8F3ED;
  --bg-base: #F4F3EF;       /* netral hangat, bukan putih/abu-abu generik */
  --bg-decorative: linear-gradient(135deg, #E8F3ED 0%, #F4F3EF 60%, #EFEAE0 100%);
  --surface: #FFFFFF;
  --text-primary: #1C1C1A;
  --text-secondary: #6B6A64;
  --danger: #C0392B;        /* untuk pengeluaran/nilai negatif */
  --success: #2E7D5B;       /* untuk pemasukan/nilai positif */
  --border: rgba(0,0,0,0.08);
}

.dark {
  --bg-base: #14141A;
  --bg-decorative: linear-gradient(135deg, #1A1F1C 0%, #14141A 60%, #1A1815 100%);
  --surface: #1E1E24;
  --text-primary: #F2F1ED;
  --text-secondary: #A6A59E;
  --border: rgba(255,255,255,0.08);
}
```

Catatan: warna aksen di atas hanya contoh — boleh diganti agent/user sesuai selera, tapi jangan mengganti prinsipnya (1 aksen + netral hangat, bukan abu-abu dingin generik).

## 4. Tipografi

- Font UI: `Plus Jakarta Sans` atau `Inter` via `next/font/google`.
- Skala ukuran: 12px (label kecil), 14px (body sekunder), 16px (body utama), 20px (judul kartu), 28px (angka besar seperti total saldo).
- Angka nominal uang selalu pakai `font-variant-numeric: tabular-nums` supaya rapi saat berjajar di tabel.

## 5. Layout & navigasi responsif

- **Desktop (≥1024px)**: sidebar kiri tetap (dashboard, dompet, transaksi, laporan, keluar), konten utama di kanan dengan max-width supaya tidak melebar penuh di layar sangat lebar.
- **Tablet (768–1023px)**: sidebar bisa collapse jadi ikon saja, expand saat hover/klik.
- **Mobile (<768px)**: sidebar hilang, diganti bottom navigation bar dengan 4 ikon utama (Dashboard, Transaksi, Dompet, Laporan) fixed di bawah, area konten diberi padding-bottom supaya tidak tertutup nav.
- Form tambah transaksi di mobile tampil sebagai bottom sheet (slide up dari bawah), di desktop sebagai modal center.
- Tabel transaksi di mobile diubah jadi list kartu vertikal (bukan tabel horizontal yang harus di-scroll).
- Semua target sentuh (tombol, item nav) minimal 44x44px di mobile.

## 6. Interaksi & motion

- Transisi halus 150-200ms untuk hover state (bukan instant, bukan lambat).
- Saat saldo berubah (setelah tambah transaksi), animasikan angka dengan count-up singkat (opsional, jangan berlebihan).
- Skeleton loading (bukan spinner polos) untuk kartu dashboard dan tabel saat data sedang dimuat.
- Hindari animasi yang mengganggu (parallax berat, bounce berlebihan) — motion harus terasa halus dan tidak mengganggu tugas utama (mencatat uang).
