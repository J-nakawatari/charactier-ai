#!/bin/bash

echo "🔍 本番環境の設定を確認します..."
echo ""

# 1. 環境変数の確認
echo "📋 環境変数の確認:"
echo "OPENAI_MODEL = $OPENAI_MODEL"
echo ""

# 2. Stripe Webhookエンドポイントの確認
echo "📋 登録されているWebhookエンドポイント:"
echo "Stripeダッシュボードで確認してください："
echo "https://dashboard.stripe.com/test/webhooks"
echo ""

# 3. PM2プロセスの確認
echo "📋 PM2プロセスの状態:"
pm2 list
echo ""

# 4. 最新のログを確認
echo "📋 Webhookの最新ログ (最後の50行):"
pm2 logs charactier-backend --lines 50 | grep -E "(Webhook|トークン|購入|TokenPack|295,709|104,)"
echo ""

# 5. MongoDBのTokenPack設定確認
echo "📋 TokenPack設定を確認するには以下を実行:"
echo "mongo"
echo "use charactier-ai"
echo "db.tokenpacks.find({ price: 500 }).pretty()"
echo ""

echo "✅ 確認項目："
echo "1. OPENAI_MODELがo4-miniに設定されているか"
echo "2. Stripeで正しいWebhookエンドポイントが設定されているか"
echo "3. TokenPackに¥500の設定があり、tokens: 104543が設定されているか"