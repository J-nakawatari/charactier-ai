#!/bin/bash

# 本番環境へのデプロイスクリプト
# SSEエンドポイントとトークン計算修正を含む

echo "🚀 本番環境へのデプロイを開始します..."

# 1. 最新のコードを取得
echo "📥 最新のコードを取得..."
git pull origin main

# 2. バックエンドのビルドとデプロイ
echo "🔧 バックエンドをビルド中..."
cd backend

# 依存関係をインストール
echo "📦 依存関係をインストール..."
npm install

# TypeScriptをコンパイル
npm run build

# webhooks/stripe.jsをdistディレクトリにコピー（JSファイルなので直接コピー）
echo "📋 webhooks/stripe.jsをコピー..."
cp webhooks/stripe.js dist/webhooks/stripe.js

# services/tokenService.jsもコピー
echo "📋 services/tokenService.jsをコピー..."
mkdir -p dist/services
cp services/tokenService.js dist/services/tokenService.js

# systemdでバックエンドを再起動
echo "🔄 バックエンドを再起動..."
sudo systemctl restart charactier-backend

# 3. フロントエンドのビルドとデプロイ
echo "🎨 フロントエンドをビルド中..."
cd ../frontend

# 依存関係をインストール
echo "📦 フロントエンドの依存関係をインストール..."
npm install

# Next.jsアプリケーションをビルド
npm run build

# systemdでフロントエンドを再起動
echo "🔄 フロントエンドを再起動..."
sudo systemctl restart charactier-frontend

# 4. systemdサービスの状態を確認
echo "✅ デプロイ完了！現在のサービス状態："
sudo systemctl status charactier-backend --no-pager
sudo systemctl status charactier-frontend --no-pager

echo "🎉 デプロイが完了しました！"
echo ""
echo "📝 今回のデプロイで追加された機能："
echo "  - SSEエンドポイント (/api/purchase/events/:sessionId) でリアルタイム購入通知"
echo "  - トークン計算で正しいモデル (o4-mini) を使用するよう修正"
echo ""
echo "⚠️  確認事項："
echo "  - Stripe Webhookが正常に動作しているか"
echo "  - 購入完了時に正しいトークン数が付与されているか（¥500 = 104,891枚）"
echo "  - SSEによるリアルタイム通知が機能しているか"