import { test, expect } from '@playwright/test';

test('蝓ｺ譛ｬ逧・↑蜍穂ｽ懃｢ｺ隱・, async ({ page }) => {
  // 繝医ャ繝励・繝ｼ繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ
  await page.goto('/');
  
  // 繝壹・繧ｸ縺瑚ｪｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
  await page.waitForLoadState('networkidle');
  
  // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧呈聴繧・
  await page.screenshot({ path: 'homepage.png' });
  
  // 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ遘ｻ蜍・
  await page.goto('/ja/login');
  await page.waitForLoadState('networkidle');
  
  // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧呈聴繧・
  await page.screenshot({ path: 'login-page.png' });
  
  // 繝壹・繧ｸ縺ｫ菴輔°陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
  const pageContent = await page.textContent('body');
  console.log('繝壹・繧ｸ蜀・ｮｹ:', pageContent);
  
  // 菴輔°縺励ｉ陦ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ縺薙→繧堤｢ｺ隱・
  expect(pageContent).toBeTruthy();
});
