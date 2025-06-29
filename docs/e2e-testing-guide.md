# E2Eテストガイド

このドキュメントでは、Charactier AIのE2E（End-to-End）テストの実行方法と管理方法について説明します。

## 目次

1. [概要](#概要)
2. [セットアップ](#セットアップ)
3. [テストの実行](#テストの実行)
4. [テストカテゴリ](#テストカテゴリ)
5. [トラブルシューティング](#トラブルシューティング)
6. [ベストプラクティス](#ベストプラクティス)

## 概要

Charactier AIのE2EテストはPlaywrightを使用して実装されており、アプリケーションの主要な機能を網羅的にテストします。

### テストフレームワーク
- **Playwright**: モダンなE2Eテストフレームワーク
- **TypeScript**: 型安全なテストコード
- **並列実行**: 高速なテスト実行

## セットアップ

### 1. 依存関係のインストール

```bash
# プロジェクトルートで実行
npm install

# Playwrightブラウザのインストール
npx playwright install
```

### 2. 環境変数の設定

`.env.test`ファイルをプロジェクトルートに作成し、以下の内容を設定：

```env
# MongoDB接続（テスト用）
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/charactier-test

# JWT設定
JWT_SECRET=your-test-jwt-secret
JWT_REFRESH_SECRET=your-test-jwt-refresh-secret

# 管理者認証
ADMIN_JWT_SECRET=your-test-admin-jwt-secret

# Stripe（テストキー）
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxx

# Redis
REDIS_URL=redis://localhost:6379

# テスト用管理者アカウント
TEST_ADMIN_EMAIL=admin-test@example.com
TEST_ADMIN_PASSWORD=Test123!
```

### 3. テストデータの準備

```bash
# テスト環境のセットアップ（必要に応じて）
npm run test:setup
```

## テストの実行

### 基本的な実行コマンド

```bash
# すべてのE2Eテストを実行（ヘッドレスモード）
npm run test:e2e

# ブラウザを表示しながら実行（デバッグに便利）
npm run test:e2e:headed

# デバッグモードで実行（ステップ実行可能）
npm run test:e2e:debug

# UIモードで実行（インタラクティブ）
npm run test:e2e:ui
```

### 特定のテストの実行

```bash
# 特定のファイルだけ実行
npx playwright test tests/e2e/admin/tokenmanagement/token-profit-system.spec.ts

# パターンマッチで実行
npx playwright test -g "99%利益"

# 特定のフォルダのテストだけ実行
npx playwright test tests/e2e/admin/
npx playwright test tests/e2e/user/

# 特定のプロジェクト（ブラウザ）で実行
npx playwright test --project=chromium
npx playwright test --project=firefox
```

### 並列実行の制御

```bash
# 並列実行を無効化（デバッグ時に便利）
npx playwright test --workers=1

# 特定の数のワーカーで実行
npx playwright test --workers=4
```

## テストカテゴリ

### 1. ビジネスロジックテスト

#### 99%利益確保システム (`token-profit-system.spec.ts`)
- トークンパック作成時の利益率計算検証
- 為替レート変動時の価格再計算
- Stripe Price IDの正確な登録と取得
- エッジケース（極小・大金額）の検証

#### プロンプトキャッシュシステム (`prompt-cache-system.spec.ts`)
- 初回チャット時のキャッシュ作成
- 親密度レベル変化時のキャッシュ無効化
- APIへのプロンプト送信検証
- 複数キャラクター間でのキャッシュ分離

### 2. 管理機能テスト

#### ユーザー管理 (`user-crud-operations.spec.ts`)
- ユーザー一覧表示と検索
- ユーザー編集（名前変更、情報更新）
- アカウント停止/再開
- ユーザー削除（確認ダイアログ含む）
- 詳細情報表示（トークン残高、購入履歴、親密度）
- 一括操作機能

#### キャラクター管理 (`character-crud-operations.spec.ts`)
- 新規キャラクター作成（日英対応、価格設定、AIモデル選択）
- 既存キャラクター編集（プロンプト更新、価格変更）
- キャラクター削除（確認ダイアログ含む）
- ステータス管理（公開/非公開切り替え）
- 画像管理（レベル別画像、アンロック条件）
- 一括操作、検索、フィルタリング

### 3. ユーザー機能テスト

#### 購入フロー (`character-purchase-complete.spec.ts`)
- 有料キャラクターの購入前後のボタン状態確認
- アンロック→チャット開始への変化
- トークン購入→キャラクター購入の完全フロー
- 購入済みキャラクターの状態確認
- 無料キャラクターは最初から「チャット開始」
- 画像のロック/アンロック状態
- 購入履歴の確認

#### 認証・アカウント管理
- 新規登録フロー
- ログイン（メール認証必須）
- パスワードリセット
- プロフィール更新

### 4. その他のテスト

- レート制限の動作確認
- エラーハンドリング
- 国際化（日英切り替え）
- レスポンシブデザイン

## トラブルシューティング

### よくある問題と解決方法

#### 1. ポート3000が使用中

```bash
# Windows
taskkill /F /IM node.exe

# Mac/Linux
killall node
# または
lsof -ti:3000 | xargs kill -9
```

#### 2. MongoDB接続エラー

```bash
# .env.testファイルの確認
cat .env.test | grep MONGODB_URI

# 接続テスト
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
```

#### 3. Playwrightブラウザが起動しない

```bash
# ブラウザの再インストール
npx playwright install --force

# 特定のブラウザのみインストール
npx playwright install chromium
```

#### 4. タイムアウトエラー

`playwright.config.ts`でタイムアウトを調整：

```typescript
export default defineConfig({
  timeout: 60000, // グローバルタイムアウト
  expect: {
    timeout: 10000 // アサーションタイムアウト
  },
  use: {
    actionTimeout: 15000, // アクションタイムアウト
    navigationTimeout: 30000, // ナビゲーションタイムアウト
  },
});
```

#### 5. テストが不安定（Flaky）

```bash
# リトライ回数を増やす
npx playwright test --retries=3

# ビデオ録画を有効にしてデバッグ
npx playwright test --video=on
```

## テスト結果の確認

### HTMLレポート

```bash
# テスト実行後、レポートを開く
npx playwright show-report

# レポートの場所
# ./playwright-report/index.html
```

### アーティファクト

テスト失敗時に以下が保存されます：
- スクリーンショット: `./test-results/*/screenshot.png`
- ビデオ: `./test-results/*/video.webm`
- トレース: `./test-results/*/trace.zip`

### トレースビューアー

```bash
# トレースファイルを開く
npx playwright show-trace test-results/*/trace.zip
```

## ベストプラクティス

### 1. テストの書き方

```typescript
// 良い例：明確で独立したテスト
test('ユーザーが有料キャラクターを購入すると、ボタンがチャット開始に変わる', async ({ page }) => {
  // Arrange: 前提条件
  await loginAsUser(page);
  
  // Act: 操作
  await purchaseCharacter(page, 'TestCharacter');
  
  // Assert: 検証
  await expect(page.locator('button')).toContainText('チャット開始');
});
```

### 2. セレクターの選び方

```typescript
// 推奨：データ属性やアクセシブルなセレクター
await page.locator('[data-testid="submit-button"]').click();
await page.getByRole('button', { name: '送信' }).click();

// 避ける：脆弱なセレクター
await page.locator('.btn-primary').click(); // クラス名は変更されやすい
```

### 3. 待機処理

```typescript
// 良い例：明示的な待機
await page.waitForLoadState('networkidle');
await expect(page.locator('.loading')).not.toBeVisible();

// 避ける：固定時間の待機
await page.waitForTimeout(5000); // 不安定でテストが遅くなる
```

### 4. テストデータの管理

```typescript
// テスト用のユーティリティ関数を作成
async function createTestUser(page: Page): Promise<string> {
  const email = `test-${Date.now()}@example.com`;
  // ユーザー作成ロジック
  return email;
}
```

### 5. 並列実行の考慮

```typescript
// テスト間でデータが競合しないように
test.describe('ユーザー管理', () => {
  let uniqueUserId: string;
  
  test.beforeEach(async () => {
    uniqueUserId = `user-${Date.now()}`;
  });
});
```

## CI/CD統合

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
```

### 本番環境へのスモークテスト

```bash
# 本番環境に対する軽量なテスト
npm run test:smoke
```

## メンテナンス

### 定期的なメンテナンスタスク

1. **月次**: Playwrightとブラウザの更新
   ```bash
   npm update @playwright/test
   npx playwright install
   ```

2. **週次**: テストの実行と失敗の調査
   ```bash
   npm run test:e2e -- --reporter=json > test-results.json
   ```

3. **日次**: CI/CDでの自動実行結果の確認

### テストカバレッジの向上

```bash
# カバレッジレポートの生成
npm run coverage:report
```

## 関連ドキュメント

- [Playwright公式ドキュメント](https://playwright.dev)
- [テストベストプラクティス](https://playwright.dev/docs/best-practices)
- [CI/CD設定ガイド](./ci-cd-guide.md)
- [開発環境セットアップ](./development-setup.md)