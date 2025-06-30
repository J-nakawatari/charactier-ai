import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・- 蜍穂ｽ懃｢ｺ隱・, () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('邂｡逅・判髱｢縺ｫ繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪ｋ縺薙→繧堤｢ｺ隱・, async ({ page }) => {
    // 1. 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ
    await page.goto('http://localhost:3001/admin/login');
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ');
    
    // 2. 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧呈聴繧具ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
    await page.screenshot({ path: 'login-page.png' });
    
    // 3. 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
    
    // 4. 繝ｭ繧ｰ繧､繝ｳ
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // 5. 繝繝・す繝･繝懊・繝峨↓驕ｷ遘ｻ縺吶ｋ縺薙→繧堤｢ｺ隱・
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('笨・繝繝・す繝･繝懊・繝峨↓繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      // 6. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ
      await page.goto('http://localhost:3001/admin/characters');
      await page.waitForLoadState('networkidle');
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ');
      
      // 7. 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧堤｢ｺ隱・
      const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")');
      if (await newButton.isVisible()) {
        console.log('笨・譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆');
      }
    } catch (error) {
      console.error('笶・繝ｭ繧ｰ繧､繝ｳ縺ｾ縺溘・繝壹・繧ｸ驕ｷ遘ｻ縺ｫ螟ｱ謨・', error);
      await page.screenshot({ path: 'error-state.png' });
    }
  });
});
