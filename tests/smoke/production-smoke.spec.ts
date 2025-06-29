import { test, expect } from '@playwright/test';

// 本番環境の基本的な動作確認のみを行う軽量なテスト
test.describe('Production Smoke Tests', () => {
  const baseUrl = process.env.PRODUCTION_URL || 'https://charactier-ai.com';

  test('トップページが表示される', async ({ page }) => {
    await page.goto(baseUrl);
    await expect(page).toHaveTitle(/Charactier AI/);
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
  });

  test('ログインページにアクセスできる', async ({ page }) => {
    await page.goto(`${baseUrl}/ja/auth/login`);
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    // 実際のログインは行わない（本番データに影響しないため）
  });

  test('キャラクター一覧が表示される', async ({ page }) => {
    await page.goto(`${baseUrl}/ja/characters`);
    await expect(page.getByRole('heading', { name: 'キャラクター' })).toBeVisible();
    // キャラクターが少なくとも1つ表示されることを確認
    await expect(page.locator('.character-card').first()).toBeVisible();
  });

  test('APIヘルスチェック', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/v1/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});