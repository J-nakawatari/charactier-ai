#!/bin/bash
# 本番サーバーで実行するコマンド

echo "=== Nginx設定確認 ==="
sudo grep -A 10 -B 5 "location /api" /etc/nginx/sites-available/charactier-ai.com

echo -e "\n=== 実際のAPIテスト ==="
echo "1. バックエンド直接:"
curl -s http://localhost:5000/api/health || echo "バックエンド /api/health なし"

echo -e "\n2. Nginx経由 /api/:"
curl -s https://charactier-ai.com/api/health || echo "Nginx /api/health なし"

echo -e "\n3. Nginx経由 /api/v1/:"
curl -s https://charactier-ai.com/api/v1/health || echo "Nginx /api/v1/health なし"