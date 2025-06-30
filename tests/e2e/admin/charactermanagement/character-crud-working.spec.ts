import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 蜍穂ｽ懃｢ｺ隱咲沿', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ豁｣縺励￥驕ｸ謚槭☆繧狗沿', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繝・せ繝磯幕蟋・);
    
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
      
      console.log('桃 迴ｾ蝨ｨ縺ｮURL:', newPage.url());
      
      // 繝輔か繝ｼ繝蜈･蜉・
      console.log('\n統 繝輔か繝ｼ繝蜈･蜉幃幕蟋・..');
      const timestamp = Date.now();
      
      // 蜷榊燕蜈･蜉・
      const textInputs = await newPage.locator('input[type="text"]').all();
      if (textInputs.length >= 2) {
        await textInputs[0].fill(`蜍穂ｽ懃｢ｺ隱阪く繝｣繝ｩ_${timestamp}`);
        await textInputs[1].fill(`Working Char ${timestamp}`);
        console.log('笨・蜷榊燕蜈･蜉帛ｮ御ｺ・);
      }
      
      // 隱ｬ譏主・蜉・
      const textareas = await newPage.locator('textarea').all();
      if (textareas.length > 0) {
        await textareas[0].fill('蜍穂ｽ懃｢ｺ隱咲畑縺ｮ繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
        console.log('笨・隱ｬ譏主・蜉帛ｮ御ｺ・);
      }
      
      // 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ縺ｮ隧ｳ邏ｰ遒ｺ隱・
      const selects = await newPage.locator('select').all();
      console.log(`\n搭 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ謨ｰ: ${selects.length}`);
      
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const options = await select.locator('option').all();
        console.log(`\n繧ｻ繝ｬ繧ｯ繝・${i}] name="${name}"`);
        
        // 蜷・が繝励す繝ｧ繝ｳ縺ｮ隧ｳ邏ｰ
        for (let j = 0; j < Math.min(options.length, 5); j++) {
          const value = await options[j].getAttribute('value');
          const text = await options[j].textContent();
          console.log(`  繧ｪ繝励す繝ｧ繝ｳ[${j}]: value="${value}", text="${text}"`);
        }
        
        // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ縺ｮ驕ｸ謚橸ｼ・ame縺ｾ縺溘・繧ｪ繝励す繝ｧ繝ｳ縺ｮ蜀・ｮｹ縺ｧ蛻､譁ｭ・・
        if (i === 1 || name === 'personalityPreset' || (options.length > 5 && await options[1].textContent()?.then(t => t?.includes('繝輔Ξ繝ｳ繝峨Μ繝ｼ')))) {
          console.log('箝・縺薙ｌ縺梧ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧ｻ繝ｬ繧ｯ繝医〒縺呻ｼ・);
          
          // 遨ｺ縺ｧ縺ｪ縺・怙蛻昴・蛟､繧帝∈謚・
          for (let j = 1; j < options.length; j++) {
            const value = await options[j].getAttribute('value');
            if (value && value !== '') {
              await select.selectOption(value);
              console.log(`笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚・ ${value}`);
              break;
            }
          }
        } else if (i === 0) {
          // 諤ｧ蛻･縺ｮ驕ｸ謚・
          const value = await options[1].getAttribute('value');
          if (value) {
            await select.selectOption(value);
            console.log(`笨・諤ｧ蛻･驕ｸ謚・ ${value}`);
          }
        }
      }
      
      // 諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚・
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚槫ｮ御ｺ・);
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'working-form.png', fullPage: true });
      console.log('\n萄 繝輔か繝ｼ繝縺ｮ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・);
      
      // 菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け
      const saveButton = newPage.locator('button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        console.log('\n沈 菫晏ｭ伜・逅・..');
        
        // API繝ｬ繧ｹ繝昴Φ繧ｹ逶｣隕・
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        await saveButton.click();
        console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
        
        const response = await responsePromise;
        if (response) {
          console.log(`\n藤 API繝ｬ繧ｹ繝昴Φ繧ｹ: ${response.status()}`);
          if (response.status() !== 200 && response.status() !== 201) {
            const body = await response.text();
            console.log('繧ｨ繝ｩ繝ｼ蜀・ｮｹ:', body);
          }
        }
        
        // 邨先棡繧貞ｾ・▽
        await newPage.waitForTimeout(5000);
        
        // 謌仙粥蛻､螳・
        const finalUrl = newPage.url();
        const hasSuccess = 
          !finalUrl.includes('/new') || 
          await newPage.locator('.toast-success').isVisible().catch(() => false);
        
        console.log('\n投 譛邨らｵ先棡:');
        console.log(`- URL: ${finalUrl}`);
        console.log(`- 謌仙粥: ${hasSuccess ? '笨・ : '笶・}`);
        
        if (!hasSuccess) {
          const errors = await newPage.locator('.error, .text-red-600').allTextContents();
          console.log('- 繧ｨ繝ｩ繝ｼ:', errors);
        }
        
        expect(hasSuccess).toBeTruthy();
      }
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});
