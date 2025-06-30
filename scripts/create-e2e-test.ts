#!/usr/bin/env tsx
import { writeUtf8 } from './_shared/fs';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';

interface TestConfig {
  path: string;
  name: string;
  content: string;
}

// 基本的な認証テスト
const authTests: TestConfig[] = [
  {
    path: 'tests/e2e/user/auth/login.spec.ts',
    name: 'ログインテスト',
    content: `import { test, expect } from '@playwright/test';

test.describe('ユーザーログイン', () => {
  test('正しい認証情報でログイン成功', async ({ page }) => {
    // テスト用ユーザーでログイン
    await page.goto('/ja/login');
    
    // フォームに入力
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    
    // ログインボタンをクリック
    await page.getByRole('button', { name: 'ログインする' }).click();
    
    // ダッシュボードへのリダイレクトを確認
    await expect(page).toHaveURL(/\\/dashboard/);
    
    // ユーザー名が表示されることを確認
    await expect(page.getByText('テストユーザー')).toBeVisible();
  });

  test('誤った認証情報でエラー表示', async ({ page }) => {
    await page.goto('/ja/login');
    
    await page.getByLabel('メールアドレス').fill('wrong@example.com');
    await page.getByLabel('パスワード').fill('wrong');
    
    await page.getByRole('button', { name: 'ログインする' }).click();
    
    // エラーメッセージを確認
    await expect(page.getByText(/認証に失敗しました|メールアドレスまたはパスワードが正しくありません/)).toBeVisible();
  });
});`
  },
  {
    path: 'tests/e2e/user/auth/register.spec.ts',
    name: '新規登録テスト',
    content: `import { test, expect } from '@playwright/test';

test.describe('新規会員登録', () => {
  test('新規登録フォームの表示と入力', async ({ page }) => {
    const uniqueEmail = \`test_\${Date.now()}_\${Math.random().toString(36).substring(2, 15)}@example.com\`;
    const password = 'TestPass123!';
    
    // 登録ページへ
    await page.goto('/ja/register');
    
    // フォームに入力
    await page.getByLabel('メールアドレス').fill(uniqueEmail);
    await page.getByLabel('パスワード', { exact: true }).fill(password);
    await page.getByLabel('パスワード確認').fill(password);
    
    // 利用規約に同意して登録
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    
    // 登録完了メッセージまたはメール確認画面を確認
    await expect(page.getByText(/登録が完了しました|確認メールを送信しました/)).toBeVisible({ timeout: 10000 });
  });

  test('パスワード不一致でエラー', async ({ page }) => {
    await page.goto('/ja/register');
    
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード', { exact: true }).fill('Password123!');
    await page.getByLabel('パスワード確認').fill('Different123!');
    
    await page.getByRole('button', { name: '利用規約に同意して登録する' }).click();
    
    // エラーメッセージを確認
    await expect(page.getByText('パスワードが一致しません')).toBeVisible();
  });
});`
  }
];

// トークン購入テスト
const tokenTests: TestConfig[] = [
  {
    path: 'tests/e2e/user/tokens/purchase.spec.ts',
    name: 'トークン購入テスト',
    content: `import { test, expect } from '@playwright/test';

test.describe('トークン購入', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/ja/login');
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    await page.getByRole('button', { name: 'ログインする' }).click();
    await page.waitForURL(/\\/dashboard/);
  });

  test('トークンパック一覧の表示', async ({ page }) => {
    await page.goto('/ja/tokens/purchase');
    
    // トークンパックが表示されることを確認
    await expect(page.getByText('1,000トークン')).toBeVisible();
    await expect(page.getByText('5,000トークン')).toBeVisible();
    await expect(page.getByText('10,000トークン')).toBeVisible();
    
    // 価格が表示されることを確認
    await expect(page.getByText(/¥\\d+/)).toBeVisible();
  });

  test('トークンパックの選択', async ({ page }) => {
    await page.goto('/ja/tokens/purchase');
    
    // 最初のトークンパックを選択
    await page.locator('.token-pack-card').first().click();
    
    // 購入ボタンが表示されることを確認
    await expect(page.getByRole('button', { name: /購入|決済へ進む/ })).toBeVisible();
  });
});`
  }
];

// チャット機能テスト
const chatTests: TestConfig[] = [
  {
    path: 'tests/e2e/user/chat/basic.spec.ts',
    name: '基本的なチャット機能テスト',
    content: `import { test, expect } from '@playwright/test';

test.describe('チャット機能', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/ja/login');
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    await page.getByRole('button', { name: 'ログインする' }).click();
    await page.waitForURL(/\\/dashboard/);
  });

  test('キャラクターとのチャット開始', async ({ page }) => {
    // キャラクター一覧へ
    await page.goto('/ja/characters');
    
    // 無料キャラクターを選択
    await page.getByText('無料テストキャラクター').click();
    
    // チャット開始ボタンをクリック
    await page.getByRole('button', { name: /チャットを開始|話す/ }).click();
    
    // チャット画面が表示されることを確認
    await expect(page).toHaveURL(/\\/chat\\//);
    
    // 入力欄が表示されることを確認
    await expect(page.getByPlaceholder(/メッセージを入力|話しかけてみよう/)).toBeVisible();
  });

  test('メッセージの送信', async ({ page }) => {
    // 無料キャラクターのチャット画面へ直接遷移
    await page.goto('/ja/chat/free-test-character');
    
    // メッセージを入力
    const messageInput = page.getByPlaceholder(/メッセージを入力|話しかけてみよう/);
    await messageInput.fill('こんにちは！');
    
    // 送信ボタンをクリック
    await page.getByRole('button', { name: /送信|Send/ }).click();
    
    // メッセージが表示されることを確認
    await expect(page.getByText('こんにちは！')).toBeVisible();
    
    // 返信を待つ（AIの応答には時間がかかる）
    await page.waitForTimeout(5000);
    
    // キャラクターからの返信があることを確認
    const messages = page.locator('.message-bubble');
    await expect(messages).toHaveCount(2); // ユーザーとキャラクターのメッセージ
  });
});`
  }
];

// キャラクター関連テスト
const characterTests: TestConfig[] = [
  {
    path: 'tests/e2e/user/characters/list.spec.ts',
    name: 'キャラクター一覧テスト',
    content: `import { test, expect } from '@playwright/test';

test.describe('キャラクター一覧', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/ja/login');
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    await page.getByRole('button', { name: 'ログインする' }).click();
    await page.waitForURL(/\\/dashboard/);
  });

  test('キャラクター一覧の表示', async ({ page }) => {
    await page.goto('/ja/characters');
    
    // キャラクターカードが表示されることを確認
    await expect(page.locator('.character-card').first()).toBeVisible();
    
    // 無料キャラクターと有料キャラクターが存在することを確認
    await expect(page.getByText('無料')).toBeVisible();
    await expect(page.getByText(/\\d+トークン/)).toBeVisible();
  });

  test('キャラクターの検索', async ({ page }) => {
    await page.goto('/ja/characters');
    
    // 検索ボックスに入力
    const searchBox = page.getByPlaceholder('キャラクターを検索');
    await searchBox.fill('テスト');
    
    // 検索結果が更新されることを確認
    await page.waitForTimeout(500); // デバウンス待ち
    
    // テストキャラクターが表示されることを確認
    await expect(page.getByText('テストキャラクター')).toBeVisible();
  });
});`
  }
];

// テストファイルを作成
async function createTests() {
  const allTests = [...authTests, ...characterTests, ...tokenTests, ...chatTests];
  
  for (const test of allTests) {
    const fullPath = join(process.cwd(), test.path);
    const dir = dirname(fullPath);
    
    // ディレクトリを作成
    mkdirSync(dir, { recursive: true });
    
    // UTF-8でファイルを書き込み
    writeUtf8(fullPath, test.content);
    console.log(`✅ Created: ${test.path} - ${test.name}`);
  }
  
  console.log(`\n🎉 ${allTests.length} test files created successfully!`);
}

// 実行
createTests().catch(console.error);