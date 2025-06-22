# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **デプロイ**: VPS (Xserver) + Nginx + PM2

## アーキテクチャ

### ディレクトリ構造
```
charactier-ai/
├── frontend/          # Next.js アプリケーション
├── backend/           # Express.js APIサーバー
├── docs/              # ドキュメント（openapi.yaml含む）
├── scripts/           # ユーティリティスクリプト
└── uploads/           # アップロードされたファイル
```

### APIアーキテクチャ
- バックエンドAPI: `/api/v1/` で始まる
- フロントエンドプロキシ: `/api/` 経由（v1なし）
- RouteRegistry: 重複ルート防止システム
- OpenAPI仕様: `docs/openapi.yaml` に全API定義

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
```

### フロントエンド
```bash
npm run dev              # Next.js開発サーバー
npm run build            # 本番ビルド
npm run start            # 本番サーバー起動
npm run lint             # ESLintチェック
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
1. まず `docs/openapi.yaml` で既存の定義を確認
2. なければ `paths:` に追加
3. 実装は `backend/src/index.ts` に追加
4. 型定義は `types.ts` に追加

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
- JWT認証（アクセス/リフレッシュトークン）
- 全エンドポイントでレート制限
- 不適切なメッセージのフィルタリング
- IPモニタリングとブロック
- 違反者への制裁システム

## デプロイ構成

### PM2エコシステム
- フロントエンド: bashインタープリターでforkモード
- バックエンド: コンパイル済みJSをforkモード
- 環境変数はPM2が注入

### 本番環境構成
```
Nginx (SSL終端) → 
  Frontend (port 3000) → 
    Backend (port 5000) → 
      MongoDB Atlas + Redis + Stripe
```

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
- `/docs/openapi.yaml`