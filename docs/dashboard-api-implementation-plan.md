# 📋 ダッシュボードAPI実装計画書
## GET /api/user/dashboard 統合API設計

### 🎯 目的
ユーザーダッシュボード（マイページ）で必要な全データを1回のAPIコールで取得する統合エンドポイントを実装する。

### 📊 API仕様

#### エンドポイント
```
GET /api/user/dashboard
Authorization: Bearer <JWT_TOKEN>
```

#### レスポンス構造
```typescript
interface DashboardResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    createdAt: Date;
    lastLoginAt: Date;
  };
  tokens: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    recentUsage: Array<{ date: string; amount: number }>;
  };
  affinities: Array<{
    character: {
      _id: string;
      name: LocalizedString;
      imageCharacterSelect: string;
      themeColor: string;
    };
    level: number;
    experience: number;
    experienceToNext: number;
    maxExperience: number;
    unlockedImages: string[];
    nextUnlockLevel: number;
  }>;
  recentChats: Array<{
    _id: string;
    character: {
      _id: string;
      name: LocalizedString;
      imageCharacterSelect: string;
    };
    lastMessage: string;
    lastMessageAt: Date;
    messageCount: number;
  }>;
  purchaseHistory: Array<{
    type: 'token' | 'character';
    amount: number;
    date: Date;
    details: string;
  }>;
  loginHistory: Array<{
    date: Date;
    platform: 'web' | 'mobile';
    ipAddress: string;
  }>;
  notifications: Array<{
    _id: string;
    title: LocalizedString;
    message: LocalizedString;
    type: 'info' | 'warning' | 'success';
    isRead: boolean;
    createdAt: Date;
  }>;
  badges: Array<{
    _id: string;
    name: LocalizedString;
    description: LocalizedString;
    iconUrl: string;
    isUnlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    maxProgress?: number;
  }>;
  analytics: {
    chatCountPerDay: Array<{ date: string; count: number }>;
    tokenUsagePerDay: Array<{ date: string; amount: number }>;
    affinityProgress: Array<{ 
      characterName: string; 
      level: number; 
      color: string;
    }>;
  };
}
```

## 🛠 実装タスク

### フェーズ1: モデル拡張・確認（1日）

#### Task 1.1: Character Modelの拡張
- **作業内容**: `Character`モデルに`themeColor`フィールド追加
- **ファイル**: `/backend/models/Character.ts`
- **追加フィールド**:
  ```typescript
  themeColor: {
    type: String,
    default: '#6366f1', // デフォルトカラー
    match: /^#[0-9A-Fa-f]{6}$/ // HEXカラーバリデーション
  }
  ```

#### Task 1.2: 既存モデルの構造確認
- **User Model**: `affinities`, `loginHistory`, `purchaseHistory`の構造確認
- **Chat Model**: ダッシュボード用集計クエリの設計
- **TokenUsage Model**: 統計データ取得クエリの設計
- **UserTokenPack Model**: 残高計算ロジックの確認

#### Task 1.3: 不足モデルの作成
- **Notification Model**: お知らせ管理用（存在確認済み）
- **Badge Model**: バッジシステム用（新規作成）

```javascript
// Badge Model 設計案
const BadgeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  badgeType: { 
    type: String, 
    enum: ['first_login', 'chat_master', 'affinity_master', 'collector'],
    required: true 
  },
  name: {
    ja: String,
    en: String
  },
  description: {
    ja: String,
    en: String
  },
  iconUrl: String,
  isUnlocked: { type: Boolean, default: false },
  unlockedAt: Date,
  progress: { type: Number, default: 0 },
  maxProgress: Number,
  createdAt: { type: Date, default: Date.now }
});
```

### フェーズ2: APIルート実装（2日）

#### Task 2.1: ベースルート作成
- **ファイル**: `/backend/routes/user/dashboard.js`
- **認証**: `auth`ミドルウェアの適用
- **基本構造**: Express Router設定

#### Task 2.2: データ取得ロジック実装

##### 2.2.1 ユーザー基本情報＋ログイン履歴
```javascript
// ログイン履歴は最新10件に制限
const user = await User.findById(userId)
  .select('_id name email createdAt lastLoginAt loginHistory')
  .lean();
const loginHistory = user.loginHistory.slice(-10).reverse();
```

##### 2.2.2 トークン残高・統計
```javascript
// UserTokenPackから残高計算
const tokenPacks = await UserTokenPack.find({ userId }).lean();
const balance = tokenPacks.reduce((acc, pack) => acc + pack.tokensRemaining, 0);
const totalPurchased = tokenPacks.reduce((acc, pack) => acc + pack.tokensPurchased, 0);

// TokenUsageから直近30日の使用履歴
const tokenUsage = await TokenUsage.find({ userId })
  .sort({ createdAt: -1 })
  .limit(30)
  .lean();
```

##### 2.2.3 親密度情報（themeColor含む）
```javascript
// User.affinitiesからキャラクター情報を展開
const affinities = await Promise.all(
  user.affinities.map(async affinity => {
    const character = await Character.findById(affinity.character)
      .select('_id name imageCharacterSelect themeColor')
      .lean();
    return {
      character: {
        ...character,
        themeColor: character.themeColor || '#6366f1'
      },
      level: affinity.level,
      experience: affinity.experience,
      // ... 他のaffinity情報
    };
  })
);
```

##### 2.2.4 最近のチャット（3件制限）
```javascript
// キャラクターごとに最新1件、最大3件
const recentChats = await Chat.aggregate([
  { $match: { userId: mongoose.Types.ObjectId(userId) } },
  { $sort: { updatedAt: -1 } },
  {
    $group: {
      _id: '$characterId',
      lastMessage: { $first: '$messages' },
      lastMessageAt: { $first: '$updatedAt' },
      messageCount: { $sum: 1 }
    }
  },
  { $limit: 3 }
]);
```

##### 2.2.5 統計データ（Analytics）
```javascript
// ダミーデータで構造のみ実装
const analytics = {
  chatCountPerDay: generateDummyChatData(7), // 7日分
  tokenUsagePerDay: generateDummyTokenData(7),
  affinityProgress: affinities.map(a => ({
    characterName: a.character.name.ja,
    level: a.level,
    color: a.character.themeColor
  }))
};
```

#### Task 2.3: レスポンス最適化
- **lean()クエリ**: パフォーマンス最適化
- **件数制限**: メモリ使用量制御
- **エラーハンドリング**: 適切なHTTPステータス

### フェーズ3: ルーティング統合（0.5日）

#### Task 3.1: メインルーターへの統合
- **ファイル**: `/backend/routes/user.js` または新規作成
- **パス**: `/api/user/dashboard` でアクセス可能にする

#### Task 3.2: CORS・ミドルウェア設定
- 既存のCORS設定との整合性確認
- 認証ミドルウェアの適用確認

### フェーズ4: テスト・最適化（1日）

#### Task 4.1: 単体テスト
- 各データ取得ロジックのテスト
- 認証・認可のテスト
- エラーケースのテスト

#### Task 4.2: パフォーマンステスト
- 大量データでのレスポンス時間測定
- メモリ使用量の監視
- クエリ最適化

#### Task 4.3: 統合テスト
- フロントエンドモックデータとの整合性確認
- APIレスポンス形式の検証

## 📝 実装コード例

### メインAPIルート
```javascript
// /backend/routes/user/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

const User = require('../../models/User');
const UserTokenPack = require('../../models/UserTokenPack');
const TokenUsage = require('../../models/TokenUsage');
const Chat = require('../../models/Chat');
const Character = require('../../models/Character');
const Notification = require('../../models/Notification');
const Badge = require('../../models/Badge');

router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. ユーザー基本情報 + ログイン履歴（最新10件）
    const user = await User.findById(userId)
      .select('_id name email createdAt lastLoginAt loginHistory affinities purchaseHistory')
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loginHistory = (user.loginHistory || []).slice(-10).reverse();

    // 2. トークン残高と統計
    const tokenPacks = await UserTokenPack.find({ userId }).lean();
    const balance = tokenPacks.reduce((acc, pack) => acc + (pack.tokensRemaining || 0), 0);
    const totalPurchased = tokenPacks.reduce((acc, pack) => acc + (pack.tokensPurchased || 0), 0);
    const totalUsed = totalPurchased - balance;

    // 3. 親密度情報（themeColor含む）
    const affinities = await Promise.all(
      (user.affinities || []).map(async affinity => {
        const character = await Character.findById(affinity.character)
          .select('_id name imageCharacterSelect themeColor')
          .lean();
        
        if (!character) return null;
        
        return {
          character: {
            _id: character._id,
            name: character.name,
            imageCharacterSelect: character.imageCharacterSelect,
            themeColor: character.themeColor || '#6366f1'
          },
          level: affinity.level || 0,
          experience: affinity.experience || 0,
          experienceToNext: (affinity.maxExperience || 100) - (affinity.experience || 0),
          maxExperience: affinity.maxExperience || 100,
          unlockedImages: affinity.unlockedImages || [],
          nextUnlockLevel: Math.ceil((affinity.level || 0) / 10) * 10
        };
      })
    );

    // 4. 最近のチャット（3件制限）
    const recentChats = await Chat.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$characterId',
          lastMessage: { $first: { $arrayElemAt: ['$messages.content', -1] } },
          lastMessageAt: { $first: '$updatedAt' },
          messageCount: { $sum: { $size: '$messages' } }
        }
      },
      { $limit: 3 }
    ]);

    // キャラクター情報を取得
    const chatCharacterIds = recentChats.map(chat => chat._id);
    const chatCharacters = await Character.find({ _id: { $in: chatCharacterIds } })
      .select('_id name imageCharacterSelect')
      .lean();

    const recentChatData = recentChats.map(chat => {
      const character = chatCharacters.find(c => c._id.toString() === chat._id.toString());
      return {
        _id: chat._id,
        character,
        lastMessage: chat.lastMessage || '',
        lastMessageAt: chat.lastMessageAt,
        messageCount: chat.messageCount || 0
      };
    }).filter(chat => chat.character); // キャラクターが見つからない場合は除外

    // 5. 購入履歴（最新20件）
    const purchaseHistory = (user.purchaseHistory || []).slice(-20).reverse();

    // 6. お知らせ
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // 7. バッジ
    const badges = await Badge.find({ userId }).lean();

    // 8. 統計データ（ダミー実装）
    const analytics = {
      chatCountPerDay: generateDummyChatData(7),
      tokenUsagePerDay: generateDummyTokenData(7),
      affinityProgress: affinities.filter(a => a).map(a => ({
        characterName: a.character.name.ja || a.character.name,
        level: a.level,
        color: a.character.themeColor
      }))
    };

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      tokens: {
        balance,
        totalPurchased,
        totalUsed,
        recentUsage: [] // TokenUsageから生成予定
      },
      affinities: affinities.filter(a => a),
      recentChats: recentChatData,
      purchaseHistory,
      loginHistory,
      notifications,
      badges,
      analytics
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ダミーデータ生成関数
function generateDummyChatData(days) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 10) + 1
    });
  }
  return data;
}

function generateDummyTokenData(days) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().slice(0, 10),
      amount: Math.floor(Math.random() * 500) + 100
    });
  }
  return data;
}

module.exports = router;
```

## 🔧 Character Model 拡張

```typescript
// /backend/models/Character.ts に追加
const CharacterSchema = new Schema({
  // ... 既存フィールド
  themeColor: {
    type: String,
    default: '#6366f1',
    validate: {
      validator: function(v) {
        return /^#[0-9A-Fa-f]{6}$/.test(v);
      },
      message: 'themeColor must be a valid hex color (e.g., #6366f1)'
    }
  }
});
```

## 📈 成功指標

### パフォーマンス目標
- **レスポンス時間**: 500ms以下
- **メモリ使用量**: 50MB以下
- **同時接続**: 100ユーザー対応

### 機能要件
- ✅ 全8セクションのデータ取得
- ✅ 件数制限（recentChats: 3件、loginHistory: 10件）
- ✅ themeColor対応
- ✅ エラーハンドリング
- ✅ 認証・認可

### 品質要件
- ✅ 単体テストカバレッジ90%以上
- ✅ APIドキュメント完備
- ✅ エラーログ適切な出力

## 🚀 デプロイ計画

### 開発環境
1. モデル拡張 → マイグレーション実行
2. APIルート実装 → 単体テスト
3. フロントエンド接続 → 統合テスト

### 本番環境
1. データベースマイグレーション
2. API実装デプロイ
3. フロントエンド更新
4. 監視・ログ設定

## 📝 注意事項

### セキュリティ
- JWT認証必須
- レート制限適用
- 入力値サニタイゼーション

### パフォーマンス
- lean()クエリ使用
- 適切なインデックス設計
- 件数制限によるメモリ最適化

### TokenUsage統合
- **直近30件のYen消費データ**をrecentUsageとして整形
- 日付ごとに集計してグラフ表示対応

## 📝 実装要件（フィードバック反映）

### 必須実装項目
1. ✅ **CharacterモデルにthemeColor（HEX）を追加**
2. ✅ **/api/user/dashboard のルートを routes/user/dashboard.js に作成**
3. ✅ **ユーザー、トークン、親密度、チャット、通知、バッジ、統計を1レスポンスで返すよう実装**
4. ✅ **recentChats（最大3件）、loginHistory（最大10件）に制限**
5. ✅ **affinities は Character.themeColor を含めて返却**
6. ✅ **analyticsセクションはダミーデータで仮実装**
7. ✅ **認証ミドルウェア auth を適用し、JWT必須にする**
8. ✅ **TokenUsage から recentUsage（直近30件分のYen消費）を整形して返却**

### TokenUsage recentUsage 仕様
```typescript
// TokenUsageから直近30件のYen消費データを取得・整形
recentUsage: Array<{
  date: string; // YYYY-MM-DD format
  amount: number; // apiCostYen値
}>
```

---

**総実装期間**: 4.5日
**担当者**: バックエンドエンジニア  
**実装優先度**: フィードバック要件を最優先で実装