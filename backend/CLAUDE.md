# 🔧 CLAUDE.md - Backend (API & Logic)

## Scope

This directory contains API routes, controllers, database models, and utilities.
It powers character prompts, token management, intimacy logic, and purchase validation.

## Rules

YOU MUST:

* Implement JWT-based authentication (accessToken + refreshToken)
* Keep characterPrompt caching logic intact
* Maintain token usage logging (`TokenUsage.js`) and user token balance (`UserTokenPack.js`)
* Enforce rate limiting using `rateLimitSecurity.js`
* Record all backend errors with `errorLogger.js`

NEVER:

* NEVER modify or access any file under `webhooks/`
* NEVER change logic inside `User.js` related to token deduction or balance
* NEVER touch `.env` or any credential storage

IMPORTANT:

* Admin-only routes must be guarded securely
* All Stripe webhook handlers must be idempotent using `event.id`
* API response structure should follow existing standard (camelCase, status codes)
* Code should be commented if logic involves intimacy or prompt customization
