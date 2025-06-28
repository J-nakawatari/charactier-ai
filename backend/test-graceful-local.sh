#!/bin/bash

echo "🧪 Graceful Shutdown ローカルテスト"
echo "================================"

# 1. サーバーを起動
echo "📦 Starting server on port 5001..."
PORT=5001 npm start &
SERVER_PID=$!

# サーバーが起動するまで待機
sleep 3

# 2. テスト用のリクエストを送信（長時間接続）
echo -e "\n🌐 Sending test request (long-running)..."
curl -X POST http://localhost:5001/api/v1/test/long-request &
CURL_PID=$!

# 3. 1秒後にSIGTERMを送信
sleep 1
echo -e "\n📤 Sending SIGTERM to server (PID: $SERVER_PID)..."
kill -TERM $SERVER_PID

# 4. プロセスの状態を確認
echo -e "\n📊 Monitoring process status..."
while kill -0 $SERVER_PID 2>/dev/null; do
    echo "⏳ Server is still running (gracefully shutting down)..."
    sleep 1
done

echo -e "\n✅ Server has shut down gracefully!"
echo "🧪 Test completed"