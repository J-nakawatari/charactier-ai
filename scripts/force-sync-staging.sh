#!/bin/bash

echo "=== ステージング環境を強制的に本番と同期 ==="

# 1. すべてのローカル変更を破棄
echo "1. ローカル変更を完全に破棄..."
git reset --hard origin/main

# 2. 追跡されていないファイルも削除
echo "2. 追跡されていないファイルを削除..."
git clean -fd

# 3. リモートの最新情報を取得
echo "3. リモートの最新情報を取得..."
git fetch origin main

# 4. 強制的にmainブランチに切り替え
echo "4. mainブランチに強制切り替え..."
git checkout -B main origin/main

# 5. 確認
echo "5. 現在の状態を確認..."
git status
git log --oneline -5

echo ""
echo "=== 完了 ==="
echo "ステージング環境が本番環境（main）と完全に同期されました。"