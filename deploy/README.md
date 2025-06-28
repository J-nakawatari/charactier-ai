# Blue-Green デプロイメント ガイド

## 概要

このディレクトリには、Charactier AIのゼロダウンタイムデプロイメントを実現するためのスクリプトと設定ファイルが含まれています。

## アーキテクチャ

```
[Nginx]
   |
   ├─→ [Blue: Port 5000]  ← 現在稼働中
   └─→ [Green: Port 5001] ← 次回デプロイ用
```

## ファイル構成

```
deploy/
├── systemd/
│   ├── charactier-backend-blue.service   # Blue環境用 (Port 5000)
│   └── charactier-backend-green.service  # Green環境用 (Port 5001)
├── nginx/
│   ├── charactier-backend-upstream.conf  # upstream設定
│   ├── charactier-site.conf             # サイト設定例
│   └── switch-upstream.sh               # upstream切り替えスクリプト
├── deploy-blue-green.sh                 # 自動デプロイスクリプト
├── rollback-blue-green.sh              # ロールバックスクリプト
└── README.md                           # このファイル
```

## セットアップ手順

### 1. systemdサービスファイルのインストール

```bash
# Blue/Greenサービスをインストール
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# 既存のサービスを無効化
sudo systemctl disable charactier-backend
sudo systemctl stop charactier-backend

# Blueサービスを有効化（初回のみ）
sudo systemctl enable charactier-backend-blue
sudo systemctl start charactier-backend-blue
```

### 2. Nginx設定の更新

```bash
# upstream設定をコピー
sudo cp nginx/charactier-backend-upstream.conf /etc/nginx/conf.d/

# 既存のNginx設定を更新（proxy_pass http://backend; を使用）
sudo nginx -t
sudo nginx -s reload
```

## 使い方

### 通常のデプロイ

```bash
sudo ./deploy-blue-green.sh
```

実行内容：
1. 最新のコードを取得（git pull）
2. バックエンド・フロントエンドをビルド
3. 新しい環境（Blue/Green）を起動
4. ヘルスチェック
5. Nginxを切り替え
6. 古い環境を停止

### ロールバック

問題が発生した場合：

```bash
sudo ./rollback-blue-green.sh
```

### 手動での切り替え

```bash
# Nginxのupstreamのみ切り替え
sudo ./nginx/switch-upstream.sh

# サービスの手動操作
sudo systemctl status charactier-backend-blue
sudo systemctl status charactier-backend-green
```

## 状態の確認

### 現在のアクティブ環境を確認

```bash
# Nginxの設定を確認
grep -E "^\s*server\s+127\.0\.0\.1:" /etc/nginx/conf.d/charactier-backend-upstream.conf | grep -v "#"

# サービスの状態を確認
sudo systemctl status charactier-backend-blue charactier-backend-green
```

### ログの確認

```bash
# デプロイログ
tail -f /var/log/charactier-deploy.log

# サービスログ
sudo journalctl -u charactier-backend-blue -f
sudo journalctl -u charactier-backend-green -f
```

## トラブルシューティング

### ヘルスチェックが失敗する場合

1. ポートが正しく設定されているか確認
2. `/api/v1/health` エンドポイントが実装されているか確認
3. ファイアウォールの設定を確認

### Nginxのリロードが失敗する場合

1. 設定ファイルの構文をチェック：`sudo nginx -t`
2. upstream設定ファイルのパスを確認
3. 権限を確認

### サービスが起動しない場合

1. ログを確認：`sudo journalctl -u charactier-backend-blue -n 100`
2. ポートの重複を確認：`sudo lsof -i :5000`
3. 環境変数の設定を確認

## 注意事項

- 初回セットアップ後は、通常の `systemctl restart` は使用しない
- 必ず Blue-Green デプロイスクリプトを使用する
- 本番環境では必ずバックアップを取ってから実行する
- デプロイ中もサービスは継続して提供される