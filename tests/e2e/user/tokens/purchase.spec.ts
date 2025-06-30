import { test, expect } from '@playwright/test';

test.describe('トークン購入', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/ja/login');
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    await page.getByRole('button', { name: 'ログインする' }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('トークンパック一覧の表示', async ({ page }) => {
    await page.goto('/ja/tokens/purchase');
    
    // トークンパックが表示されることを確認
    await expect(page.getByText('1,000トークン')).toBeVisible();
    await expect(page.getByText('5,000トークン')).toBeVisible();
    await expect(page.getByText('10,000トークン')).toBeVisible();
    
    // 価格が表示されることを確認
    await expect(page.getByText(/¥\d+/)).toBeVisible();
  });

  test('トークンパックの選択', async ({ page }) => {
    await page.goto('/ja/tokens/purchase');
    
    // 最初のトークンパックを選択
    await page.locator('.token-pack-card').first().click();
    
    // 購入ボタンが表示されることを確認
    await expect(page.getByRole('button', { name: /購入|決済へ進む/ })).toBeVisible();
  });
});