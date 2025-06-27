# セキュリティ強化実装ガイド (2025Q2)

## 概要

このドキュメントは、2025年第2四半期に実装したセキュリティ強化の詳細を記載します。

## 実装済みセキュリティ対策

### 1. XSS (Cross-Site Scripting) 対策

#### 1.1 メール認証テンプレートのHandlebars化
- **実装ファイル**: `/backend/src/utils/emailTemplates.ts`
- **概要**: 危険なインラインHTML/JavaScriptをHandlebarsテンプレートに置換
- **効果**: 
  - ユーザー入力の自動エスケープ
  - URLの安全な検証とエスケープ
  - SendGridのエンコーディング問題（`&amp;`）への対応

#### 1.2 チャットメッセージのサニタイズ
- **実装ファイル**: `/backend/src/utils/sanitize.ts`
- **使用ライブラリ**: `sanitize-html`
- **設定**:
  ```javascript
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard'
  ```
- **マイグレーション**: `npm run xss:migrate`で既存データをサニタイズ

#### 1.3 XSSデモページ
- **場所**: `/frontend/app/[locale]/xss-demo/page.tsx`
- **アクセス制限**: 開発環境のみ（`NODE_ENV !== 'production'`）
- **目的**: LocalStorage vs HttpOnly Cookieのセキュリティ差を実演

### 2. JWT保存方式の改善

#### 2.1 Feature Flag実装
- **フラグ名**: `SECURE_COOKIE_AUTH`
- **設定ファイル**: `/backend/src/config/featureFlags.ts`
- **効果**:
  - `true`: HttpOnly Cookieに保存（XSS攻撃から保護）
  - `false`: LocalStorage/通常のCookieに保存（後方互換性）

#### 2.2 フロントエンド対応
- **実装ファイル**: `/frontend/utils/auth.ts`
- **主な変更**:
  - `getAuthHeaders()`: Feature Flagに基づいた認証ヘッダー生成
  - `isAuthenticated()`: Cookie/LocalStorage両対応
  - 同期版関数の追加（`getAuthHeadersSync()`等）

#### 2.3 バックエンド対応
- **実装ファイル**: `/backend/src/routes/auth.ts`
- **主な変更**:
  - ログイン/リフレッシュエンドポイントのFeature Flag対応
  - `SECURE_COOKIE_AUTH=true`時はレスポンスボディにトークンを含めない

### 3. CSRF保護の強化

#### 3.1 SameSite設定の環境変数化
- **フラグ名**: `CSRF_SAMESITE_STRICT`
- **効果**:
  - `true`: `sameSite: 'strict'`（より厳格なCSRF保護）
  - `false`: `sameSite: 'lax'`（デフォルト）

#### 3.2 既存のCSRF保護
- ダブルサブミットクッキーパターン実装済み
- CSRFトークンの自動検証

### 4. 入力検証の強化

#### 4.1 Joi検証のFeature Flag
- **フラグ名**: `STRICT_JOI_VALIDATION`
- **効果**:
  - `true`: 不明フィールドを拒否（厳格モード）
  - `false`: 不明フィールドを削除（従来モード）

#### 4.2 不明フィールドの警告ログ
- **フラグ名**: `LOG_UNKNOWN_FIELDS`
- **効果**: 不明なフィールドが送信された場合に警告ログ出力
- **用途**: 攻撃の早期発見、APIの誤用検知

### 5. その他のセキュリティ対策

#### 5.1 実装済み
- **パスワードハッシュ**: bcrypt → Argon2id移行（互換性維持）
- **OpenAI Moderation API**: 不適切なコンテンツのフィルタリング
- **JWT暗号化**: 秘密鍵の暗号化保管（AES-256-GCM）
- **Stripe Idempotency**: 重複請求防止
- **Gitleaks**: pre-commitフックで機密情報漏洩防止
- **レート制限**: 全APIエンドポイントに適用
- **NoSQLインジェクション対策**: $eq演算子とフィールドホワイトリスト
- **正規表現インジェクション対策**: escapeRegex関数でReDoS防止

#### 5.2 セキュリティヘッダー（Helmet.js）
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 0
- Strict-Transport-Security（HTTPS時）

## CI/CD統合

### GitHub Actions
- **ワークフロー**: `.github/workflows/security-checks.yml`
- **実行タイミング**:
  - PRのマージ時
  - mainブランチへのpush時
  - 毎週月曜日の定期実行
- **テスト内容**:
  - XSS保護テスト
  - CSRF保護テスト
  - レート制限テスト
  - 入力検証テスト
  - Feature Flag動作確認
  - セキュリティヘッダーチェック
  - 依存関係の脆弱性チェック（npm audit）
  - Gitleaksによる機密情報漏洩チェック

## Feature Flag設定

### 環境変数
```bash
# JWT保存方式の変更 (true: HttpOnly Cookie, false: LocalStorage)
FEATURE_SECURE_COOKIE_AUTH=false

# CSRF SameSite設定 (true: strict, false: lax)
FEATURE_CSRF_SAMESITE_STRICT=false

# Joi検証強化 (true: 厳格モード, false: 従来モード)
FEATURE_STRICT_JOI_VALIDATION=false

# 不明フィールドの警告ログ (true: 有効, false: 無効)
FEATURE_LOG_UNKNOWN_FIELDS=false
```

### 段階的な移行手順
1. **テスト環境**で各Feature Flagを有効化
2. **動作確認**とパフォーマンステスト
3. **本番環境**で段階的に有効化
4. **問題発生時**は即座にフラグを無効化

## セキュリティテスト

### 単体テスト
```bash
# XSSテスト
npm run test:security:xss

# レート制限テスト
npm run test:security:ratelimit

# 入力検証テスト
npm run test:security:validation

# Feature Flagテスト
npm run test:security:features

# セキュリティヘッダーテスト
npm run test:security:headers
```

### E2Eテスト
```bash
# フロントエンドでE2Eセキュリティテスト実行
cd frontend
npm run test:e2e:security
```

### 手動テスト
1. XSSデモページ: `http://localhost:3000/[locale]/xss-demo`
2. CSRF攻撃シミュレーション: `backend/scripts/csrf_check.sh`

## トラブルシューティング

### よくある問題

1. **Feature Flag が反映されない**
   - 環境変数の再読み込みが必要
   - サーバーの再起動を実行

2. **XSSサニタイズで表示が崩れる**
   - 許可タグリストの調整が必要
   - `backend/src/utils/sanitize.ts`の設定を確認

3. **HttpOnly Cookie でトークンが取得できない**
   - Feature Flagの設定を確認
   - フロントエンドの`getAuthHeaders()`使用を確認

## 今後の改善計画

1. **Content Security Policy の厳格化**
   - unsafe-inlineの削除
   - nonceベースのスクリプト実行

2. **Subresource Integrity (SRI)**
   - 外部リソースの完全性チェック

3. **セキュリティイベントロギング**
   - 攻撃検知の自動化
   - SIEM連携

4. **ペネトレーションテスト**
   - 定期的な外部セキュリティ監査

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)