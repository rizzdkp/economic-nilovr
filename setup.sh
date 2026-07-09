#!/bin/bash
# Auto-setup FinApp (Economic NiloVR) ke VPS Ubuntu 22.04
# HARDCODED VALUES UNTUK RECOVERY CEPAT — AGENT TIDAK USAH TANYA LAGI
#
# Setelah clone repo, jalanin:
#   chmod +x setup.sh && ./setup.sh
#
# ⚠️ Semua credential hardcoded — ini blueprint produksi.

set -e

VPS_IP="157.245.158.31"
DOMAIN="economic.nilovr.studio"
APP_DIR="/var/www/finapp"
PORT="3004"
SERVICE_NAME="finapp"
PASSWORD="swissimcoming"
DB_USER="finapp_user"
DB_PASS="finapp_db_pass_2024"
DB_NAME="finapp"

echo "=== Setup FinApp (Economic NiloVR) ==="

# 1. Install PostgreSQL if missing
if ! command -v psql &>/dev/null; then
    echo "Installing PostgreSQL..."
    apt-get update -qq && apt-get install -y -qq postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
fi

# 2. Create database and user
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

# 3. Create app directory
mkdir -p "$APP_DIR"

# 4. Generate password hash
echo "Generating password hash..."
cd "$APP_DIR"
if [ ! -d "node_modules" ]; then
    npm install bcryptjs --no-save 2>&1 | tail -2
fi

PASSWORD_HASH=$(node -e "const bcrypt=require('bcryptjs');bcrypt.hash('$PASSWORD',12).then(h=>console.log(h))")
echo "$PASSWORD_HASH" > /var/lib/finapp_hash
chmod 600 /var/lib/finapp_hash
echo "Hash stored at /var/lib/finapp_hash"

# 5. Create .env (WITHOUT password hash — read from file)
cat > "$APP_DIR/.env" << ENVEOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public
SESSION_SECRET=DCm8oa8RNYLN9tjMtjJu09VNW+AK60f9WjSZW+8oobw=
NODE_ENV=production
AUTH_HASH_FILE=/var/lib/finapp_hash
ENVEOF
chmod 600 "$APP_DIR/.env"

# 6. Install deps + prisma + build
echo "Installing dependencies..."
npm install --production 2>&1 | tail -3

echo "Migrating database..."
npx prisma migrate deploy 2>&1 | tail -3

echo "Seeding..."
npx prisma db seed 2>&1 | tail -2

echo "Building..."
HOME=/tmp npm run build 2>&1 | tail -5

# 7. Create systemd service
cat > "/etc/systemd/system/$SERVICE_NAME.service" << SYSTEMDEOF
[Unit]
Description=FinApp - Economic NiloVR
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=PORT=$PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node $APP_DIR/node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
LimitNOFILE=65535
PrivateTmp=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$APP_DIR
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictRealtime=yes
MemoryDenyWriteExecute=no
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX AF_NETLINK

[Install]
WantedBy=multi-user.target
SYSTEMDEOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"

# 8. Nginx config
cat > "/etc/nginx/sites-available/$DOMAIN" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    server_tokens off;
    client_max_body_size 64m;

    add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains; preload' always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection '1; mode=block' always;
    add_header Referrer-Policy 'strict-origin-when-cross-origin' always;
    add_header Permissions-Policy 'camera=(), microphone=(), geolocation=()' always;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_connect_timeout 10s;

        proxy_buffer_size 64k;
        proxy_buffers 8 64k;

        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
        proxy_hide_header Vary;
        proxy_hide_header X-Nextjs-Cache;
        proxy_hide_header X-Nextjs-Prerender;
        proxy_hide_header X-Nextjs-Stale-Time;
        proxy_hide_header X-Nextjs-Matched-Path;
    }

    location ~ /\.(git|env|ht) {
        return 444;
    }
}
NGINXEOF

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN" 2>/dev/null || true

# 9. SSL
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@nilovr.studio 2>&1 | tail -3
fi

nginx -t && systemctl reload nginx

sleep 3

# 10. Verify
HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' "https://$DOMAIN/login")
[ "$HTTP_CODE" = "200" ] && echo "✅ $DOMAIN READY (HTTP $HTTP_CODE)" || echo "❌ HTTP $HTTP_CODE"

echo ""
echo "=== Setup complete ==="
echo "URL: https://$DOMAIN"
echo "Password: $PASSWORD"
echo "DB: postgresql://$DB_USER@localhost:5432/$DB_NAME"
echo "Service: systemctl status $SERVICE_NAME"
