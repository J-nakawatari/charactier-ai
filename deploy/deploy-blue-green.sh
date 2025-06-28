#!/bin/bash

# Blue-Green デプロイメント自動化スクリプト
# 使用方法: ./deploy-blue-green.sh

set -e  # エラーがあれば即座に停止

# NVMを使用している場合のNode.jsパス設定
export NVM_DIR="/home/jun/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="/home/jun/.nvm/versions/node/v22.16.0/bin:$PATH"

# 設定
PROJECT_DIR="/var/www/charactier-ai"
BACKEND_DIR="${PROJECT_DIR}/backend"
FRONTEND_DIR="${PROJECT_DIR}/frontend"
NGINX_UPSTREAM_CONF="/etc/nginx/conf.d/charactier-backend-upstream.conf"
LOG_FILE="/var/log/charactier-deploy.log"

# 色付き出力
print_blue() { echo -e "\033[34m$1\033[0m" | tee -a "$LOG_FILE"; }
print_green() { echo -e "\033[32m$1\033[0m" | tee -a "$LOG_FILE"; }
print_yellow() { echo -e "\033[33m$1\033[0m" | tee -a "$LOG_FILE"; }
print_red() { echo -e "\033[31m$1\033[0m" | tee -a "$LOG_FILE"; }

# タイムスタンプ付きログ
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 現在のアクティブポートを確認
get_active_port() {
    grep -E "^\s*server\s+127\.0\.0\.1:" "$NGINX_UPSTREAM_CONF" | grep -v "#" | head -1 | grep -oE ":[0-9]+" | tr -d ":"
}

# サービス名を取得
get_service_names() {
    local current_port=$(get_active_port)
    if [ "$current_port" == "5000" ]; then
        echo "charactier-backend-blue charactier-backend-green"
    else
        echo "charactier-backend-green charactier-backend-blue"
    fi
}

# ヘルスチェック
health_check() {
    local port=$1
    local max_attempts=30
    local attempt=0
    
    print_yellow "🏥 ポート ${port} のヘルスチェック中..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "http://localhost:${port}/api/v1/health" > /dev/null 2>&1; then
            print_green "✅ ヘルスチェック成功 (ポート: ${port})"
            return 0
        fi
        
        attempt=$((attempt + 1))
        print_yellow "⏳ 待機中... (${attempt}/${max_attempts})"
        sleep 2
    done
    
    print_red "❌ ヘルスチェック失敗 (ポート: ${port})"
    return 1
}

# メイン処理
main() {
    log "========================================="
    log "Blue-Green デプロイメント開始"
    log "========================================="
    
    # 1. 現在の状態を確認
    local current_port=$(get_active_port)
    local new_port=$([[ "$current_port" == "5000" ]] && echo "5001" || echo "5000")
    local services=($(get_service_names))
    local current_service="${services[0]}"
    local new_service="${services[1]}"
    
    print_blue "📍 現在の状態:"
    print_blue "  - アクティブ: ${current_service} (ポート: ${current_port})"
    print_blue "  - 新しい環境: ${new_service} (ポート: ${new_port})"
    
    # 2. コードを更新
    print_yellow "📥 最新のコードを取得中..."
    cd "$PROJECT_DIR"
    git pull origin main
    
    # 3. バックエンドのビルド
    print_yellow "🔨 バックエンドをビルド中..."
    cd "$BACKEND_DIR"
    npm install --production=false
    npm run build
    
    # 4. フロントエンドのビルド
    print_yellow "🔨 フロントエンドをビルド中..."
    cd "$FRONTEND_DIR"
    npm install --production=false
    npm run build
    
    # 5. 新しい環境を起動
    print_yellow "🚀 ${new_service} を起動中..."
    sudo systemctl start "$new_service"
    
    # 6. ヘルスチェック
    if ! health_check "$new_port"; then
        print_red "❌ 新しい環境の起動に失敗しました"
        sudo systemctl stop "$new_service"
        exit 1
    fi
    
    # 7. Nginx設定を切り替え
    print_yellow "🔄 Nginxの設定を切り替え中..."
    sudo "${PROJECT_DIR}/deploy/nginx/switch-upstream.sh"
    
    # 8. 少し待機（接続の移行を待つ）
    print_yellow "⏳ 接続の移行を待機中 (10秒)..."
    sleep 10
    
    # 9. 古い環境を停止
    print_yellow "🛑 ${current_service} を停止中..."
    sudo systemctl stop "$current_service"
    
    # 10. 完了
    print_green "🎉 デプロイ完了!"
    print_green "  - 新しいアクティブ: ${new_service} (ポート: ${new_port})"
    print_green "  - 停止: ${current_service}"
    
    # 11. デプロイ情報を記録
    log "デプロイ成功: ${current_service} → ${new_service}"
    
    # 12. 新しいフロントエンドも再起動（オプション）
    print_yellow "🔄 フロントエンドを再起動中..."
    sudo systemctl restart charactier-frontend
    
    print_green "✨ すべての処理が完了しました!"
}

# エラーハンドラー
error_handler() {
    print_red "❌ エラーが発生しました!"
    log "エラー: $1"
    
    # ロールバック処理をここに追加可能
    
    exit 1
}

# トラップ設定
trap 'error_handler "予期しないエラー"' ERR

# rootチェック
if [ "$EUID" -ne 0 ]; then 
    print_red "❌ このスクリプトはroot権限で実行してください"
    echo "使用方法: sudo $0"
    exit 1
fi

# 実行確認
print_yellow "🚀 Blue-Greenデプロイメントを開始しますか？"
read -p "続行するには 'yes' と入力してください: " confirm

if [ "$confirm" != "yes" ]; then
    print_yellow "⚠️  デプロイをキャンセルしました"
    exit 0
fi

# メイン処理を実行
main