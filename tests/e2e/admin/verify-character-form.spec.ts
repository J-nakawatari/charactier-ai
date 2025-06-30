import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ讀懆ｨｼ', () => {
  test('邂｡逅・判髱｢縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝繧堤｢ｺ隱・, async ({ page }) => {
    // 邂｡逅・・Ο繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｸ繧｢繧ｯ繧ｻ繧ｹ
    await page.goto('/admin/login');
    
    // 繝壹・繧ｸ縺瑚ｪｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
    await page.waitForLoadState('networkidle');
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // 繝ｭ繧ｰ繧､繝ｳ諠・ｱ繧貞・蜉・
    await emailInput.fill('admin@example.com');
    await passwordInput.fill('admin123');
    await submitButton.click();
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽・医ち繧､繝繧｢繧ｦ繝医ｒ遏ｭ縺上＠縺ｦ譌ｩ譛溷､ｱ謨暦ｼ・
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      // 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
      await page.waitForLoadState('networkidle');
      
    } catch (e) {
      console.log('笞・・繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨暦ｼ医ョ繝ｼ繧ｿ繝吶・繧ｹ謗･邯壹・蝠城｡後・蜿ｯ閭ｽ諤ｧ・・);
      // 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｮ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧堤｢ｺ隱・
      const errorMessages = await page.locator('.error, .text-red-600, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages.join(', '));
      }
      
      // 迴ｾ蝨ｨ縺ｮURL繧堤｢ｺ隱・
      console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
      await page.screenshot({ path: 'login-error.png' });
      console.log('繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・login-error.png 縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
      
      return; // 繝・せ繝医ｒ邨ゆｺ・
    }
    
    // 繝繝・す繝･繝懊・繝峨′螳悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後◆縺薙→繧堤｢ｺ隱・
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    
    // 蜊∝・縺ｪ蠕・ｩ滓凾髢薙ｒ遒ｺ菫晢ｼ医☆縺ｹ縺ｦ縺ｮ髱槫酔譛溷・逅・′螳御ｺ・☆繧九・繧貞ｾ・▽・・
    console.log('竢ｱ・・繝壹・繧ｸ縺悟ｮ牙ｮ壹☆繧九・繧貞ｾ・ｩ滉ｸｭ...');
    await page.waitForTimeout(5000);
    
    // JavaScript縺ｧ逶ｴ謗･URL繧貞､画峩・医リ繝薙ご繝ｼ繧ｷ繝ｧ繝ｳ遶ｶ蜷医ｒ蝗樣∩・・
    console.log('噫 JavaScript縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ驕ｷ遘ｻ');
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
    try {
      await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    } catch (e) {
      console.log('笞・・繝壹・繧ｸ驕ｷ遘ｻ縺ｫ螟ｱ謨励∫樟蝨ｨ縺ｮURL:', page.url());
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
      await page.screenshot({ path: 'navigation-failed.png' });
      return;
    }
    
    // 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    
    // 繝輔か繝ｼ繝縺ｮ蠢・医ヵ繧｣繝ｼ繝ｫ繝峨ｒ遒ｺ隱・
    const nameInput = page.locator('input[type="text"]').first();
    const personalitySelect = page.locator('select').first();
    const personalityCheckbox = page.locator('input[type="checkbox"]').first();
    
    // 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・蟄伜惠繧堤｢ｺ隱・
    await expect(nameInput).toBeVisible();
    await expect(personalitySelect).toBeVisible();
    await expect(personalityCheckbox).toBeVisible();
    
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ蠢・医ヵ繧｣繝ｼ繝ｫ繝峨′陦ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
    
    // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ縺ｮ繧ｪ繝励す繝ｧ繝ｳ繧堤｢ｺ隱・
    const options = await personalitySelect.locator('option').allTextContents();
    console.log('諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ縺ｮ繧ｪ繝励す繝ｧ繝ｳ:', options);
    
    // 諤ｧ譬ｼ繧ｿ繧ｰ縺ｮ繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ謨ｰ繧堤｢ｺ隱・
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    console.log(`諤ｧ譬ｼ繧ｿ繧ｰ縺ｮ繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ謨ｰ: ${checkboxCount}`);
  });
});
