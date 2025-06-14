# 💰 トークンシステム利益保証設計（簡素化版）

## 📋 概要

Charactier AIにおける50%利益確保を保証するシンプルなトークンシステム設計書。
GPT-4のみを使用する本番環境に最適化された、理解しやすく管理しやすいシステムです。

## 🎯 基本原則

### 利益保証ルール
```
購入金額 × 50% = API原価上限（円）
残り50% = プラットフォーム利益（確保済み）
```

### 固定コスト（為替考慮）
```
GPT-4 API原価 = $0.00144 × 為替150円 = 約0.216円/トークン（固定）
```

### 付与計算ロジック
```javascript
// シンプルな計算式
const apiCostLimit = purchaseAmount * 0.5;  // API原価上限
const tokensToGive = Math.floor(apiCostLimit / 0.216);  // 付与トークン数（整数化）
```

## 🏗️ データモデル設計

### UserTokenPack Schema（簡素化版）
```javascript
// backend/models/UserTokenPack.js
const UserTokenPackSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true },
  stripeSessionId: { type: String, required: true, unique: true },
  
  // 購入情報
  purchaseAmountYen: { type: Number, required: true },  // 購入金額（円）
  tokensPurchased: { type: Number, required: true },    // 付与トークン数
  tokensRemaining: { type: Number, required: true },    // 残りトークン数
  
  // 状態管理
  isActive: { type: Boolean, default: true },
  purchaseDate: { type: Date, default: Date.now },
  
  // Stripe情報
  stripeProductId: String,
  stripePriceId: String
});

// 💡 廃止されたフィールド
// ❌ maxCostYen - 不要（API原価は記録しない）
// ❌ usedCostYen - 不要（トークン数のみで管理）
```

### User Schema（トークンバランス）
```javascript
// backend/models/User.js（一部抜粋）
const UserSchema = new mongoose.Schema({
  // ... 他のフィールド
  tokenBalance: { type: Number, default: 0 },  // 現在の利用可能トークン数
  // ... 他のフィールド
});
```

### TokenUsage Schema（使用履歴）
```javascript
// backend/models/TokenUsage.ts
interface TokenUsage {
  userId: ObjectId;
  characterId: ObjectId;
  tokensUsed: number;        // 使用トークン数
  messageContent?: string;   // メッセージ内容（オプション）
  timestamp: Date;
  
  // 💡 廃止されたフィールド
  // ❌ costYen - 不要（トークン数のみで管理）
  // ❌ model - GPT-4固定のため不要
}
```

## ⚙️ 実装ロジック

### 1. トークン付与処理
```javascript
// backend/services/tokenService.js

class TokenService {
  // トークン付与数の計算（為替考慮版）
  static calculateTokensToGive(purchaseAmountYen) {
    const GPT4_COST_PER_TOKEN_YEN = 0.216;  // $0.00144 × 150円 = 0.216円
    const PROFIT_MARGIN = 0.5;              // 50%利益確保
    
    const apiCostLimit = purchaseAmountYen * PROFIT_MARGIN;
    const tokensToGive = Math.floor(apiCostLimit / GPT4_COST_PER_TOKEN_YEN);
    
    console.log(`💰 購入金額: ${purchaseAmountYen}円`);
    console.log(`💰 API原価上限: ${apiCostLimit}円`);
    console.log(`🎁 付与トークン数: ${tokensToGive}トークン`);
    
    return tokensToGive;
  }
  
  // Stripe決済完了後のトークン付与
  static async grantTokens(userId, stripeSessionId, purchaseAmountYen) {
    try {
      // 1. 付与トークン数を計算
      const tokensToGive = this.calculateTokensToGive(purchaseAmountYen);
      
      // 2. UserTokenPack レコード作成
      const tokenPack = new UserTokenPack({
        userId,
        stripeSessionId,
        purchaseAmountYen,
        tokensPurchased: tokensToGive,
        tokensRemaining: tokensToGive,  // 初期状態では全て残っている
        isActive: true
      });
      
      await tokenPack.save();
      
      // 3. User.tokenBalance を更新
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenBalance: tokensToGive }
      });
      
      console.log(`✅ ユーザー ${userId} に ${tokensToGive} トークンを付与しました`);
      
      return {
        success: true,
        tokensGranted: tokensToGive,
        newBalance: await this.getUserTokenBalance(userId)
      };
      
    } catch (error) {
      console.error('❌ トークン付与エラー:', error);
      throw error;
    }
  }
  
  // ユーザーの現在のトークンバランス取得
  static async getUserTokenBalance(userId) {
    const user = await User.findById(userId).select('tokenBalance');
    return user ? user.tokenBalance : 0;
  }
}
```

### 2. トークン使用処理
```javascript
// backend/services/tokenService.js（続き）

class TokenService {
  // トークン使用処理
  static async useTokens(userId, characterId, tokensUsed, messageContent = '') {
    try {
      // 1. ユーザーの残高確認
      const currentBalance = await this.getUserTokenBalance(userId);
      
      if (currentBalance < tokensUsed) {
        throw new Error(`トークン不足: 残高${currentBalance}, 必要${tokensUsed}`);
      }
      
      // 2. User.tokenBalance から減算
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenBalance: -tokensUsed }
      });
      
      // 3. TokenUsage レコード作成（使用履歴）
      const tokenUsage = new TokenUsage({
        userId,
        characterId,
        tokensUsed,
        messageContent,
        timestamp: new Date()
      });
      
      await tokenUsage.save();
      
      // 4. UserTokenPack の tokensRemaining を更新
      await this.updateTokenPackRemaining(userId, tokensUsed);
      
      console.log(`📉 ユーザー ${userId} が ${tokensUsed} トークンを使用`);
      
      return {
        success: true,
        tokensUsed,
        newBalance: currentBalance - tokensUsed
      };
      
    } catch (error) {
      console.error('❌ トークン使用エラー:', error);
      throw error;
    }
  }
  
  // UserTokenPack の tokensRemaining を更新（FIFO方式）
  static async updateTokenPackRemaining(userId, tokensUsed) {
    const tokenPacks = await UserTokenPack.find({
      userId,
      isActive: true,
      tokensRemaining: { $gt: 0 }
    }).sort({ purchaseDate: 1 });  // 古い順
    
    let remainingToDeduct = tokensUsed;
    
    for (const pack of tokenPacks) {
      if (remainingToDeduct <= 0) break;
      
      const deductFromThisPack = Math.min(pack.tokensRemaining, remainingToDeduct);
      
      pack.tokensRemaining -= deductFromThisPack;
      remainingToDeduct -= deductFromThisPack;
      
      if (pack.tokensRemaining === 0) {
        pack.isActive = false;  // 使い切ったパックは非アクティブ
      }
      
      await pack.save();
    }
  }
}
```

### 3. ChatServiceとの統合
```javascript
// backend/services/ChatService.ts（簡素化）

class ChatService {
  async sendMessage(userId, characterId, message) {
    try {
      // 1. トークン残高確認
      const userBalance = await TokenService.getUserTokenBalance(userId);
      
      if (userBalance <= 0) {
        throw new Error('トークンが不足しています。追加購入してください。');
      }
      
      // 2. GPT-4でメッセージ処理
      const response = await openai.chat.completions.create({
        model: 'gpt-4',  // 固定
        messages: [
          { role: 'system', content: characterPrompt },
          { role: 'user', content: message }
        ]
      });
      
      // 3. 使用トークン数を計算（GPT-4固定なので簡単）
      const tokensUsed = response.usage.total_tokens;
      
      // 4. トークンを消費
      await TokenService.useTokens(userId, characterId, tokensUsed, message);
      
      return {
        reply: response.choices[0].message.content,
        tokensUsed,
        remainingBalance: userBalance - tokensUsed
      };
      
    } catch (error) {
      console.error('❌ チャット処理エラー:', error);
      throw error;
    }
  }
}
```

## 📊 料金プラン例

### 実際の価格設定例（為替考慮）
```javascript
// 料金プラン設定
const TOKEN_PLANS = [
  {
    name: 'スターター',
    priceYen: 500,
    tokensGiven: Math.floor((500 * 0.5) / 0.216),  // 1,157トークン
    description: '軽くチャットを楽しみたい方向け'
  },
  {
    name: 'レギュラー', 
    priceYen: 1000,
    tokensGiven: Math.floor((1000 * 0.5) / 0.216), // 2,314トークン
    description: '日常的にチャットを楽しむ方向け'
  },
  {
    name: 'プレミアム',
    priceYen: 2000, 
    tokensGiven: Math.floor((2000 * 0.5) / 0.216), // 4,629トークン
    description: 'たくさんチャットしたい方向け'
  }
];
```

### 利益計算例（1000円プラン）
```
購入金額: 1000円
API原価上限: 1000円 × 50% = 500円
付与トークン: 500円 ÷ 0.216円 = 2,314トークン
プラットフォーム利益: 500円（50%確保）

実際のAPI原価: 2,314トークン × 0.216円 = 499.8円
実際の利益: 1000円 - 499.8円 = 500.2円（50.02%）
```

## 🔧 WebhookとStripe統合

### Stripe Webhook処理（自動計算版）
```javascript
// backend/webhooks/stripe.js

router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // 1. セッション情報から必要データを取得
      const userId = session.metadata.userId;
      const purchaseAmountYen = session.amount_total; // yen単位
      
      // 2. トークン付与処理（自動計算）
      await TokenService.grantTokens(
        userId,
        session.id,
        purchaseAmountYen
      );
      
      console.log(`✅ Stripe決済完了: ユーザー${userId}, 金額${purchaseAmountYen}円`);
      console.log(`🎁 付与トークン数: ${TokenService.calculateTokensToGive(purchaseAmountYen)}トークン`);
    }
    
    res.json({received: true});
    
  } catch (error) {
    console.error('❌ Stripe Webhook エラー:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

## 🧪 テスト実装

### ユニットテスト例（為替考慮版）
```javascript
// tests/tokenService.test.js

describe('TokenService', () => {
  test('トークン付与数の計算が正確（為替考慮）', () => {
    const purchaseAmount = 1000; // 1000円
    const tokensGiven = TokenService.calculateTokensToGive(purchaseAmount);
    
    // 期待値: (1000 * 0.5) / 0.216 = 2,314トークン
    expect(tokensGiven).toBe(2314);
  });
  
  test('50%利益が確保される（為替考慮）', () => {
    const purchaseAmount = 2000; // 2000円
    const tokensGiven = TokenService.calculateTokensToGive(purchaseAmount);
    const actualCost = tokensGiven * 0.216;
    const profit = purchaseAmount - actualCost;
    const profitRate = profit / purchaseAmount;
    
    // 利益率が50%以上であることを確認
    expect(profitRate).toBeGreaterThanOrEqual(0.5);
  });
  
  test('為替変動対応', () => {
    // 為替が変動した場合のテスト
    const purchaseAmount = 1000;
    
    // 現在の設定（150円）
    const currentTokens = Math.floor((purchaseAmount * 0.5) / 0.216);
    
    // 為替が130円に下がった場合の想定
    const newRate = 0.00144 * 130; // 0.1872円
    const newTokens = Math.floor((purchaseAmount * 0.5) / newRate);
    
    // 為替が下がるとより多くのトークンを付与できる
    expect(newTokens).toBeGreaterThan(currentTokens);
  });
  
  test('トークン使用処理', async () => {
    const userId = 'test-user';
    const tokensToUse = 1000;
    
    // 事前にトークンを付与
    await TokenService.grantTokens(userId, 'test-session', 1000);
    
    // トークン使用
    const result = await TokenService.useTokens(userId, 'character-id', tokensToUse);
    
    expect(result.success).toBe(true);
    expect(result.tokensUsed).toBe(tokensToUse);
  });
});
```

## 📈 運用メリット

### ✅ シンプルな利点
1. **理解しやすい**: 計算ロジックが単純
2. **管理しやすい**: トークン数のみで完結
3. **利益保証**: 確実に50%利益を確保
4. **透明性**: ユーザーにとって分かりやすい
5. **為替考慮**: 現実的なコスト設定

### ✅ 廃止による恩恵
- **maxCostYen / usedCostYen 廃止**: 複雑な金額管理が不要
- **モデル固定**: GPT-4のみで運用コストが明確
- **単一レート**: 0.216円/トークンで計算が簡単

## 🚨 注意事項

### 為替変動対応
```javascript
// 将来的に為替レートが変わった場合の対応
const USD_TO_JPY_RATE = parseFloat(process.env.USD_TO_JPY_RATE || '150');
const GPT4_COST_PER_TOKEN_USD = 0.00144;
const GPT4_COST_PER_TOKEN_YEN = GPT4_COST_PER_TOKEN_USD * USD_TO_JPY_RATE;

// 環境変数で調整可能にしておく
// .env: USD_TO_JPY_RATE=150
```

### エラーハンドリング
```javascript
// トークン不足時のユーザー向けメッセージ
const TOKEN_INSUFFICIENT_MESSAGE = {
  ja: 'トークンが不足しています。追加購入してください。',
  en: 'Insufficient tokens. Please purchase more tokens.'
};
```

## 💱 為替レート管理

### 環境変数設定
```env
# .env
USD_TO_JPY_RATE=150
GPT4_COST_PER_TOKEN_USD=0.00144
```

### 動的レート計算
```javascript
// backend/config/pricing.js
export const getPricingConfig = () => {
  const usdToJpyRate = parseFloat(process.env.USD_TO_JPY_RATE || '150');
  const gpt4CostUsd = parseFloat(process.env.GPT4_COST_PER_TOKEN_USD || '0.00144');
  
  return {
    gpt4CostPerTokenYen: gpt4CostUsd * usdToJpyRate,
    profitMargin: 0.5,
    usdToJpyRate
  };
};
```

## 📋 マイグレーション計画

既存システムからの移行手順：

1. **コスト計算の更新**
   - 為替レート考慮版に変更
   - 0.216円/トークンの固定レート適用

2. **データベーススキーマ更新**
   - `maxCostYen`, `usedCostYen` フィールドを削除
   - `tokensRemaining` フィールドを追加

3. **既存データの移行**
   - 既存のUserTokenPackレコードの `tokensRemaining` を計算して設定
   - 使用済みコストからトークン使用量を逆算

4. **APIエンドポイント更新**
   - 金額ベースから純粋トークンベースに変更

---

## 🚀 実装計画・タスク一覧

### 📋 実装タスク概要

#### 🔴 Phase 1: バックエンド基盤実装（Day 1）

**Task 1.1: TokenService の簡素化**
- **ファイル**: `backend/services/tokenService.js`
- **優先度**: 🔴 最優先
- **所要時間**: 3-4時間

**実装内容**:
```javascript
// 新規作成または大幅修正: backend/services/tokenService.js
class TokenService {
  static calculateTokensToGive(purchaseAmountYen) {
    const GPT4_COST_PER_TOKEN_YEN = 0.216;  // $0.00144 × 150円
    const PROFIT_MARGIN = 0.5;              // 50%利益確保
    
    const apiCostLimit = purchaseAmountYen * PROFIT_MARGIN;
    const tokensToGive = Math.floor(apiCostLimit / GPT4_COST_PER_TOKEN_YEN);
    
    return tokensToGive;
  }
  
  static async grantTokens(userId, stripeSessionId, purchaseAmountYen) {
    const tokensToGive = this.calculateTokensToGive(purchaseAmountYen);
    
    // UserTokenPack レコード作成
    const tokenPack = new UserTokenPack({
      userId,
      stripeSessionId,
      purchaseAmountYen,
      tokensPurchased: tokensToGive,
      tokensRemaining: tokensToGive,
      isActive: true
    });
    await tokenPack.save();
    
    // User.tokenBalance を更新
    await User.findByIdAndUpdate(userId, {
      $inc: { tokenBalance: tokensToGive }
    });
    
    return { success: true, tokensGranted: tokensToGive };
  }
}
```

**検証テスト**:
- 計算ロジックの正確性テスト
- 50%利益保証の確認
- User.tokenBalance更新テスト

---

**Task 1.2: UserTokenPack モデルの簡素化**
- **ファイル**: `backend/models/UserTokenPack.js`
- **優先度**: 🔴 最優先
- **所要時間**: 2-3時間

**実装内容**:
```javascript
// backend/models/UserTokenPack.js の修正
const UserTokenPackSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true },
  stripeSessionId: { type: String, required: true, unique: true },
  
  // 購入情報（簡素化）
  purchaseAmountYen: { type: Number, required: true },
  tokensPurchased: { type: Number, required: true },
  tokensRemaining: { type: Number, required: true },
  
  // 状態管理
  isActive: { type: Boolean, default: true },
  purchaseDate: { type: Date, default: Date.now },
  
  // Stripe情報
  stripeProductId: String,
  stripePriceId: String
});

// 削除するフィールド:
// - maxCostYen
// - usedCostYen
// - その他のコスト関連フィールド
```

**マイグレーションスクリプト**:
```javascript
// scripts/migrateUserTokenPack.js
async function migrateToSimplified() {
  const tokenPacks = await UserTokenPack.find({});
  
  for (const pack of tokenPacks) {
    // 既存のmaxCostYenから逆算してtokensRemainingを設定
    if (!pack.tokensRemaining && pack.maxCostYen && pack.usedCostYen) {
      const remainingCost = pack.maxCostYen - pack.usedCostYen;
      pack.tokensRemaining = Math.floor(remainingCost / 0.216);
    }
    
    // 古いフィールドを削除
    pack.unset('maxCostYen');
    pack.unset('usedCostYen');
    
    await pack.save();
  }
}
```

---

#### 🟡 Phase 2: Stripe統合・Webhook更新（Day 2）

**Task 2.1: Stripe Webhook の簡素化**
- **ファイル**: `backend/webhooks/stripe.js`
- **優先度**: 🟡 中優先
- **所要時間**: 2-3時間

**実装内容**:
```javascript
// backend/webhooks/stripe.js の修正
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const purchaseAmountYen = session.amount_total;
      
      // 自動計算でトークン付与
      await TokenService.grantTokens(userId, session.id, purchaseAmountYen);
      
      console.log(`✅ 自動付与: ${userId} - ${purchaseAmountYen}円 - ${TokenService.calculateTokensToGive(purchaseAmountYen)}トークン`);
    }
    
    res.json({received: true});
  } catch (error) {
    console.error('❌ Stripe Webhook エラー:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

---

**Task 2.2: 環境変数・設定の外部化**
- **ファイル**: `backend/config/pricing.js`
- **優先度**: 🟡 中優先
- **所要時間**: 1-2時間

**実装内容**:
```javascript
// backend/config/pricing.js
export const getPricingConfig = () => {
  const usdToJpyRate = parseFloat(process.env.USD_TO_JPY_RATE || '150');
  const gpt4CostUsd = parseFloat(process.env.GPT4_COST_PER_TOKEN_USD || '0.00144');
  
  return {
    gpt4CostPerTokenYen: gpt4CostUsd * usdToJpyRate,
    profitMargin: parseFloat(process.env.PROFIT_MARGIN || '0.5'),
    usdToJpyRate
  };
};
```

**環境変数設定**:
```env
# backend/.env に追加
USD_TO_JPY_RATE=150
GPT4_COST_PER_TOKEN_USD=0.00144
PROFIT_MARGIN=0.5
```

---

#### 🎨 Phase 3: ChatService統合・トークン使用簡素化（Day 3）

**Task 3.1: ChatService の統合**
- **ファイル**: `backend/services/ChatService.ts`
- **優先度**: 🟡 中優先
- **所要時間**: 2-3時間

**実装内容**:
```typescript
// backend/services/ChatService.ts の修正
class ChatService {
  async sendMessage(userId: string, characterId: string, message: string) {
    try {
      // 1. トークン残高確認
      const userBalance = await TokenService.getUserTokenBalance(userId);
      if (userBalance <= 0) {
        throw new Error('トークンが不足しています。追加購入してください。');
      }
      
      // 2. GPT-4でメッセージ処理（固定）
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: characterPrompt },
          { role: 'user', content: message }
        ]
      });
      
      // 3. 使用トークン数を取得・消費
      const tokensUsed = response.usage.total_tokens;
      await TokenService.useTokens(userId, characterId, tokensUsed, message);
      
      return {
        reply: response.choices[0].message.content,
        tokensUsed,
        remainingBalance: userBalance - tokensUsed
      };
    } catch (error) {
      throw error;
    }
  }
}
```

---

**Task 3.2: TokenUsage モデルの簡素化**
- **ファイル**: `backend/models/TokenUsage.ts`
- **優先度**: 🟡 中優先
- **所要時間**: 1-2時間

**実装内容**:
```typescript
// backend/models/TokenUsage.ts の修正
interface TokenUsage {
  userId: ObjectId;
  characterId: ObjectId;
  tokensUsed: number;
  messageContent?: string;
  timestamp: Date;
  
  // 削除するフィールド:
  // - costYen (不要)
  // - model (GPT-4固定)
}
```

---

#### 🧪 Phase 4: テスト・検証（Day 4）

**Task 4.1: ユニットテスト作成**
- **ファイル**: `tests/tokenService.test.js`
- **優先度**: 🟢 低優先
- **所要時間**: 3-4時間

**実装内容**:
```javascript
// tests/tokenService.test.js
describe('TokenService（簡素化版）', () => {
  test('50%利益確保の計算', () => {
    const result = TokenService.calculateTokensToGive(1000);
    expect(result).toBe(2314); // (1000 * 0.5) / 0.216 = 2314
  });
  
  test('為替変動への対応', () => {
    // レート変更時の動作確認
  });
  
  test('Stripe webhook統合', async () => {
    // Webhookからのトークン付与テスト
  });
  
  test('User.tokenBalance更新', async () => {
    // tokenBalance正確性テスト
  });
});
```

---

**Task 4.2: 統合テスト・エンドツーエンド**
- **ファイル**: `tests/integration/tokenFlow.test.js`
- **優先度**: 🟢 低優先
- **所要時間**: 2-3時間

**実装内容**:
```javascript
// 購入→付与→使用→残高確認のフルフロー検証
describe('Token Flow Integration', () => {
  test('Complete token lifecycle', async () => {
    // 1. Stripe決済シミュレート
    // 2. トークン付与確認
    // 3. チャットでトークン使用
    // 4. 残高・tokensRemaining正確性確認
  });
});
```

---

#### 🔧 Phase 5: 管理画面・API更新（Day 5）

**Task 5.1: 管理画面でのトークン情報表示**
- **ファイル**: `frontend/app/admin/tokens/page.tsx`
- **優先度**: 🟡 中優先
- **所要時間**: 3-4時間

**実装内容**:
```typescript
// 管理画面でのトークン統計表示
interface TokenStats {
  totalTokensSold: number;
  totalRevenue: number;
  profitMargin: number;
  activeUsers: number;
}

const TokenManagementPage = () => {
  // 簡素化されたデータ表示
  // - ユーザー別トークン残高
  // - 購入履歴
  // - 利益率統計
};
```

---

**Task 5.2: ユーザー向けトークン購入ページ**
- **ファイル**: `frontend/app/[locale]/tokens/page.tsx`
- **優先度**: 🟡 中優先
- **所要時間**: 2-3時間

**実装内容**:
```typescript
// ユーザー向けトークン購入画面
const TokenPurchasePage = () => {
  const plans = [
    { price: 500, tokens: Math.floor((500 * 0.5) / 0.216) },
    { price: 1000, tokens: Math.floor((1000 * 0.5) / 0.216) },
    { price: 2000, tokens: Math.floor((2000 * 0.5) / 0.216) }
  ];
  
  // Stripe決済フロー統合
};
```

---

## 📊 実装スケジュール

| Day | Phase | タスク | 所要時間 | 担当者 |
|-----|-------|--------|----------|--------|
| 1 | Phase 1 | TokenService簡素化 | 3-4h | バックエンド |
| 1 | Phase 1 | UserTokenPackモデル修正 | 2-3h | バックエンド |
| 2 | Phase 2 | Stripe Webhook更新 | 2-3h | バックエンド |
| 2 | Phase 2 | 環境変数・設定外部化 | 1-2h | バックエンド |
| 3 | Phase 3 | ChatService統合 | 2-3h | バックエンド |
| 3 | Phase 3 | TokenUsage簡素化 | 1-2h | バックエンド |
| 4 | Phase 4 | ユニットテスト | 3-4h | 全員 |
| 4 | Phase 4 | 統合テスト | 2-3h | 全員 |
| 5 | Phase 5 | 管理画面更新 | 3-4h | フロントエンド |
| 5 | Phase 5 | ユーザー購入画面 | 2-3h | フロントエンド |

**総所要時間**: 約23-31時間（5日間）

---

## 🔧 必要な準備

### データベースマイグレーション
```bash
# マイグレーションスクリプト実行
node scripts/migrateUserTokenPack.js
```

### 環境変数設定
```env
# backend/.env に追加
USD_TO_JPY_RATE=150
GPT4_COST_PER_TOKEN_USD=0.00144
PROFIT_MARGIN=0.5
```

### 依存関係確認
```bash
# 既存のStripe・OpenAI設定を確認
npm list stripe
npm list openai
```

---

## ✅ 完了判定基準

### Phase 1 完了条件
- [ ] TokenService.calculateTokensToGive()が正確に動作
- [ ] UserTokenPackモデルからmaxCostYen/usedCostYen削除完了
- [ ] User.tokenBalance更新が正常動作

### Phase 2 完了条件
- [ ] Stripe Webhookが購入金額から自動でトークン数計算
- [ ] 環境変数での設定調整が可能

### Phase 3 完了条件
- [ ] ChatServiceがGPT-4固定で動作
- [ ] トークン使用がシンプルな減算処理で完了

### Phase 4 完了条件
- [ ] 全ての主要機能にテストが存在
- [ ] エンドツーエンドテストがpass

### Phase 5 完了条件
- [ ] 管理画面で簡素化されたトークン情報表示
- [ ] ユーザーが新しい料金プランで購入可能

---

## 🚨 実装時の注意事項

1. **データ移行**: 既存UserTokenPackの`tokensRemaining`を正確に計算
2. **Stripe連携**: 決済金額からの自動計算を確実に実装
3. **後方互換性**: 既存ユーザーのトークン残高を保持
4. **テスト環境**: 本番Stripeとの連携前に十分テスト

---

**この実装計画により、シンプルで堅牢な50%利益保証トークンシステムが完成します。**

---

**この簡素化されたシステムにより、為替を考慮した現実的で分かりやすい50%利益保証トークンシステムが実現できます。**

---

# 🎯 実装完了レポート

## 📅 実装日時
**実装完了:** 2025年1月6日

## ✅ 実装済み機能一覧

### 1. **TokenService 簡素化クラス** ✅
**場所:** `/backend/services/tokenService.js`

**実装内容:**
- 50%利益保証を確実に実現するシンプルなトークン管理システム
- 主要機能:
  - `calculateTokensToGive()` - 購入金額から付与トークン数を自動計算
  - `grantTokens()` - Stripe決済完了後のトークン付与処理
  - `useTokens()` - チャット時のトークン消費処理
  - `getUserTokenBalance()` - ユーザーの現在トークン残高取得
  - `getUserTokenHistory()` - ユーザーの購入履歴取得
  - `getSystemTokenStats()` - システム全体のトークン統計（管理者用）
  - `getTokenPlans()` - 動的料金プラン生成

**計算式:**
```javascript
const apiCostLimit = purchaseAmountYen * 0.5;  // API原価上限（50%）
const tokensToGive = Math.floor(apiCostLimit / 0.216);  // 付与トークン数
// 0.216円 = $0.00144 × 為替150円
```

### 2. **UserTokenPack モデル（簡素化版）** ✅
**場所:** `/backend/models/UserTokenPack.js`

**実装内容:**
- 複雑な金額管理を廃止し、トークン数のみで管理
- 主要フィールド:
  - `purchaseAmountYen` - 購入金額（円）
  - `tokensPurchased` - 購入時の付与トークン数
  - `tokensRemaining` - 現在の残りトークン数
  - `isActive` - パックの有効状態
- FIFO方式でのトークン消費管理
- 統計メソッド: `getSystemStats()`, `getProfitAnalysis()`

**廃止されたフィールド:**
- ❌ `maxCostYen` - 複雑な金額管理を排除
- ❌ `usedCostYen` - トークン数のみで管理

### 3. **TokenUsage モデル（簡素化版）** ✅
**場所:** `/backend/models/TokenUsage.js`

**実装内容:**
- シンプルなトークン使用履歴管理
- 主要フィールド:
  - `tokensUsed` - 使用トークン数
  - `messageContent` - メッセージ内容（最大2000文字）
  - `characterId` - キャラクターID
  - `timestamp` - 使用日時
- 統計機能: ユーザー別・キャラクター別・システム全体の統計

**廃止されたフィールド:**
- ❌ `costYen` - 金額管理を排除
- ❌ `model` - GPT-4固定のため不要

### 4. **価格設定・環境変数管理** ✅
**場所:** `/backend/config/pricing.js`

**実装内容:**
- 環境変数による柔軟な設定管理
- 為替レート変動対応
- 料金プランの動的生成
- 設定検証機能
- 影響分析機能（為替レート変更時）

**環境変数設定:**
```env
USD_TO_JPY_RATE=150
GPT4_COST_PER_TOKEN_USD=0.00144
PROFIT_MARGIN=0.5
PLAN_PRICE_1=500
PLAN_PRICE_2=1000
PLAN_PRICE_3=2000
PLAN_PRICE_4=5000
```

### 5. **Stripe Webhook（簡素化版）** ✅
**場所:** `/backend/webhooks/stripe.js`

**実装内容:**
- 自動トークン付与システム
- 重複処理防止機能
- エラーハンドリング強化
- 管理者向け統計ログ
- テスト用エンドポイント（開発環境）

**主要機能:**
- `checkout.session.completed` イベントでの自動トークン付与
- 購入金額から自動計算（50%利益保証）
- セッションIDによる重複防止

### 6. **ChatService トークン統合** ✅
**場所:** `/backend/services/ChatServiceSimplified.ts`

**実装内容:**
- GPT-4固定での統合
- 事前トークン残高確認
- TokenServiceとの完全連携
- 簡素化されたコスト計算
- ユーザー向けトークン残高表示

## 🔗 バックエンド統合方法

### A. 環境変数設定

**1. .envファイルに追加**

```env
# トークンシステム設定
USD_TO_JPY_RATE=150
GPT4_COST_PER_TOKEN_USD=0.00144
GPT4_COST_PER_TOKEN_YEN=0.216
PROFIT_MARGIN=0.5

# 料金プラン設定
PLAN_PRICE_1=500
PLAN_PRICE_2=1000
PLAN_PRICE_3=2000
PLAN_PRICE_4=5000

# 設定オプション
TOKEN_ROUNDING_MODE=floor
MIN_TOKENS_PER_PURCHASE=100
MAX_TOKENS_PER_PURCHASE=100000
ENABLE_PRICING_LOGS=true
ENABLE_COST_TRACKING=true

# Stripe設定（既存）
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### B. メインアプリケーション統合

**2. index.ts/app.jsに追加**

```javascript
// backend/src/index.ts または app.js

// Webhookルート追加
app.use('/webhooks', require('./webhooks/stripe'));

// 既存のAPIルートの前に追加
app.use('/api/tokens', require('./routes/api/tokens')); // 新規作成が必要
```

### C. Routesの作成と統合

**3. トークン管理APIルート作成**

**新規作成:** `/backend/routes/api/tokens.js`

```javascript
const express = require('express');
const router = express.Router();
const TokenService = require('../../services/tokenService');
const { generateTokenPlans, validatePricingConfig } = require('../../config/pricing');
const auth = require('../../middleware/auth');

// GET /api/tokens/balance - ユーザーのトークン残高取得
router.get('/balance', auth, async (req, res) => {
  try {
    const balance = await TokenService.getUserTokenBalance(req.user.id);
    res.json({ 
      balance,
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tokens/history - ユーザーの購入履歴取得
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const history = await TokenService.getUserTokenHistory(req.user.id, parseInt(limit));
    res.json({ 
      history,
      userId: req.user.id,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tokens/usage - ユーザーの使用履歴取得
router.get('/usage', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const usage = await TokenService.getUserTokenUsage(req.user.id, parseInt(limit));
    res.json({ 
      usage,
      userId: req.user.id,
      count: usage.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tokens/plans - 料金プラン取得
router.get('/plans', async (req, res) => {
  try {
    const plans = generateTokenPlans();
    const configValidation = validatePricingConfig();
    
    res.json({
      plans,
      configValid: configValidation.valid,
      warnings: configValidation.warnings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### D. ChatService統合の更新

**4. 既存チャットルートの更新**

```javascript
// backend/routes/chat.js の更新

const { ChatServiceSimplified } = require('../services/ChatServiceSimplified');
const chatService = new ChatServiceSimplified();

// 既存のPOST /api/chats/:characterId/messages エンドポイントを更新
router.post('/:characterId/messages', auth, async (req, res) => {
  try {
    const { characterId } = req.params;
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    // 新しいChatServiceSimplifiedを使用
    const result = await chatService.generateCharacterResponse(
      userId,
      characterId,
      message,
      sessionId || uuidv4()
    );

    res.json({
      success: true,
      aiMessage: {
        id: uuidv4(),
        type: 'character',
        content: result.response,
        timestamp: new Date(),
        metadata: {
          tokensUsed: result.tokensUsed,
          apiCost: result.apiCost,
          intimacyChange: result.intimacyChange,
          relationshipStatus: result.relationshipStatus
        }
      },
      userTokenBalance: result.userTokenBalance,
      tokensUsed: result.tokensUsed,
      intimacyChange: result.intimacyChange
    });

  } catch (error) {
    if (error.message.includes('トークンが不足')) {
      return res.status(402).json({
        error: error.message,
        code: 'INSUFFICIENT_TOKENS',
        needTokenPurchase: true
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});
```

## 🎨 フロントエンド統合方法

### A. トークン購入ページの作成

**1. 新規作成:** `/frontend/app/[locale]/tokens/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Coins, CreditCard, TrendingUp } from 'lucide-react';

interface TokenPlan {
  id: string;
  name: string;
  priceYen: number;
  tokensGiven: number;
  estimatedMessages: number;
  description: string;
  icon: string;
  details: {
    tokensPerYen: string;
    profitMargin: string;
  };
}

export default function TokenPurchasePage() {
  const [plans, setPlans] = useState<TokenPlan[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokenPlans();
    fetchUserBalance();
  }, []);

  const fetchTokenPlans = async () => {
    try {
      const response = await fetch('/api/tokens/plans');
      const data = await response.json();
      setPlans(data.plans);
    } catch (error) {
      console.error('Failed to fetch token plans:', error);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/tokens/balance');
      const data = await response.json();
      setUserBalance(data.balance);
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan: TokenPlan) => {
    try {
      // Stripe決済フローの開始
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          priceYen: plan.priceYen,
          tokensGiven: plan.tokensGiven
        })
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Purchase error:', error);
      alert('購入処理中にエラーが発生しました');
    }
  };

  if (loading) return <div>読み込み中...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">トークン購入</h1>
        <div className="flex items-center justify-center space-x-2 text-lg">
          <Coins className="w-6 h-6 text-yellow-500" />
          <span>現在の残高: {userBalance.toLocaleString()} トークン</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-blue-400 transition-colors">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{plan.icon}</div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-gray-600 text-sm">{plan.description}</p>
            </div>

            <div className="space-y-2 mb-6">
              <div className="text-center">
                <span className="text-3xl font-bold text-blue-600">¥{plan.priceYen.toLocaleString()}</span>
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span>付与トークン:</span>
                  <span className="font-semibold">{plan.tokensGiven.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>推定メッセージ数:</span>
                  <span className="font-semibold">{plan.estimatedMessages}回</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>1円あたり:</span>
                  <span className="font-semibold">{plan.details.tokensPerYen}トークン</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handlePurchase(plan)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>購入する</span>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          トークンシステムについて
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">50%利益保証</h3>
            <p className="text-gray-600">購入金額の50%は確実にプラットフォームの利益として確保され、残り50%でトークンを提供します。</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">GPT-4固定</h3>
            <p className="text-gray-600">全てのチャットでGPT-4を使用し、最高品質の会話体験を提供します。</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">透明な価格設定</h3>
            <p className="text-gray-600">為替レート（150円/$）を考慮した明確で公正な価格設定です。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### B. チャット画面でのトークン表示

**2. ChatLayout.tsxの更新**

```typescript
// frontend/components/chat/ChatLayout.tsx に追加

const [tokenBalance, setTokenBalance] = useState(0);

// トークン残高取得
const fetchTokenBalance = async () => {
  try {
    const response = await fetch('/api/tokens/balance');
    const data = await response.json();
    setTokenBalance(data.balance);
  } catch (error) {
    console.error('Failed to fetch token balance:', error);
  }
};

// useEffect内で呼び出し
useEffect(() => {
  fetchTokenBalance();
}, []);

// メッセージ送信後にトークン残高を更新
const handleSendMessage = async () => {
  // ... 既存のメッセージ送信処理

  if (response.ok) {
    const data = await response.json();
    
    // トークン残高更新
    setTokenBalance(data.userTokenBalance);
    
    // トークン不足エラーの処理
    if (data.code === 'INSUFFICIENT_TOKENS') {
      setErrorMessage('トークンが不足しています。');
      // トークン購入ページへのリンク表示
      setShowTokenPurchaseLink(true);
      return;
    }
  }
};

// UI部分にトークン表示を追加
<div className="flex items-center space-x-4 p-4 bg-gray-50">
  <div className="flex items-center space-x-2">
    <Coins className="w-5 h-5 text-yellow-500" />
    <span className="text-sm">
      残高: {tokenBalance.toLocaleString()} トークン
    </span>
  </div>
  
  {tokenBalance < 100 && (
    <Link href="/tokens" className="text-xs text-blue-600 hover:underline">
      トークンを購入
    </Link>
  )}
</div>
```

### C. 管理画面でのトークン統計

**3. 新規作成:** `/frontend/app/admin/tokens/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Package } from 'lucide-react';

export default function AdminTokensPage() {
  const [stats, setStats] = useState(null);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokenStats();
  }, []);

  const fetchTokenStats = async () => {
    try {
      const response = await fetch('/api/admin/tokens/stats');
      const data = await response.json();
      setStats(data);
      setRecentPurchases(data.recentPurchases || []);
    } catch (error) {
      console.error('Failed to fetch token stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">トークン管理</h1>
      
      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">総売上</p>
                <p className="text-xl font-bold">¥{stats.revenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">販売トークン</p>
                <p className="text-xl font-bold">{stats.tokensSold.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">利益率</p>
                <p className="text-xl font-bold">{stats.profitMargin}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">アクティブユーザー</p>
                <p className="text-xl font-bold">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 最近の購入履歴 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">最近の購入履歴</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ユーザー</th>
                <th className="px-4 py-3 text-left">金額</th>
                <th className="px-4 py-3 text-left">トークン</th>
                <th className="px-4 py-3 text-left">購入日時</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((purchase, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-3">{purchase.userEmail}</td>
                  <td className="px-4 py-3">¥{purchase.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">{purchase.tokens.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {new Date(purchase.date).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

## 📊 動作確認とテスト

### A. 開発環境でのテスト

**1. 環境変数設定確認**

```bash
# backend/.env の確認
echo $USD_TO_JPY_RATE
echo $GPT4_COST_PER_TOKEN_YEN
echo $PROFIT_MARGIN
```

**2. Webhook動作テスト**

```bash
# テスト用エンドポイントで動作確認
curl http://localhost:3001/webhooks/test

# トークン付与テスト
curl -X POST http://localhost:3001/webhooks/test-grant \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","purchaseAmountYen":1000}'
```

**3. フロントエンド統合テスト**

```bash
# フロントエンド開発サーバー起動
npm run dev

# ブラウザで確認
# http://localhost:3000/tokens - 購入ページ
# http://localhost:3000/admin/tokens - 管理画面
```

### B. 本番環境デプロイ前チェック

**1. 設定検証**

```javascript
// backend/config/pricing.js の validatePricingConfig() で確認
const { validatePricingConfig } = require('./config/pricing');
const validation = validatePricingConfig();
console.log('設定検証結果:', validation);
```

**2. Stripe本番キー設定**

```env
# 本番環境用
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🎯 完成後の機能概要

### ✅ 自動50%利益保証システム
- 購入金額の50%は確実にプラットフォーム利益として確保
- 残り50%でGPT-4トークンを最大限提供
- 為替レート変動に対応した動的価格調整

### ✅ シンプルなトークン管理
- 複雑な金額計算を排除
- トークン数のみでの一元管理
- FIFO方式での公平な消費順序

### ✅ 完全自動化されたStripe統合
- 決済完了時の自動トークン付与
- 重複処理防止
- エラー時の自動リトライ対応

### ✅ 管理者向け統計・監視機能
- リアルタイム売上・利益率監視
- ユーザー購入行動分析
- システム健全性の確認

この実装により、**運用管理が簡単で利益を確実に確保できる堅牢なトークンシステム**が完成しました。