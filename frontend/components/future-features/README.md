# 🚀 将来実装予定の機能

このディレクトリには将来実装予定の機能コンポーネントが保存されています。

## 📁 保存されているコンポーネント

### EnhancedAnalyticsSection.tsx
- **説明**: AI駆動インサイト機能
- **機能**: パーソナライズされた分析、予測、推奨事項
- **実装状況**: UIのみ完成、バックエンドAPI未実装
- **実装難易度**: 高（AI/ML機能が必要）

### AchievementSystem.tsx
- **説明**: 実績システム
- **機能**: ユーザーの実績表示、マイルストーン管理
- **実装状況**: 未確認
- **実装難易度**: 中

## 📁 保存されているページ

### analytics/ ディレクトリ (app/[locale]/future-features/analytics/)
- **説明**: 詳細統計分析ページ群
- **内容**:
  - `tokens/page.tsx` - トークン使用分析
  - `chats/page.tsx` - チャット活動分析  
  - `affinity/page.tsx` - 親密度関係分析
- **実装状況**: UIのみ完成、バックエンドAPI未実装
- **実装難易度**: 中〜高（複雑な集計処理が必要）

### ダッシュボードの詳細統計リンク
- **説明**: 「詳細な統計を見る」セクション
- **場所**: `app/[locale]/dashboard/page.tsx` 内にコメントアウト
- **機能**: 上記分析ページへのナビゲーション
- **実装状況**: UIのみ完成
- **実装難易度**: 低（リンク機能のみ）

## 🔄 再有効化する方法

### 1. AI駆動インサイトの再有効化
```typescript
// frontend/app/[locale]/dashboard/page.tsx

// コメントアウトを解除
import EnhancedAnalyticsSection from '@/components/future-features/EnhancedAnalyticsSection';
import AchievementSystem from '@/components/future-features/AchievementSystem';

// JSX部分のコメントアウトを解除
<div className="md:col-span-2 lg:col-span-3">
  <EnhancedAnalyticsSection 
    userId={dashboardData.user._id}
  />
</div>
```

### 2. 詳細統計分析の再有効化
```bash
# 分析ページを元の場所に移動
mv app/[locale]/future-features/analytics app/[locale]/

# ダッシュボードの詳細統計リンクのコメントアウトを解除
# app/[locale]/dashboard/page.tsx の該当部分を修正
```

### 3. 必要なバックエンドAPI
```typescript
// AI駆動インサイト用
GET /api/user/enhanced-analytics
GET /api/user/achievements

// 詳細分析用
GET /api/analytics/tokens?range={timeRange}
GET /api/analytics/chats?range={timeRange} 
GET /api/analytics/affinity?timeRange={timeRange}&character={characterId}
```

## 📝 実装時の注意事項

- EnhancedAnalyticsSectionは現在モックデータを使用
- 実装時は実際のユーザーデータとの連携が必要
- AI機能の実装は段階的に行うことを推奨

## 💡 実装優先度

1. **優先度低**: EnhancedAnalyticsSection（AI機能が複雑）
2. **優先度中**: AchievementSystem（比較的シンプル）

---
*作成日: 2025-06-13*
*更新者: Claude*