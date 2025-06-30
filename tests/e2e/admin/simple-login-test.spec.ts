import { test, expect } from '@playwright/test';

test.describe('邂｡逅・判髱｢繝ｭ繧ｰ繧､繝ｳ繝・せ繝・, () => {
  test('邂｡逅・判髱｢縺ｫ繝ｭ繧ｰ繧､繝ｳ縺ｧ縺阪ｋ縺薙→繧堤｢ｺ隱・, async ({ page }) => {
    console.log('噫 繝・せ繝磯幕蟋・ 邂｡逅・判髱｢繝ｭ繧ｰ繧､繝ｳ繝・せ繝・);
    
    // 邂｡逅・・Ο繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｸ繧｢繧ｯ繧ｻ繧ｹ
    await page.goto('/admin/login');
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    
    // 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
    await page.waitForLoadState('networkidle');
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺ｮ隕∫ｴ繧堤｢ｺ隱・
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // 繝輔か繝ｼ繝隕∫ｴ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
    console.log('統 繝輔か繝ｼ繝隕∫ｴ縺ｮ遒ｺ隱堺ｸｭ...');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
    
    // 繝ｭ繧ｰ繧､繝ｳ諠・ｱ繧貞・蜉・
    console.log('泊 繝ｭ繧ｰ繧､繝ｳ諠・ｱ繧貞・蜉帑ｸｭ...');
    await emailInput.fill('admin@example.com');
    await passwordInput.fill('admin123');
    
    // 繝阪ャ繝医Ρ繝ｼ繧ｯ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ逶｣隕・
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/admin/login') && 
      response.request().method() === 'POST'
    );
    
    // 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け
    await submitButton.click();
    console.log('務・・繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け縺励∪縺励◆');
    
    // API繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・▽
    try {
      const response = await responsePromise;
      const status = response.status();
      const responseBody = await response.json().catch(() => null);
      
      console.log('藤 API繝ｬ繧ｹ繝昴Φ繧ｹ:', {
        status,
        ok: response.ok(),
        body: responseBody
      });
      
      if (!response.ok()) {
        console.error('笶・繝ｭ繧ｰ繧､繝ｳAPI繧ｨ繝ｩ繝ｼ:', responseBody?.message || 'Unknown error');
      }
    } catch (error) {
      console.log('笞・・API繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・ｩ滉ｸｭ縺ｫ繧ｿ繧､繝繧｢繧ｦ繝・);
    }
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ縺ｾ縺溘・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧堤｢ｺ隱・
    try {
      // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
      await page.waitForURL('**/admin/dashboard', { timeout: 5000 });
      console.log('笨・繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ謌仙粥');
      console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    } catch (e) {
      console.log('笞・・繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨・);
      console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
      
      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈爾縺・
      const errorSelectors = [
        '.error',
        '.text-red-600',
        '[role="alert"]',
        '.toast-error',
        'text=螟ｱ謨・,
        'text=繧ｨ繝ｩ繝ｼ'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector);
        if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const errorText = await errorElement.textContent();
          console.log('圷 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorText);
          break;
        }
      }
      
      // 繝・ヰ繝・げ逕ｨ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await page.screenshot({ path: 'login-debug.png', fullPage: true });
      console.log('萄 繝・ヰ繝・げ逕ｨ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・login-debug.png 縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
    }
  });
});
