#!/bin/bash

# E2Eテスト実行スクリプト
# 使用方法: ./scripts/run-e2e-tests.sh

echo "🚀 E2Eテスト実行スクリプト"
echo ""
echo "⚠️  重要: テスト用MongoDBの接続情報は環境変数で設定してください"
echo "例: TEST_MONGODB_URI='mongodb+srv://...' ./scripts/run-e2e-tests.sh"
echo ""

# 環境変数が設定されていない場合はローカルMongoDBを使用
if [ -z "$TEST_MONGODB_URI" ]; then
    echo "ℹ️  TEST_MONGODB_URIが設定されていません。ローカルMongoDBを使用します。"
    echo "   ローカルMongoDBが起動していることを確認してください。"
    export TEST_MONGODB_URI="mongodb://localhost:27017/charactier_test"
fi

# .env.testファイルを一時的に作成
cat > .env.test.tmp << EOF
NODE_ENV=test
MONGODB_URI=$TEST_MONGODB_URI
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-key-for-e2e-testing
JWT_REFRESH_SECRET=test-refresh-secret-key-for-e2e-testing
DISABLE_RATE_LIMIT=true
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
FEATURE_SECURE_COOKIE_AUTH=false
FEATURE_CSRF_SAMESITE_STRICT=false
EOF

# 既存の.env.testをバックアップ
if [ -f .env.test ]; then
    mv .env.test .env.test.backup
fi

# 一時ファイルを.env.testとして使用
mv .env.test.tmp .env.test

# テスト実行
echo "🧪 テストを実行中..."
npx playwright test "$@"

# テスト結果を保存
TEST_RESULT=$?

# .env.testを削除し、バックアップを復元
rm -f .env.test
if [ -f .env.test.backup ]; then
    mv .env.test.backup .env.test
fi

# テスト結果を返す
exit $TEST_RESULT