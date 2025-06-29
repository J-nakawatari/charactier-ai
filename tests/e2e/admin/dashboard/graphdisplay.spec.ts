import { test, expect } from '@playwright/test';

test.describe('dashboard - graphdisplay', () => {
  test('日別収益グラフ', async ({ page }) => {
    // ページに移動
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // ページが正常に読み込まれたことを確認
    await expect(page.locator('body')).toBeVisible();
    
    // TODO: 実際のテストロジックを実装
    // このテストは基本的な動作確認のみ行います
  });
});
