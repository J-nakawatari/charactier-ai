#!/bin/bash

echo "🚀 Webhook修正をデプロイします..."

# 1. 最新のコードを取得
echo "📥 最新のコードを取得..."
git pull origin main

# 2. バックエンドディレクトリに移動
cd backend

# 3. TypeScriptをコンパイル
echo "🔧 TypeScriptをコンパイル中..."
npm run build

# 4. webhooksディレクトリを作成してファイルをコピー
echo "📁 webhooksディレクトリを作成..."
mkdir -p dist/webhooks
mkdir -p dist/services

echo "📋 JSファイルをコピー..."
cp webhooks/stripe.js dist/webhooks/stripe.js
cp services/tokenService.js dist/services/tokenService.js

# 5. ファイルの存在確認
echo "✅ ファイル確認:"
ls -la dist/webhooks/stripe.js
ls -la dist/services/tokenService.js

# 6. PM2でバックエンドを再起動
echo "🔄 バックエンドを再起動..."
pm2 restart charactier-backend

# 7. ログを確認
echo "📋 最新のログ (10秒間):"
pm2 logs charactier-backend --lines 20

echo ""
echo "🎉 デプロイ完了！"
echo ""
echo "📝 確認事項:"
echo "1. Stripeダッシュボードで使用中のWebhookエンドポイントを確認"
echo "2. テスト購入を実行して正しいトークン数が付与されるか確認"
echo "   - ¥500 = 104,543トークン (o4-mini使用時)"