# セキュリティ設定

## 開発者向けセットアップ

### 1. Gitフックの有効化
```bash
npx husky install
```

### 2. gitleaksのインストール
機密情報の漏洩を防ぐため、gitleaksのインストールが必要です。

#### macOS
```bash
brew install gitleaks
```

#### Ubuntu/Linux
```bash
# 最新版をダウンロード
VERSION=$(curl -s https://api.github.com/repos/gitleaks/gitleaks/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
wget https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_linux_x64.tar.gz
tar -xzf gitleaks_${VERSION}_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

詳細は `/docs/gitleaks-setup.md` を参照してください。

## セキュリティ機能

### 実装済み

1. **OpenAI Moderation API**
   - 不適切なコンテンツの自動検出・ブロック

2. **CORS設定**
   - 本番環境では指定ドメインのみ許可
   - 環境変数: `ALLOWED_ORIGINS`

3. **JWT暗号化**
   - JWT秘密鍵の暗号化保管
   - セットアップ: `npm run setup:jwt-encryption`

4. **Argon2idパスワードハッシュ**
   - bcryptからの自動移行
   - 移行状況確認: `npm run check:password-migration`

5. **Stripe Idempotency**
   - 決済の重複防止
   - 24時間のキャッシュ

6. **Gitleaks**
   - コミット時の機密情報チェック
   - pre-commitフックで自動実行

### レート制限

- 一般API: 100リクエスト/分
- 認証API: 5リクエスト/分
- チャットAPI: 60メッセージ/時間

### セキュリティヘッダー

- Helmet.jsによる基本的なセキュリティヘッダー
- CSP、HSTS、X-Frame-Options等

## 緊急時の連絡先

セキュリティ上の問題を発見した場合は、公開せずに以下に連絡してください：

- メール: [セキュリティ担当メールアドレス]
- 緊急度が高い場合: [緊急連絡先]

## 監査ログ

- 全APIアクセスログ
- 認証失敗ログ
- 違反検出ログ

ログの確認:
```bash
sudo journalctl -u charactier-backend -f
```