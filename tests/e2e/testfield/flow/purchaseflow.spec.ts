import { test, expect } from '@playwright/test';

test.describe('flow - purchaseflow', () => {
  test('ト�Eクン購入 ↁE残高確誁EↁEキャラクター購入 ↁEチャチE��利用', async ({ page }) => {
    // ペ�Eジに移勁E
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    
    // ペ�Eジが正常に読み込まれたことを確誁E
    await expect(page.locator('body')).toBeVisible();
    
    // TODO: 実際のチE��トロジチE��を実裁E
    // こ�EチE��ト�E基本皁E��動作確認�Eみ行いまぁE
  });
});

