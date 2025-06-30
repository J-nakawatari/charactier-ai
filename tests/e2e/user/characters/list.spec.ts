import { test, expect } from '@playwright/test';

test.describe('キャラクター一覧', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/ja/login');
    await page.getByLabel('メールアドレス').fill('global-test@example.com');
    await page.getByLabel('パスワード').fill('Test123!');
    await page.getByRole('button', { name: 'ログインする' }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('キャラクター一覧の表示', async ({ page }) => {
    await page.goto('/ja/characters');
    
    // キャラクターカードが表示されることを確認
    await expect(page.locator('.character-card').first()).toBeVisible();
    
    // 無料キャラクターと有料キャラクターが存在することを確認
    await expect(page.getByText('無料')).toBeVisible();
    await expect(page.getByText(/\d+トークン/)).toBeVisible();
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
});