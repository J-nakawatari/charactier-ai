import { test, expect } from '@playwright/test';

test.describe('charactermanagement - characterlist', () => {
  // 繝｢繝舌う繝ｫ繝・ヰ繧､繧ｹ縺ｧ縺ｯ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・判髱｢縺ｮ繝・せ繝医ｒ繧ｹ繧ｭ繝・・
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    const isMobile = testInfo.project.name.toLowerCase().includes('mobile');
    if (isMobile) {
      testInfo.skip(true, '繝｢繝舌う繝ｫ繝薙Η繝ｼ縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・判髱｢縺ｯ蠕後〒逕ｻ髱｢讒区・繧定ｦ狗峩縺吝ｿ・ｦ√′縺ゅｋ縺溘ａ縲∫樟蝨ｨ縺ｯ繧ｹ繧ｭ繝・・縺励∪縺・);
    }
  });
  test('蜈ｨ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ陦ｨ遉ｺ', async ({ page }) => {
    // 繝壹・繧ｸ縺ｫ遘ｻ蜍・
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // 繝壹・繧ｸ縺梧ｭ｣蟶ｸ縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後◆縺薙→繧堤｢ｺ隱・
    await expect(page.locator('body')).toBeVisible();
    
    // TODO: 螳滄圀縺ｮ繝・せ繝医Ο繧ｸ繝・け繧貞ｮ溯｣・
    // 縺薙・繝・せ繝医・蝓ｺ譛ｬ逧・↑蜍穂ｽ懃｢ｺ隱阪・縺ｿ陦後＞縺ｾ縺・
  });
});

