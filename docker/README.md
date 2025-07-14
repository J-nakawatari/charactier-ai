# Docker環境構築ガイド

このディレクトリには、Charactier AIを他の環境で動作させるためのDocker設定ファイルが含まれています。

## ファイル構成

```
docker/
├── docker-compose.yml      # Docker Compose設定
├── Dockerfile.backend      # バックエンド用Dockerfile
├── Dockerfile.frontend     # フロントエンド用Dockerfile
├── nginx.conf             # Nginxリバースプロキシ設定
├── .env.example           # 環境変数のテンプレート
├── mongo-init.js          # MongoDB初期化スクリプト
└── README.md              # このファイル
```

## セットアップ手順

### 1. 環境変数の設定

```bash
# .env.exampleをコピーして.envを作成
cp .env.example .env

# .envファイルを編集して必要な値を設定
# 特に以下は必須：
# - JWT_SECRET / JWT_REFRESH_SECRET
# - OPENAI_API_KEY
# - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
# - SENDGRID_API_KEY
```

### 2. Docker環境の起動

```bash
# dockerディレクトリに移動
cd docker

# コンテナをビルドして起動
docker-compose up -d --build

# ログを確認
docker-compose logs -f
```

### 3. 動作確認

- フロントエンド: http://localhost
- バックエンドAPI: http://localhost/api/v1/health
- MongoDB: localhost:27017
- Redis: localhost:6379

## サービス構成

- **nginx**: リバースプロキシ（ポート80）
- **frontend**: Next.jsアプリケーション（内部ポート3000）
- **backend**: Express.jsサーバー（内部ポート5000）
- **mongodb**: データベース（ポート27017）
- **redis**: キャッシュサーバー（ポート6379）

## 管理コマンド

```bash
# すべてのコンテナを停止
docker-compose down

# コンテナとボリュームをすべて削除（データも削除されます）
docker-compose down -v

# 特定のサービスのログを見る
docker-compose logs -f backend

# コンテナに入る
docker-compose exec backend sh

# データベースに接続
docker-compose exec mongodb mongosh charactier
```

## トラブルシューティング

### ポートが使用中の場合
```bash
# 使用中のポートを確認
lsof -i :80
lsof -i :27017
lsof -i :6379

# docker-compose.ymlでポートを変更
# 例: "8080:80" に変更
```

### ビルドエラーの場合
```bash
# キャッシュをクリアして再ビルド
docker-compose build --no-cache
```

### 権限エラーの場合
uploadsディレクトリの権限を確認してください：
```bash
chmod -R 755 ../uploads
```

## 注意事項

- このDocker構成は開発・テスト環境用です
- 本番環境で使用する場合は、SSL証明書の設定が必要です
- 環境変数には本番用の値を設定してください
- データのバックアップを定期的に行ってください