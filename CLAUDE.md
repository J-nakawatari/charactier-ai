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

YOU MUST:

* YOU MUST cache character system prompts after first use (performance optimization)
* YOU MUST support intimacy level unlocking images at every 10 levels
* YOU MUST maintain a 50% profit margin in token reward design
* YOU MUST include comments in complex prompt-related logic

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
