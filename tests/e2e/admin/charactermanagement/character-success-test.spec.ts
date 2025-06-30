import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・ - 謌仙粥迚・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ縺ｫ蝓ｺ縺･縺・◆豁｣遒ｺ縺ｪ蜈･蜉・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 謌仙粥迚医ユ繧ｹ繝磯幕蟋・);
    
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
      
      console.log('\n統 繝輔か繝ｼ繝蜈･蜉幃幕蟋具ｼ医せ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ騾壹ｊ・・');
      const timestamp = Date.now();
      
      // === 蝓ｺ譛ｬ諠・ｱ ===
      const textInputs = await newPage.locator('input[type="text"]').all();
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      await textInputs[0].fill(`謌仙粥繝・せ繝医く繝｣繝ｩ_${timestamp}`);
      await textInputs[1].fill(`Success Test ${timestamp}`);
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・);
      
      // 繧ｭ繝｣繝・ヨ繝輔Ξ繝ｼ繧ｺ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      await textInputs[2].fill('繝・せ繝医・繧ｭ繝｣繝・メ繝輔Ξ繝ｼ繧ｺ');
      await textInputs[3].fill('Test catchphrase');
      console.log('笨・繧ｭ繝｣繝・ヨ繝輔Ξ繝ｼ繧ｺ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・);
      
      // === 繝・く繧ｹ繝医お繝ｪ繧｢・郁ｪｬ譏趣ｼ・===
      const textareas = await newPage.locator('textarea').all();
      
      // 隱ｬ譏趣ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      await textareas[0].fill('謌仙粥繝・せ繝育畑縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶ょ・縺ｦ縺ｮ蠢・磯・岼繧呈ｭ｣縺励￥蜈･蜉帙＠縺ｦ縺・∪縺吶・);
      await textareas[1].fill('This is a success test character with all required fields properly filled.');
      console.log('笨・隱ｬ譏趣ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・);
      
      // === 諤ｧ譬ｼ繝ｻ迚ｹ蠕ｴ險ｭ螳・===
      const selects = await newPage.locator('select').all();
      
      // 諤ｧ蛻･・・逡ｪ逶ｮ縺ｮselect・・
      await selects[0].selectOption({ index: 1 }); // 螂ｳ諤ｧ繧帝∈謚・
      console.log('笨・諤ｧ蛻･');
      
      // 蟷ｴ鮨｢・・逡ｪ逶ｮ縺ｮ繝・く繧ｹ繝亥・蜉幢ｼ・
      if (textInputs.length > 4) {
        await textInputs[4].fill('20豁ｳ');
        console.log('笨・蟷ｴ鮨｢');
      }
      
      // 閨ｷ讌ｭ繝ｻ閧ｩ譖ｸ・・逡ｪ逶ｮ縺ｮ繝・く繧ｹ繝亥・蜉幢ｼ・
      if (textInputs.length > 5) {
        await textInputs[5].fill('AI繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝・);
        console.log('笨・閨ｷ讌ｭ繝ｻ閧ｩ譖ｸ');
      }
      
      // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・・逡ｪ逶ｮ縺ｮselect・・
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ: ${value}`);
            break;
          }
        }
      }
      
      // 諤ｧ譬ｼ繧ｿ繧ｰ・域怙菴・縺､・・
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ');
      }
      
      // === AI繝ｻ繧｢繧ｯ繧ｻ繧ｹ險ｭ螳・===
      // AI繝｢繝・Ν・・逡ｪ逶ｮ縺ｮselect・・ 繝・ヵ繧ｩ繝ｫ繝医〒OK
      
      // 繧｢繧ｯ繧ｻ繧ｹ繧ｿ繧､繝暦ｼ・逡ｪ逶ｮ縺ｮselect・・ 繝・ヵ繧ｩ繝ｫ繝医〒OK
      
      // === 繝励Ο繝ｳ繝励ヨ繝ｻ繝｡繝・そ繝ｼ繧ｸ險ｭ螳・===
      // 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      if (textareas.length >= 4) {
        await textareas[2].fill('縺薙ｓ縺ｫ縺｡縺ｯ・∫ｧ√・謌仙粥繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶ゅｈ繧阪＠縺上♀鬘倥＞縺励∪縺呻ｼ・);
        await textareas[3].fill('Hello! I am a success test character. Nice to meet you!');
        console.log('笨・繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・);
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await newPage.screenshot({ path: 'success-test-before-save.png', fullPage: true });
      console.log('\n萄 蜈･蜉帛ｮ御ｺ・せ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・);
      
      // 菫晏ｭ・
      console.log('\n沈 菫晏ｭ伜・逅・..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // API繝ｬ繧ｹ繝昴Φ繧ｹ繧堤屮隕・
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
        await newPage.screenshot({ path: 'success-test-error.png', fullPage: true });
      } else {
        console.log('\n脂 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・謌仙粥・・);
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      await newPage.screenshot({ path: 'success-test-exception.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
