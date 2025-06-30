import { test, expect } from '@playwright/test';

test.describe('繝・ヰ繝・げ繝・せ繝・, () => {
  test('繝悶Λ繧ｦ繧ｶ襍ｷ蜍慕｢ｺ隱・, async ({ page }) => {
    console.log('繝・せ繝磯幕蟋・);
    
    try {
      // 繧ｷ繝ｳ繝励Ν縺ｪ繝壹・繧ｸ繧｢繧ｯ繧ｻ繧ｹ
      await page.goto('http://localhost:3001/admin/login');
      console.log('繝壹・繧ｸ繧｢繧ｯ繧ｻ繧ｹ謌仙粥');
      
      // 繧ｿ繧､繝医Ν蜿門ｾ・
      const title = await page.title();
      console.log('繝壹・繧ｸ繧ｿ繧､繝医Ν:', title);
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・);
      
      expect(title).toBeTruthy();
    } catch (error) {
      console.error('繧ｨ繝ｩ繝ｼ逋ｺ逕・', error);
      throw error;
    }
  });
});
