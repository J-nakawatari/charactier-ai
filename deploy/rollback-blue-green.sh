#!/bin/bash

# Blue-Green ロールバックスクリプト
# 問題が発生した場合に前の環境に戻す

set -e

# 設定（deploy-blue-green.shと同じ）
PROJECT_DIR="/var/www/charactier-ai"
NGINX_UPSTREAM_CONF="/etc/nginx/conf.d/charactier-backend-upstream.conf"
LOG_FILE="/var/log/charactier-deploy.log"

# 色付き出力
print_blue() { echo -e "\033[34m$1\033[0m" | tee -a "$LOG_FILE"; }
print_green() { echo -e "\033[32m$1\033[0m" | tee -a "$LOG_FILE"; }
print_yellow() { echo -e "\033[33m$1\033[0m" | tee -a "$LOG_FILE"; }
print_red() { echo -e "\033[31m$1\033[0m" | tee -a "$LOG_FILE"; }

# タイムスタンプ付きログ
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ROLLBACK: $1" | tee -a "$LOG_FILE"
}

# 現在のアクティブポートを確認
get_active_port() {
    grep -E "^\s*server\s+127\.0\.0\.1:" "$NGINX_UPSTREAM_CONF" | grep -v "#" | head -1 | grep -oE ":[0-9]+" | tr -d ":"
}

main() {
    log "========================================="
    log "ロールバック開始"
    log "========================================="
    
    # 現在の状態を確認
    local current_port=$(get_active_port)
    local rollback_port=$([[ "$current_port" == "5000" ]] && echo "5001" || echo "5000")
    local current_service=$([[ "$current_port" == "5000" ]] && echo "charactier-backend-blue" || echo "charactier-backend-green")
    local rollback_service=$([[ "$rollback_port" == "5000" ]] && echo "charactier-backend-blue" || echo "charactier-backend-green")
    
    print_yellow "⚠️  ロールバックを実行します"
    print_yellow "  現在: ${current_service} (ポート: ${current_port})"
    print_yellow "  戻す: ${rollback_service} (ポート: ${rollback_port})"
    
    # 1. 以前の環境を起動
    print_yellow "🚀 ${rollback_service} を起動中..."
    sudo systemctl start "$rollback_service"
    
    # 2. ヘルスチェック
    print_yellow "🏥 ヘルスチェック中..."
    sleep 5
    if ! curl -s -f "http://localhost:${rollback_port}/api/v1/health" > /dev/null 2>&1; then
        print_red "❌ ロールバック先の環境が起動できません!"
        exit 1
    fi
    
    # 3. Nginx設定を切り替え
    print_yellow "🔄 Nginxを切り替え中..."
    sudo "${PROJECT_DIR}/deploy/nginx/switch-upstream.sh"
    
    # 4. 現在の環境を停止
    print_yellow "🛑 ${current_service} を停止中..."
    sudo systemctl stop "$current_service"
    
    # 5. 完了
    print_green "✅ ロールバック完了!"
    print_green "  アクティブ: ${rollback_service} (ポート: ${rollback_port})"
    
    log "ロールバック成功: ${current_service} → ${rollback_service}"
}

# rootチェック
if [ "$EUID" -ne 0 ]; then 
    print_red "❌ このスクリプトはroot権限で実行してください"
    echo "使用方法: sudo $0"
    exit 1
fi

# 実行確認
print_red "⚠️  警告: ロールバックを実行します"
read -p "続行するには 'rollback' と入力してください: " confirm

if [ "$confirm" != "rollback" ]; then
    print_yellow "ロールバックをキャンセルしました"
    exit 0
fi

# 実行
main