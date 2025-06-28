# 🚀 Blue-Green デプロイメント クイックガイド

## 通常のデプロイ

```bash
# 1. コード更新
git pull origin main

# 2. デプロイ実行
sudo ./deploy/deploy-blue-green.sh
```

## ロールバック（問題発生時）

```bash
sudo ./deploy/rollback-blue-green.sh
```

## 状態確認

```bash
# アクティブな環境を確認（5000=Blue, 5001=Green）
sed -n '/upstream backend/,/^}/p' /etc/nginx/conf.d/charactier-backend-upstream.conf | grep "server 127.0.0.1:" | grep -v "#"

# サービス状態
sudo systemctl status charactier-backend-blue
sudo systemctl status charactier-backend-green

# ログ確認
sudo journalctl -u charactier-backend-blue -f
sudo journalctl -u charactier-backend-green -f
```

## 現在の環境

- **Blue**: ポート 5000
- **Green**: ポート 5001
- **現在アクティブ**: 上記コマンドで確認

## 注意事項

- `git pull`後の自動ビルド・再起動は**無効化済み**
- デプロイは必ず`deploy-blue-green.sh`を使用
- 本番への直接的な`systemctl restart`は避ける