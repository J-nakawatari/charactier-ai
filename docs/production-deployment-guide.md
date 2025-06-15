# 🚀 本番環境デプロイガイド

## 概要

Charactier AIの本番環境デプロイに必要な設定とプロセスを説明します。

## 🏗️ アーキテクチャ

```
[インターネット] 
    ↓
[Nginx] - リバースプロキシ・SSL終端
    ↓
[Frontend (Next.js)] - ポート3000
    ↓ (API プロキシ)
[Backend (Express.js)] - ポート3004
    ↓
[MongoDB Atlas] + [Redis] + [Stripe]
```

## 📋 デプロイ前チェックリスト

### 1. 環境変数の設定

#### フロントエンド (.env.production)
```bash
# API エンドポイント
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
BACKEND_URL=http://backend:3004

# 画像ドメイン
NEXT_PUBLIC_IMAGE_DOMAIN=yourdomain.com

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx...

# 環境
NODE_ENV=production
```

#### バックエンド (.env.production)
```bash
# サーバー
PORT=3004
NODE_ENV=production

# データベース
MONGO_URI=mongodb://username:password@cluster.mongodb.net/charactier

# 認証
JWT_SECRET=extremely-long-random-string-for-production
JWT_REFRESH_SECRET=another-extremely-long-random-string

# 外部API
OPENAI_API_KEY=sk_live_xxx...
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...

# Redis
REDIS_URL=redis://redis:6379

# CORS
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. セキュリティ設定

- [ ] **JWT秘密鍵**: 64文字以上のランダム文字列
- [ ] **データベース**: ユーザー名・パスワード認証
- [ ] **HTTPS**: SSL証明書の設定
- [ ] **CORS**: 適切なオリジン制限
- [ ] **環境変数**: `.env`ファイルの適切な管理

### 3. パフォーマンス設定

- [ ] **画像最適化**: Next.jsの画像最適化有効
- [ ] **キャッシュ**: Redis正常動作確認
- [ ] **CDN**: 静的ファイル配信（オプション）
- [ ] **圧縮**: gzip/brotli圧縮有効

## 🛠️ デプロイ手順

### Step 1: ビルドテスト

```bash
# フロントエンド
cd frontend
npm run build
npm start

# バックエンド
cd backend
npm run type-check
npm run lint
```

### Step 2: Docker設定（推奨）

#### docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
      - BACKEND_URL=http://backend:3004
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      - MONGO_URI=${MONGO_URI}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
```

### Step 3: Nginx設定

#### nginx.conf
```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:3004;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # フロントエンド
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API (直接バックエンド)
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # アップロードファイル
    location /uploads/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
```

### Step 4: データベース設定

#### MongoDB Atlas
- [ ] クラスター作成
- [ ] ユーザー作成（読み書き権限）
- [ ] IPアドレス制限設定
- [ ] 接続文字列取得

#### Redis設定
- [ ] Redis サーバー起動
- [ ] 接続テスト
- [ ] メモリ設定調整

### Step 5: 外部サービス設定

#### Stripe
- [ ] 本番環境キー取得
- [ ] Webhook URL設定: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Webhook署名検証

#### OpenAI
- [ ] 本番環境API キー
- [ ] 使用量制限設定
- [ ] 課金アラート設定

## 🔍 動作確認

### 1. 基本動作テスト
```bash
# ヘルスチェック
curl https://yourdomain.com/api/health

# 認証テスト
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 2. フロントエンド確認
- [ ] ログイン・登録動作
- [ ] キャラクター一覧表示
- [ ] チャット機能動作
- [ ] 購入フロー動作

### 3. パフォーマンス確認
- [ ] ページ読み込み速度
- [ ] API レスポンス時間
- [ ] 画像読み込み速度

## 🚨 トラブルシューティング

### よくある問題

#### 1. API接続エラー
```
Error: ECONNREFUSED
```
**解決方法**:
- `BACKEND_URL` 環境変数を確認
- Docker内部ネットワーク設定確認

#### 2. CORS エラー
```
Access to fetch blocked by CORS policy
```
**解決方法**:
- `ALLOWED_ORIGINS` 環境変数確認
- フロントエンドのドメイン設定確認

#### 3. 画像表示エラー
```
Image optimization error
```
**解決方法**:
- `NEXT_PUBLIC_IMAGE_DOMAIN` 設定確認
- next.config.js の domains 設定確認

### ログ確認

```bash
# Docker logs
docker-compose logs frontend
docker-compose logs backend

# アプリケーションログ
tail -f /var/log/charactier/app.log
```

## 📊 モニタリング

### 必須メトリクス
- [ ] サーバーリソース使用率
- [ ] API レスポンス時間
- [ ] エラー率
- [ ] データベース接続数
- [ ] Redis メモリ使用量

### アラート設定
- [ ] サーバーダウン
- [ ] 高エラー率（>5%）
- [ ] 高レスポンス時間（>2秒）
- [ ] ディスク使用量（>80%）

## 🔄 更新・保守

### 継続的デプロイ
1. GitHub Actions設定
2. 自動テスト実行
3. ステージング環境での検証
4. 本番デプロイ

### バックアップ
- [ ] データベース日次バックアップ
- [ ] アップロードファイルバックアップ
- [ ] 設定ファイルバックアップ

### セキュリティ更新
- [ ] 依存関係の定期更新
- [ ] SSL証明書の更新
- [ ] セキュリティパッチ適用

---

このガイドに従って本番環境を構築することで、安全で高性能なCharactier AIサービスを提供できます。