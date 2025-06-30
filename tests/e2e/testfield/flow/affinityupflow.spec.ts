import { test, expect } from '@playwright/test';

test.describe('flow - affinityupflow', () => {
  test('繝√Ε繝・ヨ 竊・繝ｬ繝吶Ν繧｢繝・・ 竊・逕ｻ蜒上い繝ｳ繝ｭ繝・け 竊・繝ｩ繧､繝悶Λ繝ｪ縺ｧ遒ｺ隱・, async ({ page }) => {
    // 繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/ja');
    await page.waitForLoadState('networkidle');
    
    // 繝壹・繧ｸ縺梧ｭ｣蟶ｸ縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後◆縺薙→繧堤｢ｺ隱・
    await expect(page.locator('body')).toBeVisible();
    
    // TODO: 螳滄圀縺ｮ繝・せ繝医Ο繧ｸ繝・け繧貞ｮ溯｣・
    // 縺薙・繝・せ繝医・蝓ｺ譛ｬ逧・↑蜍穂ｽ懃｢ｺ隱阪・縺ｿ陦後＞縺ｾ縺・
  });
});

