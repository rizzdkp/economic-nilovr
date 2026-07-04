# Deployment ke VPS sendiri

Asumsi: VPS Ubuntu 22.04/24.04 (fresh install), user sudah punya akses SSH root/sudo, dan domain sudah dibeli tapi belum diarahkan ke server. Ganti semua placeholder (`yourdomain.com`, `your_vps_ip`, `your_ssh_user`, `your_db_password`) dengan nilai asli.

## 1. Arahkan domain ke VPS (dilakukan di panel domain, bukan di server)

Tambahkan DNS record di panel penyedia domain:

| Type | Name | Value |
|---|---|---|
| A | `@` | `your_vps_ip` |
| A | `www` | `your_vps_ip` |

Tunggu propagasi DNS (bisa 5 menit sampai beberapa jam). Cek dengan:

```bash
ping yourdomain.com
```

Lanjut ke langkah berikutnya sambil menunggu — DNS tidak perlu sudah aktif untuk setup server.

## 2. Setup awal server

```bash
ssh your_ssh_user@your_vps_ip

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw

# Firewall dasar
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 3. Install Node.js (via nvm, biar mudah ganti versi)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # pastikan v20.x
```

## 4. Install & setup PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql
```

Di dalam psql:

```sql
CREATE DATABASE finapp;
CREATE USER finapp_user WITH ENCRYPTED PASSWORD 'your_db_password';
GRANT ALL PRIVILEGES ON DATABASE finapp TO finapp_user;
\q
```

## 5. Clone project & install dependency

```bash
cd /var/www
sudo mkdir finapp && sudo chown $USER:$USER finapp
git clone <url_repo_anda> finapp
cd finapp
npm install
```

## 6. Konfigurasi environment

```bash
cp .env.example .env
nano .env
```

Isi sesuai nilai asli:

```
DATABASE_URL="postgresql://finapp_user:your_db_password@localhost:5432/finapp?schema=public"
APP_PASSWORD_HASH="your_app_password_hash"
SESSION_SECRET="hasil_random_32_byte"
NODE_ENV="production"
```

Generate `SESSION_SECRET` acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 7. Migrasi database & seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

## 8. Build aplikasi

```bash
npm run build
```

Kalau ada error di sini, **jangan lanjut ke langkah berikutnya** — perbaiki dulu error TypeScript/build-nya. Aplikasi yang gagal build tidak boleh di-deploy.

## 9. Jalankan dengan PM2 (biar tetap hidup setelah SSH ditutup & auto-restart kalau crash)

```bash
npm install -g pm2
pm2 start npm --name "finapp" -- start
pm2 save
pm2 startup   # ikuti instruksi yang muncul, jalankan command yang diberikan
```

Cek status:

```bash
pm2 status
pm2 logs finapp   # cek log kalau ada masalah
```

Default Next.js jalan di port 3000 — pastikan tidak bentrok dengan aplikasi lain di server yang sama.

## 10. Setup Nginx sebagai reverse proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/finapp
```

Isi file:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
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

Aktifkan config:

```bash
sudo ln -s /etc/nginx/sites-available/finapp /etc/nginx/sites-enabled/
sudo nginx -t          # wajib "syntax is ok" sebelum lanjut
sudo systemctl restart nginx
```

Test di browser: `http://yourdomain.com` harus sudah menampilkan halaman login (belum HTTPS di tahap ini).

## 11. Pasang SSL gratis dengan Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Ikuti prompt (masukkan email, setuju TOS, pilih redirect HTTP ke HTTPS = ya). Certbot otomatis edit config Nginx dan setup renewal otomatis.

Cek auto-renewal berfungsi:

```bash
sudo certbot renew --dry-run
```

## 12. Verifikasi akhir (checklist wajib sebelum dianggap selesai)

- [ ] `https://yourdomain.com` terbuka dengan gembok SSL valid (bukan warning "not secure")
- [ ] Halaman login glassmorphism tampil dengan benar, bukan halaman default/error
- [ ] Password gate berfungsi — password salah ditolak, password benar masuk ke dashboard
- [ ] Tambah dompet, tambah transaksi, lihat grafik — semua berfungsi tanpa error di console browser (cek dengan DevTools)
- [ ] `pm2 status` menunjukkan proses `finapp` dalam status `online`
- [ ] Restart server (`sudo reboot`) lalu cek aplikasi tetap hidup otomatis setelah server nyala kembali (berkat `pm2 startup`)
- [ ] Tampilan mobile dites langsung dari HP (bukan cuma resize browser), navigasi bottom-nav berfungsi

## 13. Update aplikasi di kemudian hari

```bash
cd /var/www/finapp
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart finapp
```

## 14. Backup database (rekomendasi, jalankan sebagai cron mingguan)

```bash
pg_dump -U finapp_user finapp > ~/backup/finapp_$(date +%Y%m%d).sql
```

Tambahkan ke crontab (`crontab -e`) supaya jalan otomatis, dan pertimbangkan menyalin hasil backup ke penyimpanan terpisah (bukan di VPS yang sama) — kalau server bermasalah, backup ikut hilang kalau hanya disimpan lokal.
