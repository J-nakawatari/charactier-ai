import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝隧ｳ邏ｰ蛻・梵', () => {
  test.setTimeout(90000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繝輔か繝ｼ繝縺ｮ蠢・医ヵ繧｣繝ｼ繝ｫ繝峨ｒ螳悟・縺ｫ蛻・梵', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繝輔か繝ｼ繝蛻・梵繝・せ繝磯幕蟋・);
    
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
      
      // 繝壹・繧ｸ蜈ｨ菴薙・繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'form-analysis-full.png', fullPage: true });
      
      console.log('\n剥 繝輔か繝ｼ繝隕∫ｴ縺ｮ螳悟・蛻・梵:');
      
      // 蠢・医・繝ｼ繧ｯ縺後≠繧九Λ繝吶Ν繧呈爾縺・
      const requiredLabels = await newPage.locator('label:has(.text-red-500), label:has(*:text("*"))').all();
      console.log(`\n東 蠢・医ヵ繧｣繝ｼ繝ｫ繝画焚: ${requiredLabels.length}`);
      
      for (let i = 0; i < requiredLabels.length; i++) {
        const label = requiredLabels[i];
        const labelText = await label.textContent();
        console.log(`  [${i}] ${labelText?.trim()}`);
      }
      
      // 蜈ｨ縺ｦ縺ｮ蜈･蜉幄ｦ∫ｴ繧貞・譫・
      console.log('\n搭 蜈ｨ蜈･蜉幄ｦ∫ｴ縺ｮ隧ｳ邏ｰ:');
      
      // 繝・く繧ｹ繝亥・蜉・
      const textInputs = await newPage.locator('input[type="text"]').all();
      console.log(`\n繝・く繧ｹ繝亥・蜉・(${textInputs.length}蛟・:`);
      for (let i = 0; i < textInputs.length; i++) {
        const input = textInputs[i];
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const required = await input.getAttribute('required');
        const value = await input.inputValue();
        
        // 隕ｪ隕∫ｴ縺ｮ繝ｩ繝吶Ν繝・く繧ｹ繝医ｒ蜿門ｾ・
        const parentLabel = await input.locator('xpath=ancestor::div[contains(@class, "space-y")]//label').first().textContent().catch(() => '');
        
        console.log(`  [${i}] name="${name}" placeholder="${placeholder}" required="${required}" value="${value}"`);
        if (parentLabel) {
          console.log(`      繝ｩ繝吶Ν: ${parentLabel.trim()}`);
        }
      }
      
      // 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ
      const selects = await newPage.locator('select').all();
      console.log(`\n繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ (${selects.length}蛟・:`);
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const selectedValue = await select.inputValue();
        
        // 隕ｪ隕∫ｴ縺ｮ繝ｩ繝吶Ν繝・く繧ｹ繝医ｒ蜿門ｾ・
        const parentLabel = await select.locator('xpath=ancestor::div[contains(@class, "space-y")]//label').first().textContent().catch(() => '');
        
        console.log(`  [${i}] name="${name}" required="${required}" selectedValue="${selectedValue}"`);
        if (parentLabel) {
          console.log(`      繝ｩ繝吶Ν: ${parentLabel.trim()}`);
        }
        
        // 繧ｪ繝励す繝ｧ繝ｳ縺ｮ隧ｳ邏ｰ
        const options = await select.locator('option').all();
        for (let j = 0; j < Math.min(options.length, 3); j++) {
          const optionValue = await options[j].getAttribute('value');
          const optionText = await options[j].textContent();
          console.log(`      option[${j}]: value="${optionValue}" text="${optionText}"`);
        }
      }
      
      // 譛蟆城剞縺ｮ蜈･蜉帙〒繝・せ繝・
      console.log('\n統 譛蟆城剞縺ｮ蠢・磯・岼繧貞・蜉帙＠縺ｦ繝・せ繝・..');
      const timestamp = Date.now();
      
      // 蜷榊燕・域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      if (textInputs.length >= 2) {
        await textInputs[0].fill(`蛻・梵繝・せ繝・${timestamp}`);
        await textInputs[1].fill(`Analysis Test ${timestamp}`);
        console.log('笨・蜷榊燕蜈･蜉・);
      }
      
      // 諤ｧ蛻･・・逡ｪ逶ｮ縺ｮ繧ｻ繝ｬ繧ｯ繝茨ｼ・
      if (selects.length > 0) {
        await selects[0].selectOption({ index: 1 });
        console.log('笨・諤ｧ蛻･驕ｸ謚・);
      }
      
      // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・・逡ｪ逶ｮ縺ｮ繧ｻ繝ｬ繧ｯ繝茨ｼ・
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚・ ${value}`);
            break;
          }
        }
      }
      
      // 諤ｧ譬ｼ繧ｿ繧ｰ・域怙菴・縺､蠢・ｦ√°繧ゑｼ・
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚・);
      }
      
      // 迴ｾ蝨ｨ縺ｮ迥ｶ諷九〒繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'form-analysis-filled.png', fullPage: true });
      
      // 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け縺励※縲√←繧薙↑繧ｨ繝ｩ繝ｼ縺悟・繧九°遒ｺ隱・
      console.log('\n溌 菫晏ｭ倥ｒ隧ｦ縺ｿ縺ｦ繧ｨ繝ｩ繝ｼ繧貞・譫・..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      if (await saveButton.isVisible()) {
        // 菫晏ｭ伜燕縺ｮ蜈ｨ繝輔か繝ｼ繝繝・・繧ｿ繧堤｢ｺ隱・
        console.log('\n投 菫晏ｭ伜燕縺ｮ繝輔か繝ｼ繝迥ｶ諷・');
        
        // 蜷・・蜉帙・迴ｾ蝨ｨ蛟､繧堤｢ｺ隱・
        for (let i = 0; i < Math.min(textInputs.length, 5); i++) {
          const value = await textInputs[i].inputValue();
          console.log(`  input[${i}]: "${value}"`);
        }
        
        for (let i = 0; i < selects.length; i++) {
          const value = await selects[i].inputValue();
          console.log(`  select[${i}]: "${value}"`);
        }
        
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
          const responseBody = await response.json().catch(() => response.text());
          console.log('繝ｬ繧ｹ繝昴Φ繧ｹ蜀・ｮｹ:', JSON.stringify(responseBody, null, 2));
        }
        
        // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧貞ｾ・▽
        await newPage.waitForTimeout(3000);
        
        // 蜈ｨ縺ｦ縺ｮ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧貞庶髮・
        const errorSelectors = [
          '.error',
          '.text-red-600',
          '.text-red-500',
          '.error-message',
          '.field-error',
          '[role="alert"]',
          '.toast-error'
        ];
        
        console.log('\n笶・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:');
        for (const selector of errorSelectors) {
          const errors = await newPage.locator(selector).allTextContents();
          if (errors.length > 0) {
            console.log(`  ${selector}: ${errors}`);
          }
        }
        
        // 辟｡蜉ｹ縺ｪ繝輔ぅ繝ｼ繝ｫ繝峨ｒ謗｢縺・
        const invalidInputs = await newPage.locator('[aria-invalid="true"], .border-red-300').all();
        console.log(`\n笞・・辟｡蜉ｹ縺ｪ繝輔ぅ繝ｼ繝ｫ繝画焚: ${invalidInputs.length}`);
        
        // 繧ｨ繝ｩ繝ｼ蠕後・繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
        await newPage.screenshot({ path: 'form-analysis-error.png', fullPage: true });
      }
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      await newPage.screenshot({ path: 'form-analysis-exception.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
