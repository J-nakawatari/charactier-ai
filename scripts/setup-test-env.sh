#!/bin/bash

echo "🚀 テスト環境のセットアップを開始します..."

# 1. MailHogの起動（Dockerを使用）
if command -v docker &> /dev/null; then
    echo "📧 MailHogを起動します..."
    docker run -d --name mailhog -p 1025:1025 -p 8025:8025 mailhog/mailhog 2>/dev/null || echo "MailHogは既に起動しています"
else
    echo "⚠️  Dockerがインストールされていません。MailHogをスキップします。"
fi

# 2. MongoDBの確認
if command -v mongod &> /dev/null; then
    echo "✅ MongoDBが利用可能です"
else
    echo "❌ MongoDBがインストールされていません"
    echo "インストール方法: https://www.mongodb.com/docs/manual/installation/"
fi

# 3. Redisの確認
if command -v redis-cli &> /dev/null; then
    echo "✅ Redisが利用可能です"
    redis-cli ping > /dev/null 2>&1 || echo "⚠️  Redisが起動していません。'redis-server'で起動してください。"
else
    echo "❌ Redisがインストールされていません"
    echo "インストール方法: https://redis.io/docs/getting-started/"
fi

# 4. 環境変数の設定
if [ ! -f .env.test ]; then
    echo "❌ .env.testファイルが見つかりません"
    exit 1
fi

echo "🔧 テスト環境変数を設定します..."
export $(cat .env.test | grep -v '^#' | xargs)

# 5. テストデータベースの初期化
echo "🗄️  テストデータベースを初期化します..."
cd backend
npm run db:seed:test 2>/dev/null || echo "⚠️  シードスクリプトが見つかりません"
cd ..

echo "✅ テスト環境のセットアップが完了しました！"
echo ""
echo "📝 次のコマンドでテストを実行できます:"
echo "  npm run test:e2e"
echo ""
echo "📧 MailHogのUIは http://localhost:8025 で確認できます"