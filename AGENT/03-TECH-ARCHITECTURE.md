# Arsitektur teknis

## 1. Stack

| Layer | Pilihan |
|---|---|
| Framework | Next.js 14+ (App Router), TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Chart | Recharts |
| Ikon | Tabler Icons (`@tabler/icons-react`) |
| Font | `next/font/google` — Plus Jakarta Sans |
| Auth | Custom password gate (bukan NextAuth, karena tidak ada konsep multi-user) — session token di cookie httpOnly |
| Validasi | Zod (validasi input server-side di setiap API route/server action) |
| Deployment | VPS Ubuntu, Nginx reverse proxy, PM2 (process manager), Let's Encrypt (SSL) |

## 2. Struktur folder (garis besar)

```
app/
  login/
    page.tsx
  (dashboard)/
    layout.tsx          # cek sesi di sini via middleware, render sidebar/bottom-nav
    page.tsx             # dashboard utama
    dompet/
      page.tsx
    transaksi/
      page.tsx
    laporan/
      page.tsx
  api/
    auth/
      login/route.ts
      logout/route.ts
    dompet/route.ts
    dompet/[id]/route.ts
    kategori/route.ts
    transaksi/route.ts
    transaksi/[id]/route.ts
components/
  ui/                    # button, input, modal, card dasar
  dashboard/
  dompet/
  transaksi/
  chart/
lib/
  prisma.ts
  auth.ts                # verifikasi password, buat/cek session token
  format.ts               # formatter Rupiah, tanggal
  validation/            # skema Zod
prisma/
  schema.prisma
  seed.ts
middleware.ts
.env.example
```

## 3. Skema Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TipeDompet {
  cash
  bank
  e_wallet
  lainnya
}

enum JenisKategori {
  income
  expense
}

enum JenisTransaksi {
  income
  expense
  transfer
}

model Dompet {
  id            String   @id @default(cuid())
  nama          String
  tipe          TipeDompet
  saldoAwal     Decimal  @default(0) @db.Decimal(14, 2)
  warna         String   @default("#3B7A57")
  diarsipkan    Boolean  @default(false)
  dibuatPada    DateTime @default(now())

  transaksi         Transaksi[] @relation("dompetUtama")
  transferKeluar    Transaksi[] @relation("dompetAsal")
  transferMasuk     Transaksi[] @relation("dompetTujuan")
}

model Kategori {
  id          String        @id @default(cuid())
  nama        String
  jenis       JenisKategori
  warna       String
  ikon        String
  isDefault   Boolean       @default(false)
  transaksi   Transaksi[]
}

model Transaksi {
  id              String         @id @default(cuid())
  tanggal         DateTime
  jumlah          Decimal        @db.Decimal(14, 2)
  jenis           JenisTransaksi
  catatan         String?

  dompetId        String?
  dompet          Dompet?        @relation("dompetUtama", fields: [dompetId], references: [id])

  dompetAsalId    String?
  dompetAsal      Dompet?        @relation("dompetAsal", fields: [dompetAsalId], references: [id])

  dompetTujuanId  String?
  dompetTujuan    Dompet?        @relation("dompetTujuan", fields: [dompetTujuanId], references: [id])

  kategoriId      String?
  kategori        Kategori?      @relation(fields: [kategoriId], references: [id])

  dibuatPada      DateTime       @default(now())

  @@index([tanggal])
  @@index([dompetId])
  @@index([kategoriId])
}
```

Catatan implementasi:
- Untuk transaksi `income`/`expense`: isi `dompetId` + `kategoriId`, kosongkan `dompetAsalId`/`dompetTujuanId`.
- Untuk transaksi `transfer`: isi `dompetAsalId` + `dompetTujuanId`, kosongkan `dompetId` + `kategoriId`.
- Saldo dihitung dengan query agregasi (SUM) saat dibutuhkan, bukan disimpan sebagai kolom `saldoSaatIni` di tabel Dompet — tambahkan caching/materialized view nanti kalau performa jadi masalah, jangan optimasi prematur.

## 4. Environment variables (`.env.example`)

```
DATABASE_URL="postgresql://finapp_user:your_db_password@localhost:5432/finapp?schema=public"
APP_PASSWORD_HASH="your_app_password_hash"
SESSION_SECRET="generate_random_32_byte_string"
NODE_ENV="production"
```

Cara generate hash password (dijalankan sekali di lokal, hasilnya ditaruh di `.env` server):

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('password_asli_anda', 12).then(console.log)"
```

## 5. API routes (ringkasan kontrak)

Semua route di `app/api/**` wajib memvalidasi sesi (kecuali `auth/login`) dan memvalidasi body dengan Zod sebelum menyentuh Prisma.

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/auth/login` | Cek password, set cookie sesi |
| POST | `/api/auth/logout` | Hapus cookie sesi |
| GET/POST | `/api/dompet` | List / buat dompet |
| PATCH/DELETE | `/api/dompet/[id]` | Update / hapus (atau arsipkan) dompet |
| GET/POST | `/api/kategori` | List / buat kategori |
| GET/POST | `/api/transaksi` | List (dengan query filter) / buat transaksi |
| PATCH/DELETE | `/api/transaksi/[id]` | Update / hapus transaksi |

Query filter yang didukung `GET /api/transaksi`: `dariTanggal`, `sampaiTanggal`, `dompetId[]`, `kategoriId[]`, `jenis`, `cari` (search catatan), `page`, `pageSize`.

## 6. Build & quality gate sebelum deploy

```bash
npm run lint
npm run build
npx tsc --noEmit
```

Ketiga command di atas wajib lolos tanpa error sebelum lanjut ke `04-DEPLOYMENT-VPS.md`.
