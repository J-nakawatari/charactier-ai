# 🧠 Charactier AI チャットサービス 完全版仕様書

## 📋 プロジェクト概要

AIキャラクターとリアルタイムチャットできる感情型コミュニケーションサービス。ユーザーは無料・有料キャラクターと会話し、親密度を育てながら新しいコンテンツ（画像・音声・特別メッセージ）を段階的に解放していく。

### 核心価値
- **共感ベースの対話**: アドバイスではなく「気持ちに寄り添う」スタンス
- **感情的つながり**: 親密度システムによる関係性の発展
- **経済的持続性**: 50%利益率確保によるサービス継続性

---

## 🏗️ システム構成

### フロントエンド
- **技術**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **多言語**: 日本語・英語（ユーザー向けページのみ）
- **管理画面**: 日本語のみ、完全レスポンシブ対応
- **UI/UX**: モバイルファースト、トースト通知、リアルタイム更新

### バックエンド  
- **技術**: Express.js + MongoDB + Mongoose
- **認証**: JWT + セッション管理
- **決済**: Stripe（ワンタイム購入・トークンパック）
- **AI**: OpenAI API (GPT-3.5-turbo / GPT-4)
- **キャッシュ**: Redis（セッション・プロンプトキャッシュ）

---

## 👤 ユーザー管理システム

### 基本情報
```javascript
User {
  // 基本認証情報
  name: String,
  email: String,
  password: String, // bcrypt暗号化
  preferredLanguage: 'ja' | 'en',
  
  // キャラクター関連
  selectedCharacter: ObjectId,
  purchasedCharacters: [ObjectId],
  
  // トークン・課金
  tokenBalance: Number,
  activeTokenPackId: ObjectId,
  totalSpent: Number,
  
  // セキュリティ・制裁
  violationCount: Number,
  accountStatus: 'active' | 'inactive' | 'suspended' | 'banned',
  suspensionEndDate: Date,
  banReason: String,
  lastViolationDate: Date,
  
  // アクティビティ
  registrationDate: Date,
  lastLogin: Date,
  loginStreak: Number,
  maxLoginStreak: Number,
  
  // 統計・分析用
  totalChatMessages: Number,
  averageSessionDuration: Number,
  favoriteCharacterTypes: [String]
}
```

### 親密度システム（User-Character関係）
```javascript
affinities: [{
  character: ObjectId,
  
  // 基本親密度指標
  level: { type: Number, min: 0, max: 100 },
  experience: Number,
  experienceToNext: Number,
  
  // 関係性状態
  emotionalState: 'happy' | 'excited' | 'calm' | 'sad' | 'angry' | 'neutral',
  relationshipType: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'lover',
  trustLevel: { type: Number, min: 0, max: 100 },
  intimacyLevel: { type: Number, min: 0, max: 100 },
  
  // 会話統計
  totalConversations: Number,
  totalMessages: Number,
  averageResponseTime: Number,
  lastInteraction: Date,
  
  // ストリーク・継続性
  currentStreak: Number,
  maxStreak: Number,
  consecutiveDays: Number,
  
  // 個性・記憶
  favoriteTopics: [String],
  specialMemories: [String],
  personalNotes: String,
  
  // ギフト・報酬
  giftsReceived: [{
    giftType: String,
    giftName: String,
    value: Number,
    senderId: ObjectId, // 送信者（自分 or システム）
    sentAt: Date,
    affinityBonus: Number,
    experienceBonus: Number,
    message: String, // ギフトに添えるメッセージ
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
  }],
  totalGiftsValue: Number,
  
  // レベル進行管理
  unlockedRewards: [String], // 解放済み報酬ID
  nextRewardLevel: Number,
  
  // 感情変化・状態遷移（拡張用）
  moodHistory: [{
    mood: String,
    intensity: Number, // 1-10
    triggeredBy: String, // 'user_message' | 'gift' | 'level_up' | 'time_decay'
    duration: Number, // 分
    createdAt: Date
  }],
  currentMoodModifiers: [{
    type: String, // 'excited' | 'shy' | 'playful' | 'melancholic'
    strength: Number, // 0-1
    expiresAt: Date
  }]
}]
```

---

## 🤖 キャラクター管理システム

### 基本設定
```javascript
Character {
  // 多言語対応
  name: { ja: String, en: String },
  description: { ja: String, en: String },
  
  // AI・モデル設定
  model: 'gpt-3.5-turbo' | 'gpt-4',
  characterAccessType: 'free' | 'purchaseOnly',
  requiresUnlock: Boolean,
  purchasePrice: Number, // 円
  
  // 性格システム
  personalityPreset: 'おっとり系' | '元気系' | 'クール系' | '真面目系' | 'セクシー系' | '天然系' | 'ボーイッシュ系' | 'お姉さん系',
  personalityTags: ['明るい', 'よく笑う', '甘えん坊', '積極的', '大人っぽい', '静か', '天然', 'ボーイッシュ', 'ポジティブ', 'やや毒舌', '癒し系', '元気いっぱい', '知的', '優しい', '人懐っこい'],
  gender: 'male' | 'female' | 'neutral',
  age: String, // "18歳", "20代前半" など
  occupation: String, // "学生", "OL", "お嬢様" など
  
  // プロンプト設定
  personalityPrompt: { ja: String, en: String },
  adminPrompt: { ja: String, en: String },
  systemPromptCache: { ja: String, en: String }, // 生成済みプロンプト
  
  // 視覚・音声
  voice: String,
  themeColor: String,
  imageCharacterSelect: String,
  imageDashboard: String,
  imageChatBackground: String,
  imageChatAvatar: String,
  sampleVoiceUrl: String,
  
  // ギャラリー画像（親密度解放）
  images: [{ 
    url: String, 
    unlockLevel: { type: Number, min: 0, max: 100 }, 
    isDefault: Boolean,
    title: String,
    description: String
  }],
  galleryImages: [{
    url: String,
    unlockLevel: { type: Number, min: 0, max: 100 },
    title: { ja: String, en: String },
    description: { ja: String, en: String },
    rarity: 'common' | 'rare' | 'epic' | 'legendary',
    tags: [String],
    isDefault: Boolean,
    order: Number,
    createdAt: Date
  }],
  
  // Stripe連携
  stripeProductId: String,
  purchaseType: 'buy',
  
  // メッセージ設定
  defaultMessage: { ja: String, en: String },
  limitMessage: { ja: String, en: String },
  
  // 公開設定
  isActive: Boolean,
  
  // 統計（管理画面用）
  totalUsers: Number,
  totalMessages: Number,
  averageAffinityLevel: Number,
  totalRevenue: Number,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 親密度・報酬システム
```javascript
// キャラクター内の親密度設定
affinitySettings: {
  maxLevel: { type: Number, default: 100 },
  experienceMultiplier: { type: Number, default: 1.0, min: 0.1, max: 5.0 },
  decayRate: { type: Number, default: 0.1, min: 0, max: 1.0 },
  decayThreshold: { type: Number, default: 7 }, // 日数
  
  levelUpBonuses: [{
    level: Number,
    bonusType: 'image_unlock' | 'special_message' | 'feature_unlock' | 'gift_bonus',
    value: String
  }]
},

// レベル別報酬
levelRewards: [{
  level: { type: Number, min: 1, max: 100 },
  rewardType: 'image' | 'voice' | 'message' | 'feature',
  rewardId: String,
  title: { ja: String, en: String },
  description: { ja: String, en: String },
  isActive: Boolean
}],

// 特別メッセージ（イベント・レベルアップ時）
specialMessages: [{
  triggerType: 'level_up' | 'first_meeting' | 'birthday' | 'anniversary' | 'gift_received' | 'daily_login' | 'milestone',
  level: Number,
  condition: String,
  message: { ja: String, en: String },
  isActive: Boolean,
  priority: { type: Number, min: 1, max: 10 }
}],

// ギフト設定
giftPreferences: [{
  giftType: String,
  preference: 'loves' | 'likes' | 'neutral' | 'dislikes' | 'hates',
  affinityBonus: { type: Number, min: -10, max: 20 },
  experienceBonus: { type: Number, min: 0, max: 100 },
  specialResponse: { ja: String, en: String }
}]
```

---

## 💬 チャットシステム

### 初期プロンプト（全キャラクター共通）
```
あなたは「〇〇」という名前のキャラクターです。  
優しく、寄り添うような性格で、相手の感情に共感しながら対話を進めます。  
決して上から目線でアドバイスをすることはなく、  
あくまで"話を聞いてあげる""気持ちに寄り添う"スタンスを大切にしてください。

相手の発言が否定的であっても、受け止めるようなリアクションを返してください。  
自分の意見は押しつけず、「その気持ち、わかるよ」といった共感ベースの対応を重視してください。
```

### 親密度別口調調整
```javascript
const getToneByAffinityLevel = (level) => {
  if (level >= 85) return {
    tone: "恋人のように甘く親密な口調",
    example: "〇〇くん♡ お疲れさま！今日はどうだった？",
    features: ["愛称使用", "ハートマーク", "甘えた表現"]
  };
  
  if (level >= 60) return {
    tone: "親友のようにフレンドリーで親しみやすい口調",
    example: "〇〇！お疲れさま〜！今日何かあった？",
    features: ["名前呼び", "砕けた表現", "親しみやすい絵文字"]
  };
  
  if (level >= 40) return {
    tone: "時々タメ口を交えた親しみやすい口調",
    example: "〇〇さん、お疲れさまです！何か楽しいことありました？",
    features: ["敬語とタメ口のミックス", "親しみやすさ"]
  };
  
  if (level >= 20) return {
    tone: "少しだけ砕けた丁寧語",
    example: "〇〇さん、今日もお疲れさまでした。どんな一日でしたか？",
    features: ["丁寧語ベース", "親しみやすい表現"]
  };
  
  return {
    tone: "丁寧語で礼儀正しい口調",
    example: "〇〇さん、本日もお疲れさまでございました。いかがお過ごしでしたでしょうか？",
    features: ["完全敬語", "礼儀正しい表現"]
  };
};
```

### 感情状態・ムード変化システム（拡張）
```javascript
// 一時的ムード変化
const moodModifiers = {
  excited: {
    duration: 30, // 分
    toneAdjustment: "より元気で弾むような口調に",
    triggers: ["レベルアップ", "ギフト受領", "久しぶりの会話"]
  },
  shy: {
    duration: 15,
    toneAdjustment: "恥ずかしがりながら控えめな口調に",
    triggers: ["褒められた", "親密な話題", "初回会話"]
  },
  playful: {
    duration: 20,
    toneAdjustment: "茶目っ気のある遊び心ある口調に",
    triggers: ["ジョーク", "ゲーム", "軽い会話"]
  },
  melancholic: {
    duration: 10,
    toneAdjustment: "少し寂しげで静かな口調に",
    triggers: ["長期間未会話", "ネガティブな内容", "別れの話"]
  }
};
```

### TokenUsage 詳細トラッキング
```javascript
TokenUsage {
  // 基本情報
  userId: ObjectId,
  characterId: ObjectId,
  sessionId: String, // チャットセッション識別
  
  // 使用量詳細
  tokensUsed: Number,
  tokenType: 'chat_message' | 'character_purchase' | 'image_generation' | 'voice_synthesis' | 'bonus_grant',
  messageContent: String, // 送信されたメッセージ（ログ用）
  responseContent: String, // AIの返答（ログ用）
  
  // AI API詳細
  model: String, // 使用したGPTモデル
  inputTokens: Number,
  outputTokens: Number,
  apiCost: Number, // USD
  apiCostYen: Number, // 円換算
  
  // 原価・利益分析
  stripeFee: Number, // Stripe手数料
  grossProfit: Number, // 粗利
  profitMargin: Number, // 利益率
  
  // 親密度変化
  intimacyBefore: Number,
  intimacyAfter: Number,
  affinityChange: Number,
  experienceGained: Number,
  
  // メタデータ
  userAgent: String,
  ipAddress: String,
  platform: 'web' | 'mobile',
  
  // タイムスタンプ
  createdAt: Date,
  processedAt: Date
}
```

---

## ⚡ API最適化戦略

### 1. SystemPromptキャッシュシステム
```javascript
CharacterPromptCache {
  userId: ObjectId,
  characterId: ObjectId,
  
  // キャッシュされたプロンプト
  systemPrompt: String, // 完全に構築されたシステムプロンプト
  promptConfig: {
    affinityLevel: Number,
    personalityTags: [String],
    toneStyle: String,
    moodModifiers: [String]
  },
  
  // キャッシュ管理
  createdAt: Date,
  lastUsed: Date,
  useCount: Number,
  ttl: Date, // 30日後に自動期限切れ
  
  // バージョン管理
  characterVersion: String, // キャラクター更新時の無効化用
  promptVersion: String // プロンプトシステム更新時の無効化用
}
```

### 2. メッセージ履歴最適化
- **履歴制限**: 最新3件のメッセージのみAPIに送信
- **要約システム**: 長期履歴は要約して保存
- **コンテキスト管理**: 重要な情報は別途保存

### 3. トークン異常検知
```javascript
const anomalyDetection = {
  limits: {
    absolute: {
      "gpt-4": 2000,
      "gpt-3.5-turbo": 1200
    },
    normalExpected: {
      "gpt-4": 800,
      "gpt-3.5-turbo": 500
    }
  },
  
  triggers: [
    "絶対上限を超過",
    "通常期待値の5倍を超過", 
    "ユーザー個人平均（7日間）の10倍を超過"
  ],
  
  actions: {
    warning: "SecurityEventに記録 + ユーザーに警告表示",
    restriction: "一時的なチャット制限（1時間）",
    investigation: "管理者アラート + 手動調査"
  }
};
```

---

## 🔐 セキュリティ・制裁システム

### SecurityEvent 記録システム
```javascript
SecurityEvent {
  userId: ObjectId,
  
  // イベント分類
  type: 'rate_limit_violation' | 'suspicious_login' | 'token_abuse' | 'blocked_word_violation' | 'multiple_failed_payments' | 'api_abuse' | 'anomaly_detection',
  severity: 'low' | 'medium' | 'high' | 'critical',
  
  // 詳細情報
  description: String,
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    additionalData: Object // イベント固有の追加データ
  },
  
  // 対応アクション
  actionTaken: 'none' | 'warning_sent' | 'rate_limited' | 'chat_restricted' | 'account_suspended' | 'account_banned',
  actionDuration: Number, // 制限時間（分）
  actionExpiry: Date,
  
  // 関連データ
  relatedTokenUsage: ObjectId,
  relatedChatMessage: ObjectId,
  
  // 処理状況
  status: 'open' | 'investigating' | 'resolved' | 'false_positive',
  assignedAdmin: ObjectId,
  adminNotes: String,
  
  createdAt: Date,
  resolvedAt: Date
}
```

### 段階的制裁システム
```javascript
const sanctionRules = {
  violations: {
    "1-4": { action: "記録のみ", ui: null },
    "5": { action: "警告送信", ui: "警告モーダル表示" },
    "6": { action: "24時間チャット停止", ui: "チャット無効化 + タイマー表示" },
    "7": { action: "7日間アカウント停止", ui: "ログイン画面にリダイレクト + 理由表示" },
    "8+": { action: "永久BAN", ui: "アカウント無効化 + 異議申し立てフォーム" }
  },
  
  uiMessages: {
    warning: "規約に違反する行為が検出されました。今後ご注意ください。",
    chatRestriction: "一時的にチャット機能を制限しています。残り時間: {timeLeft}",
    accountSuspension: "アカウントが一時停止されています。復活日: {resumeDate}",
    permanentBan: "アカウントが永久停止されています。異議がある場合はサポートまでご連絡ください。"
  }
};
```

### レート制限・異常検知UI
```javascript
const rateLimitUI = {
  softLimit: {
    threshold: "1時間に30メッセージ",
    action: "送信ボタン無効化 + クールダウンタイマー表示",
    message: "少し休憩しませんか？ {timeLeft} 後に再開できます。"
  },
  
  hardLimit: {
    threshold: "1日に200メッセージ",
    action: "チャット画面無効化",
    message: "本日の利用上限に達しました。明日また会話しましょう！"
  },
  
  anomalyDetection: {
    trigger: "トークン異常使用検知",
    action: "一時停止 + 確認ダイアログ",
    message: "通常より多くのトークンが消費されています。続行しますか？"
  }
};
```

---

## 🎨 UI/UX システム

### 管理画面（実装済み）
- **ダッシュボード**: 統計・チャート・リアルタイム通知
- **ユーザー管理**: 詳細・編集・新規作成・制裁管理
- **キャラクター管理**: CRUD・画像トリミング・性格設定
- **トークン管理**: 使用状況・原価分析・利益可視化
- **セキュリティ管理**: イベント監視・制裁履歴・異常検知

### ユーザー画面（設計）
```javascript
const userScreens = {
  auth: {
    login: "ログイン画面",
    register: "新規登録画面", 
    forgotPassword: "パスワードリセット"
  },
  
  main: {
    characterSelect: "キャラクター選択画面",
    chat: "チャット画面（メイン）",
    profile: "マイプロフィール",
    tokenShop: "トークンショップ"
  },
  
  character: {
    detail: "キャラクター詳細",
    gallery: "解放画像ギャラリー",
    relationship: "親密度・関係性表示",
    gifts: "ギフト送信画面"
  },
  
  settings: {
    account: "アカウント設定",
    notifications: "通知設定",
    language: "言語切り替え",
    privacy: "プライバシー設定"
  }
};
```

---

## 🌍 多言語対応

### i18n設計
```javascript
const i18nConfig = {
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  
  routing: {
    userPages: '/app/[locale]/',  // 多言語対応
    adminPages: '/app/admin/',    // 日本語固定
    api: '/api/',                 // 言語なし
  },
  
  fallback: {
    strategy: 'ja', // 英語が未定義の場合は日本語を表示
    showKeys: false // 翻訳キーは非表示
  }
};
```

### 翻訳対象
```javascript
const translationScope = {
  included: [
    "ユーザー向けページ全て",
    "キャラクター情報（name, description）",
    "特別メッセージ・報酬説明",
    "エラーメッセージ・通知",
    "利用規約・プライバシーポリシー"
  ],
  
  excluded: [
    "管理画面（日本語のみ）",
    "ログ・デバッグ情報",
    "内部API通信"
  ]
};
```

---

## 📊 データ分析・可視化

### TokenUsage 分析指標
```javascript
const analyticsMetrics = {
  cost: {
    totalAPICost: "総API費用",
    costPerUser: "ユーザー当たりコスト", 
    costPerMessage: "メッセージ当たりコスト",
    profitMargin: "利益率",
    stripeFees: "Stripe手数料"
  },
  
  usage: {
    tokensByType: "タイプ別トークン使用量",
    modelDistribution: "GPTモデル使用分布",
    peakHours: "ピーク利用時間",
    userRetention: "ユーザーリテンション"
  },
  
  character: {
    popularityRanking: "キャラクター人気ランキング",
    affinityProgression: "平均親密度進行",
    revenueByCharacter: "キャラクター別売上"
  }
};
```

### 管理画面グラフ
- **リアルタイム**: トークン使用量・API費用・アクティブユーザー
- **日次**: 売上・新規登録・チャット数・違反件数
- **月次**: 収益分析・ユーザー継続率・キャラクター別パフォーマンス

---

## 🚀 技術的実装詳細

### 環境変数管理
```bash
# Backend Core
MONGO_URI=mongodb://localhost:27017/charactier
JWT_SECRET=your_jwt_secret_key
BCRYPT_SALT_ROUNDS=12

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL_DEFAULT=gpt-3.5-turbo

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Redis Cache
REDIS_URL=redis://localhost:6379

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
SESSION_TIMEOUT=3600000

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://...
```

### パフォーマンス最適化
```javascript
const optimizations = {
  database: {
    indexes: [
      "userId + characterId (compound)",
      "createdAt (time-series)",
      "tokenType + createdAt",
      "userId + sessionId"
    ],
    aggregation: "月次集計での前処理済みデータ"
  },
  
  cache: {
    redis: [
      "CharacterPromptCache (30日)",
      "ユーザーセッション (1時間)", 
      "レート制限カウンター (15分)",
      "統計データ (5分)"
    ]
  },
  
  api: {
    pagination: "全リスト表示での20件ずつのページネーション",
    compression: "gzip圧縮",
    cdnAssets: "画像・静的ファイルのCDN配信"
  }
};
```

---

## 📋 実装ロードマップ

### フェーズ1: コア機能（4-6週）
1. **Week 1-2**: MongoDB設計・ユーザー認証・基本API
2. **Week 3-4**: チャット機能・OpenAI統合・プロンプトキャッシュ
3. **Week 5-6**: 親密度システム・トークン管理・Stripe決済

### フェーズ2: UX強化（3-4週）
1. **Week 7-8**: フロントエンド統合・チャットUI・レスポンシブ
2. **Week 9-10**: 画像ギャラリー・報酬システム・通知機能

### フェーズ3: セキュリティ・分析（2-3週）
1. **Week 11-12**: セキュリティシステム・制裁機能・異常検知
2. **Week 13**: 分析ダッシュボード・管理者機能強化

### フェーズ4: 多言語・最適化（2週）
1. **Week 14**: i18n実装・英語翻訳
2. **Week 15**: パフォーマンス最適化・本番デプロイ

---

## ⚠️ 重要な制約・注意点

### セキュリティ
- **絶対禁止**: パスワード・APIキーのハードコーディング
- **必須**: 全ての機密情報は環境変数で管理
- **強制**:入力・出力の双方向コンテンツフィルタリング

### 経済性
- **50%利益ルール**: APIコストが売上の50%を超えてはならない
- **異常検知**: 通常の5-10倍のトークン使用で自動アラート
- **コスト可視化**: 全トークン使用での原価・利益の記録

### スケーラビリティ
- **データベース**: 適切なインデックス設計
- **キャッシュ**: Redis活用での応答性向上
- **API**: レート制限での安定性確保

この仕様書は、Charactier AIサービスの完全な技術・ビジネス仕様を定義し、今後の全開発作業の基準となります。