import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 險ｺ譁ｭ繝・せ繝・, () => {
  test.setTimeout(90000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繝輔か繝ｼ繝讒矩繧貞ｮ悟・縺ｫ逅・ｧ｣縺吶ｋ', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('溌 險ｺ譁ｭ繝・せ繝磯幕蟋・);
    
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
      
      // 1. 繝壹・繧ｸ縺ｮHTML繧剃ｿ晏ｭ假ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
      const pageContent = await newPage.content();
      console.log('\n塘 繝壹・繧ｸ讒矩縺ｮ險ｺ譁ｭ:');
      
      // 2. 蜈ｨ縺ｦ縺ｮ繝ｩ繝吶Ν縺ｨ縺昴ｌ縺ｫ蟇ｾ蠢懊☆繧句・蜉幄ｦ∫ｴ繧堤音螳・
      const formGroups = await newPage.locator('.space-y-6 > div, .form-group, .mb-4').all();
      console.log(`\n繝輔か繝ｼ繝繧ｰ繝ｫ繝ｼ繝玲焚: ${formGroups.length}`);
      
      // 3. 蜷・ユ繧ｭ繧ｹ繝医お繝ｪ繧｢縺ｮ隧ｳ邏ｰ繧貞叙蠕・
      console.log('\n統 繝・く繧ｹ繝医お繝ｪ繧｢縺ｮ隧ｳ邏ｰ:');
      const textareas = await newPage.locator('textarea').all();
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        
        // 霑代￥縺ｮ繝ｩ繝吶Ν繧呈爾縺・
        let label = '';
        try {
          // 隕ｪ隕∫ｴ縺九ｉ驕｡縺｣縺ｦ繝ｩ繝吶Ν繧呈爾縺・
          const parentDiv = await textarea.locator('xpath=ancestor::div[contains(@class, "space-y") or contains(@class, "mb")]').first();
          const labelElement = await parentDiv.locator('label').first();
          label = await labelElement.textContent() || '';
        } catch (e) {
          // 繝ｩ繝吶Ν縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷・
        }
        
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        
        console.log(`[${i}] 繝ｩ繝吶Ν: "${label.trim()}"`);
        console.log(`    name="${name}" placeholder="${placeholder}"`);
        console.log('---');
      }
      
      // 4. 螳滄圀縺ｫ繝輔か繝ｼ繝繧貞沂繧√ｋ・郁ｨｺ譁ｭ繝｢繝ｼ繝会ｼ・
      console.log('\n槙・・繝輔か繝ｼ繝蜈･蜉幄ｨｺ譁ｭ:');
      const timestamp = Date.now();
      
      // 蜷榊燕
      await newPage.locator('input[type="text"]').first().fill(`險ｺ譁ｭ_${timestamp}`);
      await newPage.locator('input[type="text"]').nth(1).fill(`Diagnosis ${timestamp}`);
      console.log('笨・蜷榊燕蜈･蜉・);
      
      // 隱ｬ譏弱ｒ謗｢縺励※蜈･蜉・
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const placeholder = await textarea.getAttribute('placeholder') || '';
        
        if (placeholder.includes('隱ｬ譏・) || i === 0) {
          await textarea.fill('險ｺ譁ｭ逕ｨ縺ｮ譌･譛ｬ隱櫁ｪｬ譏弱〒縺吶・);
          console.log(`笨・textarea[${i}]縺ｫ譌･譛ｬ隱櫁ｪｬ譏主・蜉嫣);
        } else if (placeholder.includes('description') || placeholder.includes('English') || i === 1) {
          await textarea.fill('This is a diagnosis description in English.');
          console.log(`笨・textarea[${i}]縺ｫ闍ｱ隱櫁ｪｬ譏主・蜉嫣);
        } else if (placeholder.includes('繝｡繝・そ繝ｼ繧ｸ') || placeholder.includes('縺薙ｓ縺ｫ縺｡縺ｯ') || i === 2) {
          await textarea.fill('縺薙ｓ縺ｫ縺｡縺ｯ・∬ｨｺ譁ｭ繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
          console.log(`笨・textarea[${i}]縺ｫ譌･譛ｬ隱槭ョ繝輔か繝ｫ繝医Γ繝・そ繝ｼ繧ｸ蜈･蜉嫣);
        } else if (placeholder.includes('Hello') || placeholder.includes('message') || i === 3) {
          await textarea.fill('Hello! I am a diagnosis test character.');
          console.log(`笨・textarea[${i}]縺ｫ闍ｱ隱槭ョ繝輔か繝ｫ繝医Γ繝・そ繝ｼ繧ｸ蜈･蜉嫣);
        }
      }
      
      // 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ
      const selects = await newPage.locator('select').all();
      if (selects.length > 0) {
        await selects[0].selectOption({ index: 1 });
        console.log('笨・諤ｧ蛻･驕ｸ謚・);
      }
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
      
      // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ
      await newPage.locator('input[type="checkbox"]').first().click();
      console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚・);
      
      // 5. 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・亥・蜉帛ｾ鯉ｼ・
      await newPage.screenshot({ path: 'diagnosis-filled.png', fullPage: true });
      console.log('\n萄 蜈･蜉帛ｾ後・繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・ diagnosis-filled.png');
      
      // 6. 菫晏ｭ倥ｒ隧ｦ縺ｿ繧・
      console.log('\n沈 菫晏ｭ倩ｨｺ譁ｭ:');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ繧偵く繝｣繝励メ繝｣
      let requestBody = null;
      newPage.on('request', request => {
        if (request.url().includes('/api/v1/admin/characters') && request.method() === 'POST') {
          requestBody = request.postDataJSON();
        }
      });
      
      await saveButton.click();
      console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
      
      // 繝ｪ繧ｯ繧ｨ繧ｹ繝医・繝・ぅ繧定｡ｨ遉ｺ
      await newPage.waitForTimeout(2000);
      if (requestBody) {
        console.log('\n豆 騾∽ｿ｡縺輔ｌ縺溘ョ繝ｼ繧ｿ:');
        console.log(JSON.stringify(requestBody, null, 2));
      }
      
      // 繧ｨ繝ｩ繝ｼ繧貞ｾ・▽
      await newPage.waitForTimeout(3000);
      
      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ
      const errors = await newPage.locator('.error, .text-red-600, .toast-error').allTextContents();
      if (errors.length > 0) {
        console.log('\n笶・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errors);
      }
      
      // 謌仙粥蛻､螳・
      const finalUrl = newPage.url();
      const isSuccess = !finalUrl.includes('/new');
      console.log(`\n投 邨先棡: ${isSuccess ? '笨・謌仙粥' : '笶・螟ｱ謨・}`);
      console.log(`譛邨６RL: ${finalUrl}`);
      
      // 譛邨ゅせ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'diagnosis-final.png', fullPage: true });
      console.log('萄 譛邨ゅせ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・ diagnosis-final.png');
      
    } catch (error) {
      console.error('笶・險ｺ譁ｭ繧ｨ繝ｩ繝ｼ:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});
