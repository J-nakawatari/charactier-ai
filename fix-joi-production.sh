#!/bin/bash

# Joiの依存関係を本番環境で修正するスクリプト

echo "🔧 Joiの依存関係を修正します..."

cd /var/www/charactier-ai/backend

echo "📦 Joiをインストール..."
npm install joi @types/joi

echo "🔨 TypeScriptをビルド..."
npm run build

echo "🔄 バックエンドサービスを再起動..."
sudo systemctl restart charactier-backend

echo "✅ 完了！サービスの状態を確認..."
sudo systemctl status charactier-backend --no-pager

echo "🎉 Joiの修正が完了しました！"