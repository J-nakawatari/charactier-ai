import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 譛蟆城剞繝・せ繝・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('蠢・・鬆・岼縺ｮ縺ｿ縺ｧ菴懈・繧定ｩｦ縺ｿ繧・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 譛蟆城剞繝・せ繝磯幕蟋・);
    
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
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      console.log('\n統 蠢・・鬆・岼縺ｮ縺ｿ蜈･蜉・');
      const timestamp = Date.now();
      
      // 1. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ・ 譛蛻昴・繝・く繧ｹ繝亥・蜉・
      const nameJaInput = newPage.locator('input[type="text"]').first();
      await nameJaInput.fill(`譛蟆城剞繝・せ繝・${timestamp}`);
      console.log('笨・1. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ牙・蜉・);
      
      // 闍ｱ隱槫錐繧ょ・蜉帙＠縺ｦ縺ｿ繧具ｼ亥ｿ・医〒縺ｪ縺・°繧ゅ＠繧後↑縺・′・・
      const nameEnInput = newPage.locator('input[type="text"]').nth(1);
      await nameEnInput.fill(`Minimal Test ${timestamp}`);
      console.log('笨・闍ｱ隱槫錐繧ょ・蜉幢ｼ亥ｿｵ縺ｮ縺溘ａ・・);
      
      // 2. 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ - 2逡ｪ逶ｮ縺ｮ繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ
      const selects = await newPage.locator('select').all();
      if (selects.length > 1) {
        // 譛蛻昴↓諤ｧ蛻･繧帝∈謚橸ｼ亥ｿ・医〒縺ｪ縺・°繧ゅ＠繧後↑縺・′・・
        await selects[0].selectOption({ index: 1 });
        console.log('笨・諤ｧ蛻･驕ｸ謚橸ｼ亥ｿｵ縺ｮ縺溘ａ・・);
        
        // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・
        const personalityOptions = await selects[1].locator('option').all();
        for (let i = 1; i < personalityOptions.length; i++) {
          const value = await personalityOptions[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            const text = await personalityOptions[i].textContent();
            console.log(`笨・2. 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚・ ${value} (${text})`);
            break;
          }
        }
      }
      
      // 3. 諤ｧ譬ｼ繧ｿ繧ｰ - 譛菴・縺､繝√ぉ繝・け
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      console.log('笨・3. 諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚橸ｼ・縺､・・);
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'minimal-test-before-save.png', fullPage: true });
      
      // 菫晏ｭ倥ｒ隧ｦ縺ｿ繧・
      console.log('\n沈 菫晏ｭ倥ｒ隧ｦ縺ｿ繧・..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ逶｣隕・
      const responsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      await saveButton.click();
      console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
      
      const response = await responsePromise;
      if (response) {
        const status = response.status();
        console.log(`\n藤 API繝ｬ繧ｹ繝昴Φ繧ｹ: ${status}`);
        
        if (status !== 200 && status !== 201) {
          const responseBody = await response.json().catch(() => response.text());
          console.log('繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:');
          console.log(JSON.stringify(responseBody, null, 2));
        }
      }
      
      // 邨先棡繧貞ｾ・▽
      await newPage.waitForTimeout(5000);
      
      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧貞庶髮・
      const errorMessages = await newPage.locator('.error, .text-red-600, .toast-error').allTextContents();
      if (errorMessages.length > 0) {
        console.log('\n笶・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages);
      }
      
      // 謌仙粥蛻､螳・
      const finalUrl = newPage.url();
      const isSuccess = 
        !finalUrl.includes('/new') || 
        await newPage.locator('.toast-success').isVisible().catch(() => false) ||
        finalUrl.includes('/admin/characters/');
      
      console.log('\n投 邨先棡:');
      console.log(`- URL: ${finalUrl}`);
      console.log(`- 謌仙粥: ${isSuccess ? '笨・ : '笶・}`);
      
      // 螟ｱ謨玲凾縺ｮ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      if (!isSuccess) {
        await newPage.screenshot({ path: 'minimal-test-after-save.png', fullPage: true });
        
        // 蜈ｨ縺ｦ縺ｮ繝・く繧ｹ繝医お繝ｪ繧｢縺ｮ蜀・ｮｹ繧ら｢ｺ隱・
        const textareaCount = await newPage.locator('textarea').count();
        console.log(`\n統 繝・く繧ｹ繝医お繝ｪ繧｢謨ｰ: ${textareaCount}`);
        
        // 繧ゅ＠縺九＠縺溘ｉ隱ｬ譏弱ｄ繝励Ο繝ｳ繝励ヨ縺悟ｿ・医°繧ゑｼ・
        if (textareaCount > 0) {
          console.log('隱ｬ譏弱ヵ繧｣繝ｼ繝ｫ繝峨ｒ霑ｽ蜉縺ｧ蜈･蜉帙＠縺ｦ縺ｿ繧・..');
          
          // 譌･譛ｬ隱櫁ｪｬ譏・
          const descJa = newPage.locator('textarea').first();
          await descJa.fill('譛蟆城剞縺ｮ繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
          
          // 闍ｱ隱櫁ｪｬ譏・
          if (textareaCount > 1) {
            const descEn = newPage.locator('textarea').nth(1);
            await descEn.fill('This is a minimal test character.');
          }
          
          // 蜀榊ｺｦ菫晏ｭ倥ｒ隧ｦ縺ｿ繧・
          console.log('\n沈 隱ｬ譏手ｿｽ蜉蠕後∝・蠎ｦ菫晏ｭ・..');
          await saveButton.click();
          await newPage.waitForTimeout(5000);
          
          const retryUrl = newPage.url();
          const retrySuccess = !retryUrl.includes('/new');
          console.log(`- 蜀崎ｩｦ陦檎ｵ先棡: ${retrySuccess ? '笨・ : '笶・}`);
          
          if (!retrySuccess) {
            const retryErrors = await newPage.locator('.error, .text-red-600').allTextContents();
            console.log('- 蜀崎ｩｦ陦後お繝ｩ繝ｼ:', retryErrors);
          }
        }
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      await newPage.screenshot({ path: 'minimal-test-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
