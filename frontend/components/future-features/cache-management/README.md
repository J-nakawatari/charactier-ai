# キャッシュ管理機能

## 概要
キャラクタープロンプトのキャッシュシステムを管理するための管理画面です。

## 機能
- キャッシュパフォーマンス監視（ヒット率、メモリ使用量等）
- キャラクター別キャッシュ統計
- 手動キャッシュクリーンアップ
- リアルタイム分析ダッシュボード

## 実装が必要なAPI
- `GET /api/admin/cache/performance` - キャッシュパフォーマンス統計
- `GET /api/admin/cache/invalidation-stats` - 無効化統計
- `POST /api/admin/cache/cleanup` - キャッシュクリーンアップ
- `DELETE /api/admin/cache/character/:id` - キャラクター別キャッシュ無効化

## 再有効化方法
1. この`cache-management`フォルダを`app/admin/cache`に移動
2. `CacheAnalyticsDashboard.tsx`を`components/admin/`に移動
3. 必要なAPIエンドポイントを実装
4. 管理画面のナビゲーションに追加

## 推定実装工数
- 基本機能: 3-5日
- 完全機能: 1-2週間

## 優先度
- 低（パフォーマンス最適化用、必須ではない）