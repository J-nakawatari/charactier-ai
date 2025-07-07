#!/bin/bash

# ステージング環境のマージコンフリクト解決スクリプト

echo "=== ステージング環境のマージコンフリクト解決 ==="

# 1. 現在の状態を確認
echo "1. 現在の状態確認..."
git status

# 2. ローカル変更を確認
echo -e "\n2. ローカル変更の確認..."
git diff --name-only

# 3. コンフリクトファイルを確認
echo -e "\n3. コンフリクトファイルの詳細..."
git diff --check

# 4. オプション提示
echo -e "\n=== 解決方法の選択 ==="
echo "A) ローカル変更を破棄して、mainブランチの内容で上書き（推奨）"
echo "B) ローカル変更を一時保存してから、マージを試みる"
echo "C) 手動でコンフリクトを解決する"
echo ""
echo "推奨: Aを選択（ステージング環境のローカル変更は通常不要）"
echo ""
echo "実行するコマンド:"
echo ""
echo "# オプションA - ローカル変更を破棄:"
echo "git reset --hard HEAD"
echo "git clean -fd"
echo "git pull origin main"
echo ""
echo "# オプションB - ローカル変更を保存:"
echo "git stash push -m 'staging-local-changes-$(date +%Y%m%d-%H%M%S)'"
echo "git pull origin main"
echo "# 必要に応じて: git stash pop"
echo ""
echo "# オプションC - 手動解決:"
echo "# 各コンフリクトファイルを編集"
echo "git add <解決したファイル>"
echo "git commit -m 'Merge main into develop'"

# 5. 具体的なコンフリクトファイルリスト
echo -e "\n=== コンフリクトが発生しているファイル ==="
echo "- backend/src/middleware/csrf.ts"
echo "- backend/src/routes/adminSecurity.ts"
echo "- backend/src/routes/notifications.ts"
echo "- frontend/components/characters/CharacterGrid.tsx"
echo "- frontend/components/ui/PriceDisplay.tsx"