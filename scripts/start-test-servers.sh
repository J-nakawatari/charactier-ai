#!/bin/bash

echo "🚀 テスト用サーバーを起動します..."

# 環境変数を読み込む
export $(cat .env.test | grep -v '^#' | xargs)

# バックエンドサーバーを起動
echo "🔧 バックエンドサーバーを起動..."
cd backend
NODE_ENV=test npm run dev &
BACKEND_PID=$!
cd ..

# フロントエンドサーバーを起動
echo "🌐 フロントエンドサーバーを起動..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ サーバーが起動しました"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "終了するには Ctrl+C を押してください"

# 終了時にプロセスをクリーンアップ
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# プロセスが終了するまで待機
wait