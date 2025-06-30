#!/bin/bash

echo "🚀 E2Eテスト実行スクリプト"
echo "=========================="

# 1. 依存関係の確認
echo "📦 依存関係を確認中..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpmがインストールされていません"
    echo "インストール: npm install -g pnpm"
    exit 1
fi

# 2. Playwrightのインストール確認
echo "🎭 Playwrightを確認中..."
if [ ! -d "node_modules/@playwright" ]; then
    echo "📥 Playwrightをインストール中..."
    npx playwright install
    npx playwright install-deps
fi

# 3. 開発サーバーの起動確認
echo "🔍 開発サーバーの状態を確認中..."
if ! curl -s http://localhost:3001 > /dev/null; then
    echo "🏃 開発サーバーを起動します..."
    echo "別のターミナルで以下のコマンドを実行してください:"
    echo ""
    echo "  npm run dev"
    echo ""
    echo "サーバーが起動したら、もう一度このスクリプトを実行してください。"
    exit 1
fi

echo "✅ 開発サーバーが起動しています"

# 4. テストの実行
echo ""
echo "🧪 E2Eテストを実行します"
echo "=========================="

# 実行するテストを選択
PS3="実行するテストを選択してください: "
options=(
    "新規ユーザーフロー（推奨）"
    "トークン購入フロー" 
    "チャット機能"
    "すべてのユーザー向けテスト"
    "すべての管理画面テスト"
    "すべてのテスト"
    "UIモードで実行（視覚的デバッグ）"
    "終了"
)

select opt in "${options[@]}"
do
    case $opt in
        "新規ユーザーフロー（推奨）")
            echo "🧪 新規ユーザーフローのテストを実行中..."
            npx playwright test tests/e2e/user/auth/new-user-complete-flow.spec.ts --reporter=list
            break
            ;;
        "トークン購入フロー")
            echo "🧪 トークン購入フローのテストを実行中..."
            npx playwright test tests/e2e/user/tokens/purchase-complete-flow.spec.ts --reporter=list
            break
            ;;
        "チャット機能")
            echo "🧪 チャット機能のテストを実行中..."
            npx playwright test tests/e2e/user/chat/chat-complete-flow.spec.ts --reporter=list
            break
            ;;
        "すべてのユーザー向けテスト")
            echo "🧪 すべてのユーザー向けテストを実行中..."
            npx playwright test tests/e2e/user --reporter=list
            break
            ;;
        "すべての管理画面テスト")
            echo "🧪 すべての管理画面テストを実行中..."
            npx playwright test tests/e2e/admin/admin-dashboard-complete.spec.ts tests/e2e/admin/admin-advanced-features.spec.ts --reporter=list
            break
            ;;
        "すべてのテスト")
            echo "🧪 すべてのE2Eテストを実行中..."
            npm run test:e2e
            break
            ;;
        "UIモードで実行（視覚的デバッグ）")
            echo "🖥️ UIモードでテストを起動中..."
            npx playwright test --ui
            break
            ;;
        "終了")
            echo "👋 終了します"
            exit 0
            ;;
        *) echo "無効な選択です: $REPLY";;
    esac
done

# 5. レポートの表示
echo ""
echo "📊 テストが完了しました"
read -p "HTMLレポートを表示しますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx playwright show-report
fi

echo ""
echo "✅ 完了しました！"
echo ""
echo "📝 詳細なガイドは docs/e2e-test-guide.md を参照してください"