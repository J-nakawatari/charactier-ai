# 🧠 CLAUDE.md - Charactier AI Chat Service

## 📋 Project Overview

Charactier is an AI character chat service where users can talk with unique characters using tokens.
Some characters are free, others must be purchased. Tokens are consumed per message, and intimacy level increases with conversations.

* **Frontend**: Next.js + Tailwind CSS
* **Backend**: Express.js (Node.js)
* **Database**: MongoDB Atlas
* **Payment**: Stripe (Webhooks for character purchase)
* **Deployment**: VPS (Xserver) + Nginx + PM2
* ✅ **Fully responsive design required (mobile-first supported)**
* 🌍 **Multilingual support for user-facing pages only (i18n-ready, currently Japanese & English planned)**
* 📁 `frontend/`, `backend/` にもCLAUDE.mdを個別設置し、モジュールごとの文脈を明確化

## 🏗️ Architecture

* `frontend/`: Contains the user UI and admin dashboard
* `backend/`: Contains API routes, models, and logic
* `webhooks/`: Stripe purchase hooks — **DO NOT TOUCH**
* `models/`: Includes User.js, TokenPack.js, Character.js, TokenUsage.js
* `middleware/`: Includes rate limiters, error loggers

## 🔐 Rules for AI Assistant

NEVER:

* NEVER edit or delete any file inside `backend/webhooks/`
* NEVER change token calculation logic (`User.js`, `TokenUsage.js`, etc.)
* NEVER touch `.env` or credentials
* NEVER run destructive git or bash commands
* NEVER edit .env files or environment variables
* NEVER hardcode or log secret keys, DB passwords, or other sensitive data
* NEVER start multiple servers without checking for existing processes first

YOU MUST:

* YOU MUST cache character system prompts after first use (performance optimization)
* YOU MUST support intimacy level unlocking images at every 10 levels
* YOU MUST maintain a 94% profit margin in token reward design
* YOU MUST include comments in complex prompt-related logic
* YOU MUST check for existing server processes before starting new ones
* YOU MUST ask permission before modifying any configuration files
* YOU MUST maintain strict security practices with sensitive data

IMPORTANT:

* IMPORTANT: Maintain a flat and minimalistic UI (white + Lucide icons)
* IMPORTANT: Trailing stop logic for paid chat should not be altered without explicit instruction
* IMPORTANT: All new features must be mobile responsive

## 🚀 Development Workflow

### Step 1: 探索

* Use `@` to explore existing API endpoints or models
* Example: `@backend/models/Character.js` を読み、まだコードは書かないで

### Step 2: 計画

* Use `think` to plan before coding
* Example: `この親密度機能を think hard で改善案を出して`

### Step 3: 実装

* Implement only after a clear plan is created
* Use TDD when API contracts are fixed (OpenAPI if available)

### Step 4: コミット

* Split commits: `feat:`, `fix:`, `test:`, `refactor:`
* Pull requests must include:

  * Purpose of change
  * Implementation approach
  * Test results
  * Migration note (if any)
  * Attention for reviewer

## 🛠 Frequently Used Commands

* `npm run dev` - Start development server
* `npm run lint` - Check ESLint rules
* `npm run test` - Run all tests
* `pm2 restart all` - Restart production services
* `mongo shell` - Check database directly (admin only)

## 📚 Documentation Notes

* Use `docs/architecture.md` for architectural decisions
* Write test plans in `docs/test-cases/`
* Update README.md after any major feature

## 📌 UI Design

* Sidebar layout with top nav bar
* Use `toast` for all user feedback
* Consistent spacing & button design
* Tailwind utilities only — no inline styles
* ✅ MUST be **responsive for all screen sizes (mobile, tablet, desktop)**
* 🌍 Components and pages MUST be **i18n-ready (via Next.js `app/[locale]/`) for user-facing pages only**
* 🚫 管理画面は多言語対応 **不要（日本語のみ）**

## 🎨 Intimacy System

* Character intimacy (0–100), stored per user
* Unlock images every 10 levels
* Change tone/personality gradually as intimacy grows

## 📧 Notification System

* Notify users on:

  * Low token balance
  * New intimacy unlock
  * Character promo
* Admin can trigger messages from dashboard

## 🧾 Token System

* Tokens purchased via Stripe
* One-time purchases (not subscriptions)
* Log usage in `TokenUsage.js`
* User's balance in `UserTokenPack.js`

## 💬 Chat System

* Uses OpenAI API for chat completion
* Messages consume tokens based on characterPrompt + userMessage
* Cache character prompts to reduce cost

## 🤖 AI Models

現在利用可能なAIモデル（2つ）：

1. **GPT-3.5 Turbo** (`gpt-3.5-turbo`)
   - 開発・テスト用
   - 価格: $0.5/$1.5 per 1M tokens (入力/出力)

2. **GPT-4o mini** (`gpt-4o-mini`) ⭐本番環境用
   - 推奨モデル - バランスの取れた性能とコスト
   - 価格: $0.15/$0.6 per 1M tokens (入力/出力)
   - 全てのキャラクターに使用

**重要な注意事項：**
- モデル名の表示名とモデルIDは異なる場合がある
- 新しいモデルを追加する際は、以下のファイルを全て更新すること：
  - `/backend/src/routes/modelSettings.ts` - モデル一覧
  - `/backend/src/config/tokenConfig.ts` - 価格設定
  - `/backend/src/models/CharacterModel.ts` - スキーマ定義
  - `/backend/models/TokenUsage.js` - 使用履歴モデル（本番環境）
  - `/frontend/app/admin/characters/[id]/edit/page.tsx` - 管理画面
  - `/frontend/app/admin/characters/new/page.tsx` - 新規作成画面
  - `/docs/openapi.yaml` - API仕様書

## 📡 API設計と実装ルール

* すべてのAPIは `docs/openapi.yaml` に記述されている
* 新しいAPIを追加する前に必ず **既存の定義を確認**
* ない場合のみ `paths:` に追記し、必要に応じて `components.schemas` も拡張
* 実装は `backend/src/index.ts` に、型は `types.ts` に追加
* Claudeが実装する場合もこのルールに従うこと

## 📡 API仕様管理ルール

- 新しく作るAPIは必ず `/docs/openapi.yaml` に定義を追加してください
- Claudeが自動生成する場合も、まず `openapi.yaml` の `paths:` に追記してから `index.ts` に実装
- `components.schemas` に型が必要な場合は再利用 or 追加



## 🧠 Claudeへの指示テンプレート

```plaintext
この画面に使うAPIを追加したい。

- メソッド：POST
- パス：/api/user/reset-affinity
- ボディ：{ "characterId": "string" }
- 認証：JWT
- レスポンス：{ "success": true, "message": "リセット完了" }

まず `openapi.yaml` に同じAPIがあるか確認して、
なければ `paths:` に追加してください。

その上で、型を `types.ts` に、実装を `index.ts` にお願いします。

## 🌊 SSE (Server-Sent Events) システム

購入完了のリアルタイム通知にSSEを使用：

* **Redis**: 一時的な通知データストア (`purchase:${sessionId}`, TTL: 60秒)
* **バックエンド**: `/api/purchase/events/:sessionId` でSSEストリーム提供
* **フロントエンド**: EventSource APIでリアルタイム受信
* **フォールバック**: SSE失敗時は従来のポーリング方式に自動切替
* **クリーンアップ**: 接続終了時の適切なリソース解放
