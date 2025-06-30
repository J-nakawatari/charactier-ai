import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・ヰ繝・げ繝・せ繝・, () => {
  test.setTimeout(90000); // 90遘偵・繧ｿ繧､繝繧｢繧ｦ繝・
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 隧ｳ邏ｰ繝・ヰ繝・げ迚・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繝・ヰ繝・げ繝・せ繝磯幕蟋・);
    
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
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ逶ｴ謗･驕ｷ遘ｻ
      const newPage = await context.newPage();
      console.log('\n塘 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ逶ｴ謗･驕ｷ遘ｻ...');
      
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      const currentUrl = newPage.url();
      console.log(`桃 迴ｾ蝨ｨ縺ｮURL: ${currentUrl}`);
      
      // 繝壹・繧ｸ縺ｮ蜀・ｮｹ繧堤｢ｺ隱・
      const pageTitle = await newPage.title();
      console.log(`塘 繝壹・繧ｸ繧ｿ繧､繝医Ν: ${pageTitle}`);
      
      // 繝輔か繝ｼ繝隕∫ｴ縺ｮ隧ｳ邏ｰ遒ｺ隱・
      console.log('\n剥 繝輔か繝ｼ繝隕∫ｴ縺ｮ隧ｳ邏ｰ遒ｺ隱・');
      
      // 蜈ｨ縺ｦ縺ｮ蜈･蜉幄ｦ∫ｴ繧堤｢ｺ隱・
      const allInputs = await newPage.locator('input').all();
      console.log(`\n蜈･蜉幄ｦ∫ｴ邱乗焚: ${allInputs.length}`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const required = await input.getAttribute('required');
        console.log(`  [${i}] type="${type}" name="${name}" placeholder="${placeholder}" required="${required}"`);
      }
      
      // 蜈ｨ縺ｦ縺ｮselect隕∫ｴ繧堤｢ｺ隱・
      const allSelects = await newPage.locator('select').all();
      console.log(`\n繧ｻ繝ｬ繧ｯ繝郁ｦ∫ｴ邱乗焚: ${allSelects.length}`);
      
      for (let i = 0; i < allSelects.length; i++) {
        const select = allSelects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const optionCount = await select.locator('option').count();
        console.log(`  [${i}] name="${name}" required="${required}" options=${optionCount}`);
      }
      
      // 蜈ｨ縺ｦ縺ｮtextarea隕∫ｴ繧堤｢ｺ隱・
      const allTextareas = await newPage.locator('textarea').all();
      console.log(`\n繝・く繧ｹ繝医お繝ｪ繧｢邱乗焚: ${allTextareas.length}`);
      
      for (let i = 0; i < allTextareas.length; i++) {
        const textarea = allTextareas[i];
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        const required = await textarea.getAttribute('required');
        console.log(`  [${i}] name="${name}" placeholder="${placeholder}" required="${required}"`);
      }
      
      // 繝輔か繝ｼ繝蜈･蜉幢ｼ域怙蟆城剞縺ｮ蠢・磯・岼縺ｮ縺ｿ・・
      console.log('\n統 譛蟆城剞縺ｮ蠢・磯・岼繧貞・蜉・..');
      const timestamp = Date.now();
      
      // 蜷榊燕繝輔ぅ繝ｼ繝ｫ繝峨ｒ迚ｹ螳壹＠縺ｦ蜈･蜉・
      const nameFields = await newPage.locator('input[type="text"]').all();
      if (nameFields.length >= 2) {
        console.log('  蜷榊燕繝輔ぅ繝ｼ繝ｫ繝峨↓蜈･蜉・..');
        await nameFields[0].fill(`繝・ヰ繝・げ繧ｭ繝｣繝ｩ_${timestamp}`);
        await nameFields[1].fill(`Debug Char ${timestamp}`);
      }
      
      // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚橸ｼ亥ｿ・医・蜿ｯ閭ｽ諤ｧ・・
      const personalitySelect = await newPage.locator('select').first();
      if (await personalitySelect.isVisible()) {
        console.log('  諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・..');
        const options = await personalitySelect.locator('option').all();
        console.log(`  繧ｪ繝励す繝ｧ繝ｳ謨ｰ: ${options.length}`);
        
        for (let i = 0; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          const text = await options[i].textContent();
          console.log(`    [${i}] value="${value}", text="${text}"`);
        }
        
        // 遨ｺ縺ｧ縺ｪ縺・怙蛻昴・蛟､繧帝∈謚・
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            console.log(`  驕ｸ謚・ ${value}`);
            await personalitySelect.selectOption(value);
            break;
          }
        }
      }
      
      // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ繧・縺､驕ｸ謚橸ｼ亥ｿ・医・蜿ｯ閭ｽ諤ｧ・・
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        console.log('  繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ繧帝∈謚・..');
        await checkboxes[0].click();
      }
      
      // 菫晏ｭ伜燕縺ｮ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'debug-before-save.png', fullPage: true });
      
      // 菫晏ｭ倥・繧ｿ繝ｳ繧呈爾縺・
      console.log('\n剥 菫晏ｭ倥・繧ｿ繝ｳ繧呈爾邏｢...');
      const saveButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("菫晏ｭ・)',
        'button:has-text("菴懈・")',
        'button:has-text("逋ｻ骭ｲ")',
        'button:has-text("霑ｽ蜉")'
      ];
      
      let saveButton = null;
      for (const selector of saveButtonSelectors) {
        const button = newPage.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          saveButton = button;
          console.log(`笨・菫晏ｭ倥・繧ｿ繝ｳ逋ｺ隕・ ${selector}`);
          const buttonText = await button.textContent();
          console.log(`  繝懊ち繝ｳ繝・く繧ｹ繝・ "${buttonText}"`);
          break;
        }
      }
      
      if (saveButton) {
        // 繝懊ち繝ｳ縺ｮ迥ｶ諷九ｒ遒ｺ隱・
        const isEnabled = await saveButton.isEnabled();
        console.log(`  繝懊ち繝ｳ譛牙柑: ${isEnabled}`);
        
        if (!isEnabled) {
          console.log('笞・・繝懊ち繝ｳ縺檎┌蜉ｹ縺ｧ縺吶ょｿ・磯・岼繧堤｢ｺ隱阪＠縺ｾ縺・..');
          
          // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈爾縺・
          const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
          if (errorMessages.length > 0) {
            console.log('繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages);
          }
        }
        
        // 繝阪ャ繝医Ρ繝ｼ繧ｯ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ逶｣隕・
        console.log('\n藤 繝阪ャ繝医Ρ繝ｼ繧ｯ逶｣隕悶ｒ髢句ｧ・..');
        
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        // 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け
        await saveButton.click();
        console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
        
        // 繝ｬ繧ｹ繝昴Φ繧ｹ繧貞ｾ・▽
        const response = await responsePromise;
        if (response) {
          console.log(`\n藤 API繝ｬ繧ｹ繝昴Φ繧ｹ:`)
          console.log(`  URL: ${response.url()}`);
          console.log(`  Status: ${response.status()}`);
          
          if (response.status() !== 200 && response.status() !== 201) {
            const responseBody = await response.text();
            console.log(`  繧ｨ繝ｩ繝ｼ蜀・ｮｹ: ${responseBody}`);
          }
        }
        
        // 邨先棡繧貞ｾ・▽
        await newPage.waitForTimeout(5000);
        
        // 迴ｾ蝨ｨ縺ｮURL縺ｨ繝壹・繧ｸ迥ｶ諷九ｒ遒ｺ隱・
        const finalUrl = newPage.url();
        console.log(`\n投 譛邨ら憾諷・`);
        console.log(`  URL: ${finalUrl}`);
        
        // 謌仙粥/繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈爾縺・
        const successMessages = await newPage.locator('.toast-success, .success-message, .alert-success').allTextContents();
        const errorMessages = await newPage.locator('.toast-error, .error-message, .alert-error, .text-red-600').allTextContents();
        
        if (successMessages.length > 0) {
          console.log('  笨・謌仙粥繝｡繝・そ繝ｼ繧ｸ:', successMessages);
        }
        
        if (errorMessages.length > 0) {
          console.log('  笶・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages);
        }
        
        // 繝輔か繝ｼ繝縺ｮ讀懆ｨｼ繧ｨ繝ｩ繝ｼ繧堤｢ｺ隱・
        const validationErrors = await newPage.locator('.field-error, .invalid-feedback, [aria-invalid="true"]').allTextContents();
        if (validationErrors.length > 0) {
          console.log('  笞・・讀懆ｨｼ繧ｨ繝ｩ繝ｼ:', validationErrors);
        }
        
        // 譛邨ゅせ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
        await newPage.screenshot({ path: 'debug-after-save.png', fullPage: true });
        
      } else {
        console.error('笶・菫晏ｭ倥・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
        
        // 繝壹・繧ｸ蜈ｨ菴薙・HTML繧貞・蜉幢ｼ医ョ繝舌ャ繧ｰ逕ｨ・・
        const bodyHtml = await newPage.locator('body').innerHTML();
        console.log('\n塘 繝壹・繧ｸ縺ｮHTML・域怙蛻昴・500譁・ｭ暦ｼ・');
        console.log(bodyHtml.substring(0, 500));
      }
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      await newPage.screenshot({ path: 'debug-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
