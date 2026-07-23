#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/test-engineer"
SERVICE_NAME="test-engineer"
PORT="3001"

cd "$APP_DIR"

echo "[1/6] Extracting package..."
rm -rf "$APP_DIR/app"
mkdir -p "$APP_DIR/app"
tar -xzf "$APP_DIR/app.tar.gz" -C "$APP_DIR/app"

cd "$APP_DIR/app"

echo "[2/6] Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y nodejs npm
  elif command -v yum >/dev/null 2>&1; then
    yum install -y nodejs npm
  elif command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y nodejs npm
  else
    echo "Cannot install Node.js automatically. Please install Node.js 18+ first." >&2
    exit 1
  fi
fi

echo "Node: $(node -v)"
echo "NPM: $(npm -v)"

echo "[3/6] Installing production dependencies..."
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

echo "[4/6] Creating systemd service..."
cat >/etc/systemd/system/${SERVICE_NAME}.service <<SERVICE
[Unit]
Description=Test Engineer Automation Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/app
Environment=NODE_ENV=production
Environment=PORT=${PORT}
ExecStart=$(command -v node) server.js
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
SERVICE

echo "[5/6] Starting service..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo "[6/6] Service status..."
systemctl --no-pager --lines=20 status "$SERVICE_NAME"

echo "Done. App should be available on port ${PORT}."
