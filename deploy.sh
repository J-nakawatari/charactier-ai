#!/usr/bin/env bash
# /var/www/charactier-ai/deploy.sh
set -euo pipefail
echo "🔄 Pull done → start deploy"

# ---------------- Backend ----------------
echo "📦 backend: install & build"
cd /var/www/charactier-ai/backend
pnpm install --frozen-lockfile
pnpm run build

# ---------------- Frontend ---------------
echo "📦 frontend: install & build"
cd /var/www/charactier-ai/frontend
pnpm install --frozen-lockfile
pnpm run build

# ---------------- PM2 reload -------------
echo "♻️  PM2 reload"
cd /var/www/charactier-ai
pm2 reload ecosystem.config.cjs --env production

echo "✅ Deploy finished"
