#!/bin/bash

# Nginx upstream 切り替えスクリプト
# Blue (5000) ⇔ Green (5001) を切り替える

NGINX_CONF="/etc/nginx/conf.d/charactier-backend-upstream.conf"
BACKUP_DIR="/etc/nginx/backup"

# 色付き出力用の関数
print_blue() { echo -e "\033[34m$1\033[0m"; }
print_green() { echo -e "\033[32m$1\033[0m"; }
print_yellow() { echo -e "\033[33m$1\033[0m"; }
print_red() { echo -e "\033[31m$1\033[0m"; }

# 現在のアクティブポートを確認
get_active_port() {
    grep -E "^\s*server\s+127\.0\.0\.1:" "$NGINX_CONF" | grep -v "#" | head -1 | grep -oE ":[0-9]+" | tr -d ":"
}

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR"

# 現在の設定をバックアップ
backup_config() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    cp "$NGINX_CONF" "$BACKUP_DIR/upstream_${timestamp}.conf"
    print_yellow "📦 設定をバックアップしました: $BACKUP_DIR/upstream_${timestamp}.conf"
}

# 設定を切り替え
switch_upstream() {
    local current_port=$(get_active_port)
    local new_port
    
    if [ "$current_port" == "5000" ]; then
        new_port="5001"
        print_blue "🔄 Blue (5000) → Green (5001) に切り替えます"
    else
        new_port="5000"
        print_green "🔄 Green (5001) → Blue (5000) に切り替えます"
    fi
    
    # sedで設定を更新
    sed -i.tmp -E "s/(server\s+127\.0\.0\.1:)5000(\s*;.*)/\15001\2/" "$NGINX_CONF"
    sed -i.tmp -E "s/(server\s+127\.0\.0\.1:)5001(\s*;.*)/\15000\2/" "$NGINX_CONF"
    
    # 最初に見つかったポートを新しいポートに変更
    if [ "$current_port" == "5000" ]; then
        sed -i.tmp -E "0,/(server\s+127\.0\.0\.1:)5000/{s//\15001/}" "$NGINX_CONF"
    else
        sed -i.tmp -E "0,/(server\s+127\.0\.0\.1:)5001/{s//\15000/}" "$NGINX_CONF"
    fi
    
    # 一時ファイルを削除
    rm -f "${NGINX_CONF}.tmp"
    
    print_green "✅ 設定を更新しました (${current_port} → ${new_port})"
}

# Nginx設定をテスト
test_nginx() {
    print_yellow "🧪 Nginx設定をテスト中..."
    if nginx -t; then
        print_green "✅ Nginx設定は有効です"
        return 0
    else
        print_red "❌ Nginx設定にエラーがあります"
        return 1
    fi
}

# Nginxをリロード
reload_nginx() {
    print_yellow "🔄 Nginxをリロード中..."
    if nginx -s reload; then
        print_green "✅ Nginxが正常にリロードされました"
        return 0
    else
        print_red "❌ Nginxのリロードに失敗しました"
        return 1
    fi
}

# メイン処理
main() {
    print_blue "=== Nginx Upstream 切り替えスクリプト ==="
    
    # 現在の状態を表示
    local current_port=$(get_active_port)
    if [ "$current_port" == "5000" ]; then
        print_blue "📍 現在: Blue (5000) がアクティブです"
    else
        print_green "📍 現在: Green (5001) がアクティブです"
    fi
    
    # バックアップ
    backup_config
    
    # 切り替え
    switch_upstream
    
    # テスト
    if test_nginx; then
        # リロード
        if reload_nginx; then
            local new_port=$(get_active_port)
            print_green "🎉 切り替え完了! 新しいアクティブポート: ${new_port}"
        else
            print_red "⚠️  リロードに失敗しました。設定を元に戻します..."
            # TODO: ロールバック処理
        fi
    else
        print_red "⚠️  設定にエラーがあります。変更を元に戻します..."
        # TODO: ロールバック処理
    fi
}

# rootユーザーチェック
if [ "$EUID" -ne 0 ]; then 
    print_red "❌ このスクリプトはroot権限で実行してください"
    echo "使用方法: sudo $0"
    exit 1
fi

# 実行
main