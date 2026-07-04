# AGENT.md — Panduan operasional VPS untuk agent (Hermes)

Kamu adalah agent yang berjalan **di dalam VPS** dan bertanggung jawab atas deployment, maintenance, perbaikan, dan update fitur aplikasi ini. Baca file ini sampai habis sebelum menjalankan perintah apa pun.

## 1. Konteks aplikasi

| Hal | Nilai |
|---|---|
| Aplikasi | Pencatatan keuangan pribadi (single-password gate, bukan multi-user) |
| Repo | `https://github.com/rizzdkp/economic-nilovr.git` (branch `main`) |
| Domain produksi | `economic.nilovr.studio` |
| Stack | Next.js 16 (App Router, Turbopack), TypeScript, Prisma 7 + PostgreSQL, Tailwind 4, Recharts |
| Spesifikasi produk | folder `AGENT/` di repo — **sumber kebenaran** untuk semua keputusan produk & desain |
| Lokasi deploy | `/var/www/finapp` |
| Process manager | PM2, nama proses `finapp` |
| Port aplikasi | `3010` (jangan pakai 3000 tanpa cek — bisa bentrok dengan aplikasi lain di server) |

Urutan baca folder `AGENT/` saat butuh konteks produk: `00-AGENT-BRIEF.md` → `01-PROJECT-SPEC.md` → `02-DESIGN-SYSTEM.md` → `03-TECH-ARCHITECTURE.md` → `04-DEPLOYMENT-VPS.md`. File `04` adalah template deployment generik; file yang sedang kamu baca ini adalah versi yang sudah dikonkretkan untuk server ini — kalau ada konflik, ikuti file ini.

## 2. Aturan keras (jangan dilanggar)

1. **Jangan pernah** commit atau menampilkan isi `.env` (berisi hash password, secret sesi, kredensial DB).
2. **Jangan pernah** menjalankan migrasi destruktif (`prisma migrate reset`, `DROP TABLE`, hapus volume DB) tanpa konfirmasi eksplisit dari pemilik. Backup dulu sebelum migrasi apa pun.
3. **Jangan** mengubah konfigurasi DNS, firewall, atau kredensial (password aplikasi, DB, SSH) tanpa diminta.
4. **Jangan** menambah fitur di luar `AGENT/01-PROJECT-SPEC.md` (scope lock di `AGENT/00-AGENT-BRIEF.md`): tanpa multi-user, tanpa integrasi bank, tanpa notifikasi email/push, tanpa fitur AI.
5. Aplikasi yang gagal `npm run build` **tidak boleh** di-deploy/restart ke produksi. Perbaiki dulu.
6. Semua route API wajib tetap di belakang gerbang sesi (`proxy.ts`) — jangan pernah menambahkan path baru ke `PUBLIC_PATHS` kecuali memang harus publik.

## 3. Jebakan paling penting: karakter `$` di `.env`

Loader env Next.js (`@next/env`) melakukan **ekspansi variabel** pada nilai `.env`. Hash bcrypt selalu mengandung `$` (contoh `$2b$12$...`), sehingga kalau ditulis polos, nilainya menjadi string kosong dan login mati dengan error 500 (`APP_PASSWORD_HASH belum diset`).

**Setiap `$` di dalam nilai `.env` wajib di-escape jadi `\$`:**

```
# SALAH — hash akan kosong saat runtime:
APP_PASSWORD_HASH="$2b$12$abcdef..."

# BENAR:
APP_PASSWORD_HASH="\$2b\$12\$abcdef..."
```

Ini juga berlaku untuk `DATABASE_URL` kalau password DB mengandung `$`. Cara verifikasi setelah mengisi `.env`:

```bash
cd /var/www/finapp
node -e "const{loadEnvConfig}=require('@next/env');loadEnvConfig(process.cwd(),false);const h=process.env.APP_PASSWORD_HASH||'';console.log('panjang:',h.length,'| valid bcrypt:',h.startsWith('\$2'))"
# harus keluar: panjang: 60 | valid bcrypt: true
```

## 4. Deployment awal (jalankan sekali)

Prasyarat yang harus sudah dilakukan pemilik di panel DNS (bukan tugasmu): A record `economic` → IP VPS ini. Cek propagasi: `dig +short economic.nilovr.studio` harus mengembalikan IP server ini (`curl -s ifconfig.me` untuk tahu IP sendiri).

### 4.1 Paket dasar & firewall

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential ufw nginx postgresql postgresql-contrib
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

### 4.2 Node.js 20+ via nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && node -v   # pastikan v20.x atau lebih baru
npm install -g pm2
```

### 4.3 PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE finapp;
CREATE USER finapp_user WITH ENCRYPTED PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON DATABASE finapp TO finapp_user;
ALTER DATABASE finapp OWNER TO finapp_user;
SQL
```

Catat password DB yang kamu generate (simpan hanya di `.env`). Generate yang kuat: `openssl rand -base64 24` — **hindari karakter `$` dan `@` di password DB** supaya tidak perlu escaping di URL.

### 4.4 Clone & dependency

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/rizzdkp/economic-nilovr.git finapp
cd finapp
npm ci
```

### 4.5 Konfigurasi `.env`

```bash
cp .env.example .env
```

Isi `.env` dengan nilai asli:

- `DATABASE_URL="postgresql://finapp_user:PASSWORD_DB@localhost:5432/finapp?schema=public"`
- `SESSION_SECRET` — generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `APP_PASSWORD_HASH` — tanya pemilik password aplikasi yang diinginkan, lalu generate hash **dan langsung escape `$`-nya**:

```bash
node -e "const b=require('bcryptjs');b.hash(process.argv[1],12).then(h=>console.log(h.replace(/\\\$/g,'\\\\\$')))" 'PASSWORD_APLIKASI_DARI_PEMILIK'
# output sudah dalam bentuk \$2b\$12\$... — tempel apa adanya ke .env di dalam tanda kutip ganda
```

- `NODE_ENV="production"`

Lalu jalankan verifikasi di bagian 3 di atas. Jangan lanjut sebelum keluarannya `panjang: 60 | valid bcrypt: true`.

### 4.6 Migrasi & seed

```bash
npx prisma migrate deploy
npx prisma db seed     # mengisi 13 kategori default — wajib, aplikasi mengasumsikan kategori "Lainnya" ada
```

### 4.7 Build & jalankan dengan PM2

```bash
npm run build          # WAJIB sukses tanpa error sebelum lanjut
PORT=3010 pm2 start npm --name finapp -- start
pm2 save
pm2 startup            # jalankan command yang disarankan outputnya
pm2 status             # finapp harus "online"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3010/login   # harus 200
```

### 4.8 Nginx reverse proxy

Buat `/etc/nginx/sites-available/finapp`:

```nginx
server {
    listen 80;
    server_name economic.nilovr.studio;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/finapp /etc/nginx/sites-enabled/
nginx -t                     # wajib "syntax is ok"
systemctl restart nginx
curl -s -o /dev/null -w "%{http_code}\n" http://economic.nilovr.studio/login   # harus 200 (setelah DNS aktif)
```

Catatan: rate limit login dihitung per IP dari header `X-Forwarded-For` — header ini sudah di-set di config di atas, jangan dihapus.

### 4.9 HTTPS dengan Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d economic.nilovr.studio    # pilih redirect HTTP->HTTPS: ya
certbot renew --dry-run                      # pastikan auto-renewal jalan
```

### 4.10 Backup otomatis

```bash
mkdir -p /root/backup
crontab -e
# tambahkan (backup DB tiap hari jam 03:00, simpan 14 hari):
0 3 * * * pg_dump -U finapp_user -h localhost finapp | gzip > /root/backup/finapp_$(date +\%Y\%m\%d).sql.gz && find /root/backup -name "finapp_*.sql.gz" -mtime +14 -delete
```

`pg_dump` akan minta password; buat `/root/.pgpass` berisi `localhost:5432:finapp:finapp_user:PASSWORD_DB` lalu `chmod 600 /root/.pgpass`.

### 4.11 Checklist verifikasi akhir (semua wajib lolos)

- [ ] `https://economic.nilovr.studio` terbuka dengan gembok SSL valid
- [ ] Halaman login glassmorphism tampil, bukan error page
- [ ] Password salah → pesan "Password salah, coba lagi" (401), password benar → masuk dashboard
- [ ] Buka tanpa sesi: `/` redirect ke `/login`; `curl https://economic.nilovr.studio/api/dompet` → 401
- [ ] Tambah dompet → tambah transaksi (income, expense, transfer) → angka dashboard berubah
- [ ] Halaman `/laporan`: ketiga grafik tampil, tombol 3/6/12 bulan berfungsi
- [ ] `pm2 status` → `finapp` online; `reboot` server → aplikasi hidup lagi otomatis
- [ ] Tidak ada error di console browser saat navigasi normal

## 5. Runbook: update aplikasi (fitur baru / perbaikan dari repo)

```bash
cd /var/www/finapp
git pull origin main
npm ci                       # lebih aman daripada npm install untuk produksi
npx prisma migrate deploy    # aman: hanya menjalankan migrasi baru, tidak pernah reset
npm run build                # kalau gagal: JANGAN restart pm2, aplikasi lama tetap jalan; perbaiki dulu
pm2 restart finapp
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3010/login   # 200 = sehat
```

Kalau build gagal setelah `git pull` dan kamu tidak bisa memperbaikinya cepat, kembalikan: `git reset --hard HEAD@{1} && npm ci && npm run build && pm2 restart finapp`, lalu laporkan errornya ke pemilik.

## 6. Runbook: diagnosis & perbaikan masalah

Urutan pemeriksaan standar:

```bash
pm2 status                          # proses hidup?
pm2 logs finapp --lines 100         # error runtime terakhir
systemctl status nginx              # nginx hidup?
tail -50 /var/log/nginx/error.log   # error di sisi proxy
sudo -u postgres psql -c "SELECT 1" # DB hidup?
df -h && free -m                    # disk / memori habis?
```

Gejala umum dan penyebabnya:

| Gejala | Kemungkinan penyebab | Tindakan |
|---|---|---|
| Login selalu 500 | `APP_PASSWORD_HASH` kosong karena `$` tidak di-escape (bagian 3) | Perbaiki escaping di `.env`, `pm2 restart finapp` |
| 502 Bad Gateway | Proses `finapp` mati atau port salah | `pm2 restart finapp`; cek `PORT` konsisten 3010 di PM2 dan nginx |
| Login selalu "Terlalu banyak percobaan" | Rate limit per-IP kena semua user karena `X-Forwarded-For` tidak diteruskan | Pastikan header ada di config nginx |
| Data dashboard tidak berubah | Seharusnya tidak terjadi (`/` sudah `force-dynamic`); kalau terjadi, cek `pm2 logs` untuk error DB | Restart + cek koneksi DB |
| `prisma migrate deploy` gagal | Skema drift atau DB tidak bisa diakses | JANGAN pakai `migrate reset`. Backup dulu, laporkan ke pemilik |
| Sertifikat kedaluwarsa | Auto-renew certbot gagal | `certbot renew` manual, cek `systemctl status certbot.timer` |
| Disk penuh | Log PM2/nginx atau backup menumpuk | `pm2 flush`, rotasi log, bersihkan backup lama |

Setelah perbaikan apa pun, jalankan ulang checklist 4.11 yang relevan.

## 7. Runbook: mengembangkan fitur / mengubah kode

1. Baca dulu `AGENT/01-PROJECT-SPEC.md` (fitur), `AGENT/02-DESIGN-SYSTEM.md` (visual), `AGENT/03-TECH-ARCHITECTURE.md` (pola kode). Hormati scope lock.
2. Konvensi kode yang sudah berlaku di repo ini:
   - Seluruh teks UI Bahasa Indonesia; format uang selalu lewat `formatRupiah()` di `lib/format.ts`.
   - Semua endpoint tulis memvalidasi body dengan skema Zod di `lib/validation/` sebelum menyentuh Prisma.
   - Saldo dompet **selalu** dihitung dari agregasi transaksi (`lib/dompet-saldo.ts`), tidak pernah disimpan sebagai kolom.
   - Transfer = satu baris `Transaksi` dengan `dompetAsalId`+`dompetTujuanId`, bukan dua transaksi.
   - Prisma client di-generate ke `generated/prisma` (di-gitignore) — `npm ci` menjalankan `prisma generate` otomatis lewat postinstall.
   - ESLint repo ini mengaktifkan `react-hooks/set-state-in-effect` sebagai error: fetch-on-mount di client component ditulis `useEffect(() => { (async () => { await load(); })(); }, [load])`, dan reset form modal memakai remount ber-`key`, bukan setState di effect (lihat `components/dompet/DompetFormModal.tsx` sebagai contoh pola).
3. Gerbang kualitas sebelum commit/deploy — ketiganya wajib nol error:
   ```bash
   npm run lint && npx tsc --noEmit && npm run build
   ```
4. Kalau mengubah `prisma/schema.prisma`: buat migrasi dengan `npx prisma migrate dev --name deskripsi_singkat` di lingkungan dev (bukan langsung di DB produksi), commit folder migrasinya, lalu di produksi cukup `npx prisma migrate deploy`.
5. Commit kecil-kecil dengan pesan `feat:`/`fix:`/`chore:` seperti histori yang sudah ada, push ke `main`, lalu jalankan runbook bagian 5.

## 8. Maintenance berkala

- **Mingguan**: cek `pm2 status`, sisa disk (`df -h`), dan bahwa file backup terbaru ada di `/root/backup`.
- **Bulanan**: `apt update && apt upgrade -y` (di luar jam pakai), `certbot renew --dry-run`, restore-test satu file backup ke DB sementara (`createdb finapp_test && gunzip -c backup.sql.gz | psql finapp_test && dropdb finapp_test`).
- **Saat diminta pemilik**: rotasi `SESSION_SECRET` (semua sesi logout) atau ganti `APP_PASSWORD_HASH` (ingat escaping `$`), lalu `pm2 restart finapp`.
