# 📋 API エンドポイント一覧

> **最終更新**: 2025年01月09日  
> **総エンドポイント数**: 24個  
> **認証必須**: 21個 | **管理者権限必須**: 6個

---

## 🔧 **バックエンドAPI (Express.js)**

### 📱 **キャラクター関連API**

#### GET /api/characters
- **用途**: キャラクター一覧取得（検索・フィルタ・ソート対応）
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/characters?locale=ja&characterType=all&sort=popular&keyword=ルナ
```
- **レスポンス例**:
```json
{
  "characters": [
    {
      "_id": "character_001",
      "name": { "ja": "ルナ", "en": "Luna" },
      "description": { "ja": "優しい性格", "en": "Kind personality" },
      "isActive": true,
      "accessType": "free"
    }
  ],
  "filters": {
    "characterTypes": ["all", "initial", "purchased", "unpurchased"]
  }
}
```

---

#### GET /api/characters/:id
- **用途**: 個別キャラクター詳細取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/characters/character_001
```
- **レスポンス例**:
```json
{
  "_id": "character_001",
  "name": { "ja": "ルナ", "en": "Luna" },
  "description": { "ja": "優しい女の子", "en": "Kind girl" },
  "personalityPreset": "friendly",
  "isActive": true
}
```

---

#### PUT /api/characters/:id/translations
- **用途**: キャラクター翻訳データ更新
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
{
  "name": { "ja": "ルナ", "en": "Luna" },
  "description": { "ja": "更新された説明", "en": "Updated description" },
  "personalityPreset": "friendly",
  "personalityTags": ["kind", "gentle"]
}
```
- **レスポンス例**:
```json
{
  "success": true,
  "message": "Translation updated successfully"
}
```

---

#### GET /api/characters/:id/translations
- **用途**: キャラクター翻訳データ取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/characters/character_001/translations
```
- **レスポンス例**:
```json
{
  "ja": {
    "name": "ルナ",
    "description": "優しい女の子",
    "personalityPreset": "friendly"
  },
  "en": {
    "name": "Luna", 
    "description": "Kind girl",
    "personalityPreset": "friendly"
  }
}
```

---

### 👤 **ユーザー関連API**

#### GET /api/auth/user
- **用途**: ユーザー情報取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/auth/user
Headers: { "x-auth-token": "mock-token" }
```
- **レスポンス例**:
```json
{
  "_id": "mock-user-id",
  "name": "テストユーザー",
  "email": "test@example.com",
  "tokenBalance": 8500,
  "selectedCharacter": {
    "_id": "character_001",
    "name": "ルナ"
  }
}
```

---

#### PATCH /api/users/me/use-character
- **用途**: 選択キャラクター更新
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
{
  "characterId": "character_001"
}
```
- **レスポンス例**:
```json
{
  "_id": "mock-user-id",
  "name": "テストユーザー",
  "email": "test@example.com", 
  "tokenBalance": 8500,
  "selectedCharacter": {
    "_id": "character_001",
    "name": "ルナ"
  }
}
```

---

#### POST /api/user/select-character
- **用途**: キャラクター選択・アクセス権限チェック
- **認証**: 必須（JWT認証）
- **リクエスト例**:
```json
{
  "characterId": "character_001"
}
```
- **レスポンス例**:
```json
{
  "success": true,
  "message": "Character selected successfully",
  "hasAccess": true
}
```

---

### 📊 **ダッシュボード・統計API**

#### GET /api/user/dashboard
- **用途**: ユーザーダッシュボード統合データ取得
- **認証**: 必須（Mock認証/JWT認証）
- **リクエスト例**:
```json
GET /api/user/dashboard
```
- **レスポンス例**:
```json
{
  "user": {
    "_id": "user_001",
    "name": "テストユーザー",
    "email": "test@example.com",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2025-01-09T15:30:00Z"
  },
  "tokens": {
    "balance": 8500,
    "totalPurchased": 15000,
    "totalUsed": 6500,
    "recentUsage": [
      { "date": "2025-01-09", "amount": 450 },
      { "date": "2025-01-08", "amount": 320 }
    ]
  },
  "affinities": [
    {
      "character": {
        "_id": "character_001",
        "name": { "ja": "ルナ", "en": "Luna" },
        "themeColor": "#E91E63"
      },
      "level": 23,
      "experience": 1250,
      "experienceToNext": 150
    }
  ],
  "recentChats": [],
  "purchaseHistory": [],
  "notifications": [],
  "badges": [],
  "analytics": {}
}
```

---

#### GET /api/analytics/tokens
- **用途**: トークン使用統計取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/analytics/tokens?range=month
```
- **レスポンス例**:
```json
{
  "dailyUsage": [
    { "date": "2025-01-09", "amount": 450, "count": 15 }
  ],
  "weeklyTrend": [
    { "week": "1/9", "amount": 2500, "efficiency": 65 }
  ],
  "characterUsage": [
    { "characterName": "ルナ", "amount": 4850, "percentage": 45, "color": "#E91E63" }
  ],
  "efficiency": {
    "tokensPerMessage": 23.4,
    "averageSessionLength": 18.7,
    "peakHour": "21:00"
  }
}
```

---

#### GET /api/analytics/chats
- **用途**: チャット統計取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/analytics/chats?range=month
```
- **レスポンス例**:
```json
{
  "conversationStats": {
    "totalConversations": 124,
    "averageLength": 17.3,
    "longestStreak": 12,
    "currentStreak": 5
  },
  "dailyActivity": [
    { "date": "2025-01-09", "conversations": 6, "messages": 35, "duration": 45 }
  ],
  "characterInteraction": [
    { "characterName": "ルナ", "conversations": 45, "averageLength": 18.5, "emotionalState": "happy" }
  ]
}
```

---

#### GET /api/analytics/affinity
- **用途**: 親密度統計取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/analytics/affinity?range=quarter&character=all
```
- **レスポンス例**:
```json
{
  "overallStats": {
    "totalCharacters": 4,
    "averageLevel": 38,
    "highestLevel": 67,
    "totalGiftsGiven": 3
  },
  "characterProgress": [
    {
      "characterName": "ルナ",
      "level": 67,
      "trustLevel": 85,
      "intimacyLevel": 78,
      "relationshipType": "close_friend",
      "emotionalState": "loving"
    }
  ],
  "memoryTimeline": [],
  "giftHistory": [],
  "relationshipMilestones": []
}
```

---

#### GET /api/user/purchase-history
- **用途**: 購入履歴取得
- **認証**: 必須（Mock認証）
- **リクエスト例**:
```json
GET /api/user/purchase-history
```
- **レスポンス例**:
```json
{
  "purchases": [
    {
      "_id": "purchase_001",
      "type": "token",
      "amount": 5000,
      "price": 1000,
      "currency": "JPY",
      "status": "completed",
      "paymentMethod": "Credit Card",
      "date": "2025-01-05T10:15:00Z",
      "details": "トークンパック: 5,000トークン",
      "transactionId": "txn_1234567890",
      "invoiceUrl": "/invoices/001"
    }
  ],
  "totalSpent": 4800,
  "totalPurchases": 6,
  "summary": {
    "tokens": { "count": 4, "amount": 3800 },
    "characters": { "count": 2, "amount": 1000 },
    "subscriptions": { "count": 0, "amount": 0 }
  }
}
```

---

### 💬 **チャット関連API**

#### GET /api/chats/:characterId
- **用途**: チャット履歴・キャラクター状態取得
- **認証**: 必須（JWT認証）
- **リクエスト例**:
```json
GET /api/chats/character_001?locale=ja
```
- **レスポンス例**:
```json
{
  "chat": {
    "_id": "chat_001",
    "characterId": "character_001",
    "messages": [],
    "affinity": {
      "level": 23,
      "experience": 1250,
      "maxExperience": 1400
    }
  },
  "character": {
    "_id": "character_001",
    "name": { "ja": "ルナ" },
    "personality": "friendly"
  }
}
```

---

#### POST /api/chats/:characterId/messages
- **用途**: メッセージ送信（AI応答生成）
- **認証**: 必須（JWT認証）
- **リクエスト例**:
```json
{
  "message": "こんにちは",
  "sessionId": "session_001"
}
```
- **レスポンス例**:
```json
{
  "userMessage": {
    "_id": "msg_001",
    "content": "こんにちは",
    "sender": "user",
    "timestamp": "2025-01-09T15:30:00Z"
  },
  "aiResponse": {
    "_id": "msg_002", 
    "content": "こんにちは！元気ですか？",
    "sender": "ai",
    "timestamp": "2025-01-09T15:30:01Z"
  },
  "affinity": {
    "level": 23,
    "experience": 1255,
    "experienceGained": 5
  }
}
```

---

### 🛡️ **管理者制裁システムAPI**

#### GET /admin/sanctions/users
- **用途**: 制裁対象ユーザー一覧取得
- **認証**: 必須（JWT認証 + 管理者権限）
- **リクエスト例**:
```json
GET /admin/sanctions/users?page=1&limit=20&status=active
```
- **レスポンス例**:
```json
{
  "users": [
    {
      "_id": "user_001",
      "email": "user@example.com",
      "sanctionStatus": "warned",
      "violationCount": 2,
      "lastViolation": "2025-01-09T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### GET /admin/sanctions/users/:userId/violations
- **用途**: 特定ユーザーの違反履歴取得
- **認証**: 必須（JWT認証 + 管理者権限）
- **リクエスト例**:
```json
GET /admin/sanctions/users/user_001/violations?page=1&limit=10
```
- **レスポンス例**:
```json
{
  "violations": [
    {
      "_id": "violation_001",
      "type": "prohibited_word",
      "content": "違反メッセージ内容",
      "detectedAt": "2025-01-09T12:00:00Z",
      "characterId": "character_001",
      "severity": "medium"
    }
  ],
  "user": {
    "sanctionStatus": "warned",
    "totalViolations": 2
  }
}
```

---

#### POST /admin/sanctions/users/:userId/lift
- **用途**: 制裁解除
- **認証**: 必須（JWT認証 + 管理者権限）
- **リクエスト例**:
```json
{
  "reason": "誤検知のため解除"
}
```
- **レスポンス例**:
```json
{
  "success": true,
  "message": "制裁が解除されました",
  "user": {
    "sanctionStatus": "none",
    "sanctionLiftedAt": "2025-01-09T15:30:00Z"
  }
}
```

---

#### POST /admin/sanctions/users/:userId/reset-violations
- **用途**: 違反記録リセット
- **認証**: 必須（JWT認証 + 管理者権限）
- **リクエスト例**:
```json
POST /admin/sanctions/users/user_001/reset-violations
```
- **レスポンス例**:
```json
{
  "success": true,
  "message": "違反記録がリセットされました",
  "violationsRemoved": 3
}
```

---

#### GET /admin/sanctions/stats
- **用途**: 制裁統計情報取得
- **認証**: 必須（JWT認証 + 管理者権限）
- **リクエスト例**:
```json
GET /admin/sanctions/stats?timeframe=month
```
- **レスポンス例**:
```json
{
  "overview": {
    "totalUsers": 1250,
    "activeViolations": 15,
    "sanctionedUsers": 8,
    "resolvedCases": 127
  },
  "violationsByType": {
    "prohibited_word": 45,
    "inappropriate_content": 12,
    "spam": 8
  },
  "sanctionLevels": {
    "warned": 10,
    "temporarily_suspended": 3,
    "permanently_banned": 2
  }
}
```

---

#### GET /admin/sanctions/levels
- **用途**: 制裁レベル情報取得
- **認証**: 必須（JWT認証 + 管理者権限）
- **リクエスト例**:
```json
GET /admin/sanctions/levels
```
- **レスポンス例**:
```json
{
  "levels": [
    {
      "level": 1,
      "name": "警告",
      "description": "初回違反時の警告",
      "violationThreshold": 1,
      "duration": null,
      "restrictions": ["warning_message"]
    },
    {
      "level": 2,
      "name": "一時停止",
      "description": "7日間のアクセス制限",
      "violationThreshold": 3,
      "duration": "7 days",
      "restrictions": ["chat_disabled", "character_access_limited"]
    }
  ]
}
```

---

### 🔧 **システム・デバッグAPI**

#### GET /api/ping
- **用途**: サーバー生存確認
- **認証**: なし
- **リクエスト例**:
```json
GET /api/ping
```
- **レスポンス例**:
```json
"pong"
```

---

#### GET /api/debug
- **用途**: 環境変数デバッグ情報
- **認証**: なし
- **リクエスト例**:
```json
GET /api/debug
```
- **レスポンス例**:
```json
{
  "USE_MOCK": true,
  "PORT": 3002,
  "NODE_ENV": "development",
  "MOCK_USER": {
    "_id": "mock-user-id",
    "name": "テストユーザー",
    "email": "test@example.com"
  }
}
```

---

## 🌐 **フロントエンドAPI (Next.js)**

### 📱 **プロキシAPI**

#### GET /api/characters
- **用途**: キャラクター一覧データをバックエンドAPIからプロキシ取得
- **認証**: なし
- **リクエスト例**:
```json
GET /api/characters?locale=ja&sort=popular
```
- **レスポンス例**:
```json
// バックエンドAPI (localhost:3002/api/characters) からのレスポンスをそのまま転送
```

---

#### GET /[locale]/api/characters
- **用途**: 多言語対応版のキャラクター一覧データをバックエンドAPIからプロキシ取得
- **認証**: なし
- **リクエスト例**:
```json
GET /ja/api/characters?sort=newest
```
- **レスポンス例**:
```json
// バックエンドAPI (localhost:3002/api/characters) からのレスポンスをそのまま転送
// より詳細なログ出力付き
```

---

## 📊 **API統計情報**

| カテゴリ | エンドポイント数 | 認証必須 | 管理者権限必須 |
|---------|-----------------|---------|---------------|
| **キャラクター関連** | 4 | 4 | 0 |
| **ユーザー関連** | 3 | 3 | 0 |
| **ダッシュボード・統計** | 5 | 5 | 0 |
| **チャット関連** | 2 | 2 | 0 |
| **管理者制裁システム** | 6 | 6 | 6 |
| **システム・デバッグ** | 2 | 0 | 0 |
| **フロントエンドプロキシ** | 2 | 0 | 0 |
| **総合計** | **24** | **20** | **6** |

---

## 🔐 **認証システム構成**

### 1. **Mock認証** (`backend/src/index.ts`)
- 開発用の簡易認証システム
- ヘッダー: `x-auth-token: mock-token`
- 固定ユーザー情報を返却

### 2. **JWT認証** (`backend/routes/**/*.js`)
- 本格的なJWTトークン認証
- ヘッダー: `Authorization: Bearer <token>`
- トークン検証とユーザー情報取得

### 3. **管理者権限チェック** (`backend/routes/admin/sanctions.js`)
- JWT認証 + 管理者ロール確認
- 2段階認証システム

---

## 🚨 **セキュリティ機能**

### **禁止用語フィルタリング**
- 日本語・英語対応の禁止用語検出
- リアルタイムメッセージ監視
- OpenAI Moderation API連携

### **段階的制裁システム**
1. **警告** - 初回違反時
2. **一時停止** - 複数回違反時（7日間）
3. **永久停止** - 重大・反復違反時

### **違反履歴追跡**
- 全ての違反行為を記録
- 制裁レベル自動判定
- 管理者による手動解除・リセット機能

---

*このドキュメントは定期的に更新されます。新しいAPIエンドポイントが追加された際は、このリストを更新してください。*