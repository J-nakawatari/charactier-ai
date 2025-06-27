# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

最終更新: 2025-06-26

## プロジェクト概要

Charactier AIは、ユーザーがトークンを使ってAIキャラクターとチャットできるサービスです。
- 無料キャラクターと有料キャラクターが存在
- トークンは購入制（サブスクリプションではない）
- 会話を重ねることで親密度が上がる
- 99%の利益率を維持する設計

### 技術スタック
- **フロントエンド**: Next.js 15 + TypeScript + Tailwind CSS
- **バックエンド**: Express.js + TypeScript + MongoDB
- **決済**: Stripe（キャラクター購入とトークン購入）
- **AI**: OpenAI API (GPT-4o-mini)
- **キャッシュ**: Redis（プロンプトキャッシュ、SSE）
- **デプロイ**: VPS (Xserver) + Nginx + systemd

## アーキテクチャ

### ディレクトリ構造
```
charactier-ai/
├── frontend/          # Next.js アプリケーション
├── backend/           # Express.js APIサーバー
│   └── docs/         # バックエンドドキュメント（openapi.yaml含む）
├── docs/              # プロジェクトドキュメント
├── scripts/           # ユーティリティスクリプト
└── uploads/           # アップロードされたファイル
```

### APIアーキテクチャ
- バックエンドAPI: `/api/v1/` で始まる（移行完了）
- フロントエンドプロキシ: `/api/v1/` 経由
- RouteRegistry: 重複ルート防止システム
- OpenAPI仕様: `backend/docs/openapi.yaml` に全API定義

#### API v1移行の経緯（2025-06-24）
- **問題**: フロントエンド/バックエンド間でAPIパスの不整合により404エラーが多発
- **原因**: `/api/` と `/api/v1/` の混在、Next.jsプロキシルートの不完全な実装
- **解決策**: 全システムを `/api/v1/` に統一
  - バックエンド: 全ルートを `/api/v1/` 配下に集約
  - フロントエンド: catch-all proxyで `/api/v1/` に統一
  - Nginx: `/api/v1/` → `http://localhost:5000/api/v1/` にプロキシ

#### 管理者/ユーザーAPI分離（2025-06-25）
- **問題**: 管理者認証とユーザー認証の混在による認証エラー
- **原因**: `/api/v1/characters` が管理者・ユーザー共用で、パスベース認証が混乱
- **解決策**: 明確な役割分担
  - `/api/v1/characters`: ユーザー専用（購入状況フィルタリングあり）
  - `/api/v1/admin/characters`: 管理者専用（統計情報付き、全キャラ表示）

### 重要なアーキテクチャ決定
1. **99%利益率システム**: `backend/src/config/tokenConfig.ts` で一元管理
2. **プロンプトキャッシュ**: コスト削減のためRedis/MongoDBにキャッシュ
3. **SSE通知**: 購入完了通知にServer-Sent Events使用
4. **国際化**: Next.jsの`[locale]`パラメータによる多言語対応
5. **型安全性**: TypeScript厳格モード（フロントエンドで有効）

## 開発コマンド

### ルートレベル
```bash
npm run dev              # フロントエンドとバックエンドを同時起動
```

### バックエンド
```bash
npm run dev              # 開発サーバー起動
npm run build            # TypeScriptビルド
npm run start            # 本番サーバー起動
npm run lint             # ESLintチェック
npm run type-check       # TypeScript型チェック
npm run check-api-duplicates  # API重複チェック
npm run test:security    # セキュリティテスト実行
npm run test:load        # 負荷テスト実行
```

### フロントエンド
```bash
npm run dev              # Next.js開発サーバー
npm run build            # 本番ビルド
npm run start            # 本番サーバー起動
npm run lint             # ESLintチェック
```

### 本番サーバー管理
```bash
# サービス管理
sudo systemctl status charactier-backend charactier-frontend
sudo systemctl restart charactier-backend
sudo systemctl restart charactier-frontend

# ログ確認
sudo journalctl -u charactier-backend -f
sudo journalctl -u charactier-frontend -f

# デプロイ
git pull  # 自動的にビルド・再起動される
```

## 厳守ルール

### 絶対にやってはいけないこと（NEVER）
- `backend/webhooks/` 内のファイルを編集・削除しない
- トークン計算ロジックを変更しない
- `.env`ファイルや認証情報を触らない
- 破壊的なgitコマンドを実行しない
- 機密情報をハードコードしない
- 既存プロセスを確認せずに新しいサーバーを起動しない

### 必ず守ること（MUST）
- キャラクタープロンプトは初回使用後にキャッシュする
- 親密度レベル10ごとに画像をアンロックする
- 99%の利益率を維持する（`docs/99-percent-profit-system.md`参照）
- 複雑なロジックにはコメントを追加する
- 設定ファイルの変更前に許可を求める
- すべての新機能はモバイルレスポンシブにする

## 開発ワークフロー

### 1. 探索
既存のコードを読んで理解する（コードは書かない）

### 2. 計画
実装前に計画を立てる

### 3. 実装
明確な計画ができてから実装する

### 4. コミット
- コンベンショナルコミット使用: `feat:`, `fix:`, `test:`, `refactor:`
- PRには以下を含める：
  - 変更の目的
  - 実装アプローチ
  - テスト結果
  - マイグレーション注意事項（あれば）
  - レビュアーへの注意点

## APIの追加・変更

新しいAPIを追加する際は：
1. まず `backend/docs/openapi.yaml` で既存の定義を確認
2. なければ `paths:` に追加
3. 実装は `backend/src/index.ts` または適切なルートファイルに追加
4. 型定義は `backend/src/types/` に追加
5. 入力検証スキーマを `backend/src/validation/schemas.ts` に追加

## 重要なシステム

### 99%利益システム
- トークン価格計算は `tokenConfig.ts` で管理
- 動的為替レート対応（フォールバック: 150 JPY/USD）
- 利益率の厳格な検証

### 親密度システム
- 0-100のレベル範囲（ユーザー×キャラクター）
- 10レベルごとに画像アンロック
- レベルに応じてトーン変化
- ムードシステムが応答に影響

### セキュリティとパフォーマンス
- JWT認証（HttpOnly Cookie + リフレッシュトークン）
- 全エンドポイントでレート制限
  - 一般API: 100リクエスト/分
  - チャットAPI: 60メッセージ/時間（ユーザーごと）
  - 認証API: 5リクエスト/分
  - 詳細: `docs/rate-limiting.md`
- セキュリティヘッダー（Helmet.js）
  - CSP、HSTS、X-Frame-Options等
  - 詳細: `docs/security-headers.md`
- 入力検証（Joi）全エンドポイント対応
- 構造化ログ（Winston）による機密情報保護
- エラーメッセージの最小化
- 不適切なメッセージのフィルタリング
- IPモニタリングとブロック
- 違反者への制裁システム

## デプロイ構成

### systemdサービス管理
- フロントエンド: `charactier-frontend.service`
- バックエンド: `charactier-backend.service`
- 自動起動・再起動設定済み
- ログ: `journalctl -u サービス名`

### 本番環境構成
```
Nginx (SSL終端) → 
  Frontend (port 3000) → 
    Backend (port 5000) → 
      MongoDB Atlas + Redis + Stripe
```

### デプロイフロー
1. `git pull` → 自動的にビルド実行（post-merge hook）
2. systemdサービスの自動再起動
3. 権限自動修正（.next/ディレクトリ）

## UI設計原則
- フラットでミニマリスティックなUI（白 + Lucideアイコン）
- すべてのユーザーフィードバックにtoast通知を使用
- Tailwindユーティリティのみ使用（インラインスタイル禁止）
- レスポンシブデザイン必須（モバイルファースト）
- ユーザー向けページのみi18n対応（管理画面は日本語のみ）

## AIモデル

現在利用可能なモデル：
1. **GPT-3.5 Turbo** - 開発・テスト用
2. **GPT-4o mini** - 本番環境用（推奨）

新しいモデル追加時は以下のファイルを更新：
- `/backend/src/routes/modelSettings.ts`
- `/backend/src/config/tokenConfig.ts`
- `/backend/src/models/CharacterModel.ts`
- `/backend/models/TokenUsage.js`
- `/frontend/app/admin/characters/[id]/edit/page.tsx`
- `/frontend/app/admin/characters/new/page.tsx`
- `/backend/docs/openapi.yaml`

## メール認証システム（日本語・英語対応）

### 概要
- メール認証リンクは直接バックエンドAPI（`/api/v1/auth/verify-email`）を呼び出す
- バックエンドがHTMLレスポンスを直接返す（フロントエンドページは不要）
- localeパラメータで言語を判別

### 重要なポイント
1. **localStorageへの保存タイミング**
   - `window.onload`を待たずに即座にlocalStorageに保存
   - 自己実行関数でユーザー情報とトークンを保存
   - これによりセットアップページで`getCurrentUser()`が正しく動作

2. **リダイレクト処理**
   - 認証成功後は`/${locale}/setup`にリダイレクト
   - 3秒後の自動リダイレクト（JavaScript）
   - 「今すぐセットアップを開始」ボタンで即座に移動可能

3. **エラーハンドリング**
   - トークン無効/期限切れ：赤いエラーページ
   - 既に認証済み：セットアップページへリダイレクト
   - サーバーエラー：グレーのエラーページ

4. **互換性の維持**
   - 古いメールリンク（`/api/auth/verify-email`）もサポート
   - 新しいパス（`/api/v1/auth/verify-email`）にリダイレクト

### 関連ファイル
- `/backend/src/routes/auth.ts` - メール認証エンドポイント
- `/backend/src/utils/sendEmail.ts` - メール送信処理
- `/frontend/app/[locale]/setup/page.tsx` - セットアップページ
- `/frontend/utils/auth.ts` - 認証ユーティリティ

## 最近のセキュリティ改善（2025-06-27更新）

### 実装済みのセキュリティ対策
1. **CORS設定**: 本番ドメインのみに制限
2. **パスワードハッシュ**: bcryptからargon2idに移行（互換性維持）
3. **OpenAI Moderation API**: 不適切なコンテンツのフィルタリング
4. **JWT暗号化**: JWT秘密鍵の暗号化保管（AES-256-GCM）
5. **Stripe Idempotency**: 重複請求防止のための冪等性キー実装
6. **Gitleaks**: pre-commitフックで機密情報漏洩防止
7. **レート制限**: 全APIエンドポイントに適用
8. **NoSQLインジェクション対策**: $eq演算子とフィールドホワイトリスト
9. **正規表現インジェクション対策**: escapeRegex関数でReDoS防止
10. **CSRF保護**: ダブルサブミットクッキーパターンで実装済み
11. **XSS対策強化**（2025-06-27）: 
    - メール認証HTMLをHandlebarsテンプレート化
    - チャットメッセージのサニタイズ（sanitize-html）
    - 既存データのマイグレーション: `npm run xss:migrate`

### セキュリティ強化作業中（feature/fix-breaking-security-warnings）
- JWT保存方式の改善（httpOnly Cookie化）
- CSRF SameSite Strictへの移行
- Joi検証の厳格化

## トラブルシューティング

### よくある問題
1. **API 404エラー**: `/api/v1/` プレフィックスを確認
2. **認証エラー**: Cookie設定とSameSite属性を確認
3. **CORS エラー**: 本番環境のドメイン設定を確認
4. **トークン計算エラー**: `tokenConfig.ts`の設定を確認

### デバッグ用エンドポイント
- `/api/v1/debug/auth-status` - 認証状態の確認
- `/api/v1/debug/affinity-details/:userId` - 親密度詳細情報