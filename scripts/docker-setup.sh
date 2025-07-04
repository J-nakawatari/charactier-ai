#!/bin/bash

echo "🐳 Docker開発環境の初期セットアップを開始します..."

# .env.dockerファイルが存在しない場合
if [ ! -f .env.docker ]; then
    echo "⚠️  .env.dockerファイルが見つかりません"
    
    # 本番.envが存在する場合はコピー
    if [ -f backend/.env ]; then
        echo "📋 本番環境の.envをコピーして.env.dockerを作成します..."
        cp backend/.env .env.docker
        
        # MongoDBとRedisのURLを書き換え
        sed -i 's|MONGODB_URI=.*|MONGODB_URI=mongodb://mongodb:27017/charactier|' .env.docker
        sed -i 's|REDIS_URL=.*|REDIS_URL=redis://redis:6379|' .env.docker
        
        echo "✅ .env.dockerを作成しました"
    else
        echo "❌ backend/.envファイルが見つかりません"
        echo "   本番環境の.envをコピーして、.env.dockerを手動で作成してください"
        exit 1
    fi
fi

# バックエンドの.envシンボリックリンクを作成
echo "🔗 環境変数ファイルのリンクを作成します..."
cd backend && ln -sf ../.env.docker .env && cd ..
cd frontend && ln -sf ../.env.docker .env.local && cd ..

# Dockerイメージをビルド
echo "🏗️  Dockerイメージをビルドします..."
docker-compose -f docker-compose.dev.yml build

# 依存関係をインストール
echo "📦 依存関係をインストールします..."
docker-compose -f docker-compose.dev.yml run --rm backend npm ci
docker-compose -f docker-compose.dev.yml run --rm frontend npm ci

# データベースの初期化
echo "🗄️  MongoDBの接続をテストします..."
docker-compose -f docker-compose.dev.yml up -d mongodb
sleep 5
docker-compose -f docker-compose.dev.yml exec mongodb mongosh --eval "db.adminCommand('ping')"

# 全サービスを起動
echo "🚀 全サービスを起動します..."
docker-compose -f docker-compose.dev.yml up -d

echo "✨ セットアップ完了！"
echo ""
echo "📌 次のコマンドで開発を開始できます："
echo "   npm run docker:dev    # サービスを起動"
echo "   npm run docker:down   # サービスを停止"
echo "   npm run docker:clean  # データも含めて削除"
echo ""
echo "🌐 アクセスURL："
echo "   フロントエンド: http://localhost:3000"
echo "   バックエンド:   http://localhost:5000"
echo "   MongoDB:        mongodb://localhost:27017"
echo "   Redis:          redis://localhost:6379"