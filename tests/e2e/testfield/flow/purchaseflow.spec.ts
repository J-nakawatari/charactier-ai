import { test, expect } from '@playwright/test';

test.describe('flow - purchaseflow', () => {
  test('繝医・繧ｯ繝ｳ雉ｼ蜈･ 竊・谿矩ｫ倡｢ｺ隱・竊・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ雉ｼ蜈･ 竊・繝√Ε繝・ヨ蛻ｩ逕ｨ', async ({ page }) => {
    // 繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    
    // 繝壹・繧ｸ縺梧ｭ｣蟶ｸ縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後◆縺薙→繧堤｢ｺ隱・
    await expect(page.locator('body')).toBeVisible();
    
    // TODO: 螳滄圀縺ｮ繝・せ繝医Ο繧ｸ繝・け繧貞ｮ溯｣・
    // 縺薙・繝・せ繝医・蝓ｺ譛ｬ逧・↑蜍穂ｽ懃｢ｺ隱阪・縺ｿ陦後＞縺ｾ縺・
  });
});

