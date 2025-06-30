# ビジネスクリティカルなE2Eテスト

## 最優先で作成すべきテスト（収益に直結）

### 1. 新規ユーザー獲得フロー
```typescript
// tests/e2e/critical/new-user-complete-flow.spec.ts
test('New user complete flow', async ({ page }) => {
  // 1. 会員登録
  // 2. メール認証
  // 3. 初回ボーナス10,000トークン確認
  // 4. キャラクター選択
  // 5. 初回チャット
});
```

### 2. トークン購入フロー
```typescript
// tests/e2e/critical/token-purchase-flow.spec.ts
test('Token purchase complete flow', async ({ page }) => {
  // 1. ログイン
  // 2. トークン購入ページ
  // 3. Stripe決済
  // 4. トークン付与確認
  // 5. 99%利益率の確認
});
```

### 3. キャラクター購入フロー
```typescript
// tests/e2e/critical/character-purchase-flow.spec.ts
test('Character purchase complete flow', async ({ page }) => {
  // 1. 未購入キャラクター選択
  // 2. 購入ボタンクリック
  // 3. Stripe決済
  // 4. キャラクターアンロック確認
  // 5. チャット可能確認
});
```

### 4. チャットと親密度システム
```typescript
// tests/e2e/critical/chat-affinity-flow.spec.ts
test('Chat and affinity system', async ({ page }) => {
  // 1. チャット開始
  // 2. メッセージ送信
  // 3. トークン消費確認
  // 4. 親密度上昇確認
  // 5. レベル10で画像アンロック確認
});
```

## 不要なテストファイルの削除

以下のファイルは削除推奨：
- tests/e2e/admin/charactermanagement/character-*.spec.ts (19個)
- tests/e2e/admin/debug-*.spec.ts
- tests/e2e/admin/simple-*.spec.ts
- tests/e2e/admin/working-*.spec.ts
- tests/e2e/admin/stable-*.spec.ts