# 📋 ユーザーホーム画面（マイページ）実装計画書

## 🔍 既存コードベース分析結果

**✅ 利用可能な既存機能**
- ユーザー認証システム（JWT）
- トークン管理（UserTokenPack、TokenUsage）
- キャラクター選択・親密度システム（User.affinities）
- レスポンシブUI（Tailwind CSS）
- 多言語対応（next-intl）
- UserSidebar（ナビゲーション）

**🚧 実装が必要な機能**
- ユーザーダッシュボードAPI
- 親密度UI表示コンポーネント
- アンロック・バッジシステム
- チャット履歴管理
- グラフ可視化

## 🛠 API設計：`GET /api/user/dashboard`

```typescript
interface DashboardResponse {
  // ユーザー基本情報
  user: {
    _id: string;
    name: string;
    email: string;
    createdAt: Date;
    lastLoginAt: Date;
  };
  
  // トークン残高・統計
  tokens: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    recentUsage: Array<{
      date: string;
      amount: number;
    }>;
  };
  
  // 親密度・キャラクター関係
  affinities: Array<{
    character: {
      _id: string;
      name: LocalizedString;
      imageCharacterSelect: string;
      themeColor: string; // グラフ表示用テーマカラー
    };
    level: number;
    experience: number;
    experienceToNext: number;
    maxExperience: number;
    unlockedImages: string[];
    nextUnlockLevel: number;
  }>;
  
  // 最近のチャット履歴（最新3件）
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
  
  // 購入履歴サマリ
  purchaseHistory: Array<{
    type: 'token' | 'character';
    amount: number;
    date: Date;
    details: string;
  }>;
  
  // ログイン履歴（最新10件に制限）
  loginHistory: Array<{
    date: Date;
    platform: 'web' | 'mobile';
    ipAddress: string;
  }>;
  
  // お知らせ
  notifications: Array<{
    _id: string;
    title: LocalizedString;
    message: LocalizedString;
    type: 'info' | 'warning' | 'success';
    isRead: boolean;
    createdAt: Date;
  }>;
  
  // バッジ・実績
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
  
  // 統計データ（グラフ用）
  analytics: {
    chatCountPerDay: Array<{ date: string; count: number }>;
    tokenUsagePerDay: Array<{ date: string; amount: number }>;
    affinityProgress: Array<{ 
      characterName: string; 
      level: number; 
      color: string; // Character.themeColorから取得
    }>;
  };
}
```

## 🛠 追加API設計

### お知らせ既読管理
```typescript
// POST /api/user/notifications/:id/read
interface ReadNotificationRequest {
  // リクエストボディは不要（認証済みユーザーIDと:idパラメータで処理）
}

interface ReadNotificationResponse {
  success: boolean;
  notificationId: string;
  readAt: Date;
}

// PUT /api/user/notifications/read-all - 一括既読
interface ReadAllNotificationsResponse {
  success: boolean;
  readCount: number;
  readAt: Date;
}
```

## 🧩 フロントエンドコンポーネント設計

### 1. メインページ構成
```
app/[locale]/dashboard/page.tsx
├── <UserDashboard />
    ├── <NotificationSection />
    ├── <AffinitySection />
    ├── <TokenStatusCard />
    ├── <RecentChatHistory />
    ├── <PurchaseHistorySummary />
    ├── <BadgeGallery />
    └── <AnalyticsCharts />
```

### 2. 重要コンポーネント詳細

#### `<AffinitySection />` - 親密度表示
```typescript
interface AffinityCardProps {
  character: {
    name: LocalizedString;
    imageUrl: string;
  };
  level: number;
  experience: number;
  experienceToNext: number;
  unlockedImages: string[];
  nextUnlockLevel: number;
}
```

#### `<BadgeGallery />` - アンロック報酬
```typescript
interface BadgeProps {
  name: LocalizedString;
  description: LocalizedString;
  iconUrl: string;
  isUnlocked: boolean;
  progress?: number;
  maxProgress?: number;
}
```

#### `<TokenStatusCard />` - トークン表示
```typescript
interface TokenStatusProps {
  balance: number;
  recentUsage: Array<{ date: string; amount: number }>;
  totalPurchased: number;
}
```

#### `<RecentChatHistory />` - 最近のチャット
```typescript
interface RecentChatProps {
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
  onChatClick: (chatId: string, characterId: string) => void;
}
```

## 📊 データフロー設計

### 1. バックエンド実装順序
1. **Character Model拡張** - `themeColor`フィールド追加
2. **Notification Model** - お知らせ管理
3. **Badge Model** - バッジ・実績システム  
4. **Chat Model拡張** - ダッシュボード用クエリ最適化
5. **Dashboard API Route** - `/api/user/dashboard`
6. **Notification API Routes** - 既読管理API
7. **Analytics Helper** - 統計データ生成

### 2. フロントエンド実装順序
1. **Dashboard Page** - `/app/[locale]/dashboard/page.tsx`
2. **Core Components** - 親密度・トークン・チャット履歴表示
3. **Notification Components** - お知らせ表示・既読機能
4. **Advanced Components** - バッジ・グラフ
5. **Animation & Polish** - ロック解除演出

## 🔓 アンロック・ロック解除演出

### 親密度レベルアップ演出
```typescript
// 10レベルごとにイラスト解放
const UNLOCK_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// 演出トリガー
const showUnlockAnimation = (level: number, characterName: string) => {
  if (UNLOCK_LEVELS.includes(level)) {
    // パーティクル + モーダル表示
    showUnlockModal({
      title: `${characterName} Lv.${level} 達成！`,
      reward: '新しいイラストが解放されました',
      imageUrl: `/characters/${characterId}/unlock_${level}.png`
    });
  }
};
```

## 🚀 実装工程（推定4-6日）

### フェーズ1: バックエンド基盤（2日）
- [ ] Character Model に `themeColor` フィールド追加
- [ ] Notification・Badge モデル作成
- [ ] Chat Model のダッシュボード用クエリ最適化
- [ ] Dashboard API実装（`recentChats`、`loginHistory`制限含む）
- [ ] Notification既読API実装
- [ ] 統計データ生成機能
- [ ] テストデータ投入

### フェーズ2: フロントエンド基礎（2日）  
- [ ] Dashboard Page作成
- [ ] AffinitySection実装
- [ ] TokenStatusCard実装
- [ ] RecentChatHistory実装
- [ ] NotificationSection実装（既読機能含む）
- [ ] レスポンシブ対応確認

### フェーズ3: 高度機能（1-2日）
- [ ] BadgeGallery実装
- [ ] グラフ表示（recharts、`themeColor`適用）
- [ ] アンロック演出実装
- [ ] 多言語対応完了

## 📱 レスポンシブ対応方針

```css
/* Mobile First Design */
.dashboard-grid {
  @apply grid grid-cols-1 gap-4;
}

@media (md) {
  .dashboard-grid {
    @apply grid-cols-2;
  }
}

@media (lg) {
  .dashboard-grid {
    @apply grid-cols-3;
  }
}
```

## 🧪 品質保証・テスト計画

### 1. 単体テスト
- API エンドポイントテスト（Dashboard、Notification既読）
- コンポーネントレンダリングテスト
- 親密度計算ロジックテスト
- データ制限機能テスト（ログイン履歴10件、チャット履歴3件）

### 2. 統合テスト  
- ダッシュボードデータ取得フロー
- お知らせ既読・一括既読フロー
- アンロック演出トリガー
- グラフカラー表示確認（`themeColor`適用）
- マルチデバイス表示確認

### 3. パフォーマンステスト
- 大量データでのレスポンス時間測定
- ログイン履歴・チャット履歴制限の効果確認

---

**📝 実装の要点：**
- 既存のTokenUsage、UserTokenPack、親密度システムを最大活用
- データ制限によるパフォーマンス最適化（ログイン履歴10件、チャット履歴3件）
- Character.themeColorによる一貫性のあるカラーテーマ
- お知らせ既読管理による適切なユーザー体験
- マネタイズ重視のUX設計（進行バー、アンロック演出）
- Mobile Firstレスポンシブ対応
- 既存i18n構造に準拠した多言語対応

## 🎯 目的達成のためのUX設計

### 課金促進要素
1. **トークン残高の可視化** - 残量バーで「もうすぐなくなる」感を演出
2. **親密度進行バー** - 「あと少しでレベルアップ」を強調
3. **ロック中報酬のぼかし表示** - 「欲しくさせる」ギャラリーUI
4. **使用統計グラフ** - どれだけ楽しんでいるかを数値で実感

### エンゲージメント向上要素
1. **ログイン連続記録** - デイリーログインボーナス的な要素
2. **最近のチャット履歴** - 「続きが気になる」状況作り
3. **バッジコレクション** - 達成感とコンプリート欲求
4. **キャラクター感情状態** - 「心配している」状況で再訪促進

### 技術的配慮
1. **パフォーマンス最適化** - 大量データの効率的な表示
2. **リアルタイム更新** - WebSocketまたはポーリングでの状態同期
3. **オフライン対応** - ネットワーク不安定時の配慮
4. **アクセシビリティ** - スクリーンリーダー対応