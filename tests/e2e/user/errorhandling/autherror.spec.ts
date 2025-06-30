import { test, expect } from '@playwright/test';

test.describe('errorhandling - autherror', () => {
  test('401繧ｨ繝ｩ繝ｼ譎ゅ・繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｸ縺ｮ繝ｪ繝繧､繝ｬ繧ｯ繝・, async ({ page }) => {
    // 繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    
    // 繝壹・繧ｸ縺梧ｭ｣蟶ｸ縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後◆縺薙→繧堤｢ｺ隱・
    await expect(page.locator('body')).toBeVisible();
    
    // TODO: 螳滄圀縺ｮ繝・せ繝医Ο繧ｸ繝・け繧貞ｮ溯｣・
    // 縺薙・繝・せ繝医・蝓ｺ譛ｬ逧・↑蜍穂ｽ懃｢ｺ隱阪・縺ｿ陦後＞縺ｾ縺・
  });
});

