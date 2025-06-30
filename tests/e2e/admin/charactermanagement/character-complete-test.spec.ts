import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 螳悟・迚・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('蜈ｨ蠢・磯・岼繧貞・蜉帙＠縺ｦ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽ懈・', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 螳悟・迚医ユ繧ｹ繝磯幕蟋・);
    
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
      
      console.log('\n統 蜈ｨ蠢・磯・岼繧貞・蜉・');
      const timestamp = Date.now();
      
      // 1. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      const textInputs = await newPage.locator('input[type="text"]').all();
      await textInputs[0].fill(`螳悟・繝・せ繝医く繝｣繝ｩ_${timestamp}`);
      await textInputs[1].fill(`Complete Test ${timestamp}`);
      console.log('笨・1. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・);
      
      // 2. 隱ｬ譏趣ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・- API繧ｨ繝ｩ繝ｼ縺九ｉ蠢・医→蛻､譏・
      const textareas = await newPage.locator('textarea').all();
      if (textareas.length >= 2) {
        await textareas[0].fill('螳悟・縺ｪ繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶ょ・縺ｦ縺ｮ蠢・磯・岼繧貞・蜉帙＠縺ｦ縺・∪縺吶・);
        await textareas[1].fill('This is a complete test character with all required fields filled.');
        console.log('笨・2. 隱ｬ譏趣ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・);
      }
      
      // 3. 蟷ｴ鮨｢・・ge・・- API繧ｨ繝ｩ繝ｼ縺九ｉ蠢・医→蛻､譏・
      if (textInputs.length > 2) {
        // 3逡ｪ逶ｮ縺ｮ繝・く繧ｹ繝亥・蜉帙′蟷ｴ鮨｢繝輔ぅ繝ｼ繝ｫ繝峨・蜿ｯ閭ｽ諤ｧ
        await textInputs[2].fill('20豁ｳ');
        console.log('笨・3. 蟷ｴ鮨｢');
      }
      
      // 4. 閨ｷ讌ｭ・・ccupation・・- API繧ｨ繝ｩ繝ｼ縺九ｉ蠢・医→蛻､譏・
      if (textInputs.length > 3) {
        // 4逡ｪ逶ｮ縺ｮ繝・く繧ｹ繝亥・蜉帙′閨ｷ讌ｭ繝輔ぅ繝ｼ繝ｫ繝峨・蜿ｯ閭ｽ諤ｧ
        await textInputs[3].fill('AI繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝・);
        console.log('笨・4. 閨ｷ讌ｭ');
      }
      
      // 5. 諤ｧ蛻･縺ｨ諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ
      const selects = await newPage.locator('select').all();
      if (selects.length > 0) {
        // 諤ｧ蛻･
        await selects[0].selectOption({ index: 1 });
        console.log('笨・5. 諤ｧ蛻･');
      }
      
      if (selects.length > 1) {
        // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`笨・6. 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ: ${value}`);
            break;
          }
        }
      }
      
      // 6. 諤ｧ譬ｼ繧ｿ繧ｰ
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      console.log('笨・7. 諤ｧ譬ｼ繧ｿ繧ｰ');
      
      // 7. Stripe Product ID - API繧ｨ繝ｩ繝ｼ縺九ｉ蠢・医→蛻､譏・
      // price_縺ｧ蟋九∪繧紀D繧呈爾縺・
      const stripeInputs = await newPage.locator('input[placeholder*="price_"]').all();
      if (stripeInputs.length > 0) {
        // 繝・せ繝育畑縺ｮ繝繝溘・ID繧貞・蜉・
        await stripeInputs[0].fill('price_test_1234567890');
        console.log('笨・8. Stripe Product ID');
      } else {
        // placeholder縺ｧ隕九▽縺九ｉ縺ｪ縺・ｴ蜷医∝ｾ後ｍ縺ｮ譁ｹ縺ｮ繝・く繧ｹ繝亥・蜉帙ｒ隧ｦ縺・
        for (let i = 4; i < textInputs.length; i++) {
          const placeholder = await textInputs[i].getAttribute('placeholder');
          if (placeholder && placeholder.includes('price_')) {
            await textInputs[i].fill('price_test_1234567890');
            console.log(`笨・8. Stripe Product ID (input[${i}])`);
            break;
          }
        }
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'complete-test-before-save.png', fullPage: true });
      
      // 菫晏ｭ・
      console.log('\n沈 菫晏ｭ伜・逅・..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
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
        
        if (status === 200 || status === 201) {
          console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・謌仙粥・・);
        } else {
          const responseBody = await response.json().catch(() => response.text());
          console.log('繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:');
          console.log(JSON.stringify(responseBody, null, 2));
        }
      }
      
      // 邨先棡繧貞ｾ・▽
      await newPage.waitForTimeout(5000);
      
      // 謌仙粥蛻､螳・
      const finalUrl = newPage.url();
      const isSuccess = 
        !finalUrl.includes('/new') || 
        await newPage.locator('.toast-success').isVisible().catch(() => false) ||
        finalUrl.includes('/admin/characters/') && !finalUrl.includes('/new');
      
      console.log('\n投 譛邨らｵ先棡:');
      console.log(`- URL: ${finalUrl}`);
      console.log(`- 謌仙粥: ${isSuccess ? '笨・ : '笶・}`);
      
      if (!isSuccess) {
        const errors = await newPage.locator('.error, .text-red-600').allTextContents();
        console.log('- 繧ｨ繝ｩ繝ｼ:', errors);
        await newPage.screenshot({ path: 'complete-test-after-save.png', fullPage: true });
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});
