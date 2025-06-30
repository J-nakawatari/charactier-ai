import { test, expect } from '@playwright/test';

test.describe('邂｡逅・判髱｢繝ｭ繧ｰ繧､繝ｳ繝・ヰ繝・げ', () => {
  test('繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｮ陦ｨ遉ｺ遒ｺ隱・, async ({ page }) => {
    console.log('1. /admin/login縺ｸ繧｢繧ｯ繧ｻ繧ｹ');
    await page.goto('/admin/login');
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧呈聴繧・
    await page.screenshot({ path: 'admin-login-page.png' });
    
    // 繝壹・繧ｸ縺ｮ繧ｿ繧､繝医Ν繧ФRL繧堤｢ｺ隱・
    console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
    console.log('繝壹・繧ｸ繧ｿ繧､繝医Ν:', await page.title());
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('繝｡繝ｼ繝ｫ蜈･蜉帶ｬ・', await emailInput.isVisible());
    console.log('繝代せ繝ｯ繝ｼ繝牙・蜉帶ｬ・', await passwordInput.isVisible());
    console.log('騾∽ｿ｡繝懊ち繝ｳ:', await submitButton.isVisible());
    
    // 螳滄圀縺ｫ隕九▽縺九▲縺溯ｦ∫ｴ繧定｡ｨ遉ｺ
    const allInputs = await page.locator('input').all();
    console.log(`蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${allInputs.length}`);
    
    const allButtons = await page.locator('button').all();
    console.log(`繝懊ち繝ｳ謨ｰ: ${allButtons.length}`);
  });
  
  test('繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・・遒ｺ隱・, async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // 繧医ｊ譟碑ｻ溘↑繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ繧定ｩｦ縺・
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("繝ｭ繧ｰ繧､繝ｳ"), button:has-text("Login")').first();
    
    if (await emailInput.isVisible()) {
      console.log('繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ繧貞・蜉・);
      await emailInput.fill('admin-test@example.com');
    } else {
      console.log('繝｡繝ｼ繝ｫ蜈･蜉帶ｬ・′隕九▽縺九ｊ縺ｾ縺帙ｓ');
      // 繝壹・繧ｸ縺ｮ蜀・ｮｹ繧貞・蜉・
      console.log(await page.content());
    }
    
    if (await passwordInput.isVisible()) {
      console.log('繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉・);
      await passwordInput.fill('Test123!');
    }
    
    if (await submitButton.isVisible()) {
      console.log('繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け');
      await submitButton.click();
      
      // 繝ｭ繧ｰ繧､繝ｳ蠕後・驕ｷ遘ｻ繧貞ｾ・▽
      try {
        await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
        console.log('繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ謌仙粥');
      } catch (e) {
        console.log('繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ螟ｱ謨・);
        console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
        await page.screenshot({ path: 'admin-after-login.png' });
      }
    }
  });
});
