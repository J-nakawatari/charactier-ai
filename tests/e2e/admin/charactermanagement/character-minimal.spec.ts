import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 譛蟆城剞繝・せ繝・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('譛蟆城剞縺ｮ諠・ｱ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽ懈・', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 譛蟆城剞縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝磯幕蟋・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ逶ｴ謗･遘ｻ蜍・
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      console.log('統 繝輔か繝ｼ繝蜈･蜉幃幕蟋・);
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・亥・蜉帛燕・・
      await newPage.screenshot({ path: 'minimal-before-input.png', fullPage: true });
      
      // 譛蛻昴↓隕九▽縺九▲縺溘ユ繧ｭ繧ｹ繝亥・蜉帙↓蜷榊燕繧貞・蜉・
      const timestamp = Date.now();
      const firstTextInput = newPage.locator('input[type="text"]').first();
      
      if (await firstTextInput.isVisible()) {
        await firstTextInput.fill(`譛蟆上ユ繧ｹ繝・${timestamp}`);
        console.log('笨・蜷榊燕蜈･蜉帛ｮ御ｺ・);
      } else {
        throw new Error('繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
      // 譛蛻昴↓隕九▽縺九▲縺溘ユ繧ｭ繧ｹ繝医お繝ｪ繧｢縺ｫ隱ｬ譏弱ｒ蜈･蜉・
      const firstTextarea = newPage.locator('textarea').first();
      if (await firstTextarea.isVisible()) {
        await firstTextarea.fill('譛蟆城剞縺ｮ繝・せ繝郁ｪｬ譏・);
        console.log('笨・隱ｬ譏主・蜉帛ｮ御ｺ・);
      }
      
      // 譛蛻昴↓隕九▽縺九▲縺溘メ繧ｧ繝・け繝懊ャ繧ｯ繧ｹ繧偵け繝ｪ繝・け
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
        console.log('笨・繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ驕ｸ謚槫ｮ御ｺ・);
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・亥・蜉帛ｾ鯉ｼ・
      await newPage.screenshot({ path: 'minimal-after-input.png', fullPage: true });
      
      // 菫晏ｭ倥・繧ｿ繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
      const saveButton = newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
      
      if (await saveButton.isVisible()) {
        console.log('沈 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け');
        await saveButton.click();
        
        // 邨先棡繧貞ｾ・▽
        await newPage.waitForTimeout(5000);
        
        // 謌仙粥蛻､螳・
        const currentUrl = newPage.url();
        const hasError = await newPage.locator('.error, .text-red-600').isVisible().catch(() => false);
        
        console.log(`桃 迴ｾ蝨ｨ縺ｮURL: ${currentUrl}`);
        console.log(`笶・繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ: ${hasError}`);
        
        if (hasError) {
          const errorText = await newPage.locator('.error, .text-red-600').textContent();
          console.log(`繧ｨ繝ｩ繝ｼ蜀・ｮｹ: ${errorText}`);
          await newPage.screenshot({ path: 'minimal-error.png', fullPage: true });
        }
        
        // 謌仙粥縺ｮ蝣ｴ蜷医・URL縺悟､峨ｏ繧九°縲∵・蜉溘Γ繝・そ繝ｼ繧ｸ縺瑚｡ｨ遉ｺ縺輔ｌ繧・
        const isSuccess = !currentUrl.includes('/new') || 
                         await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false);
        
        expect(isSuccess).toBeTruthy();
      } else {
        throw new Error('菫晏ｭ倥・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      if (newPage && !newPage.isClosed()) {
        await newPage.screenshot({ path: 'minimal-exception.png', fullPage: true });
      }
      throw error;
    } finally {
      await context.close();
    }
  });
});
