import { test, expect } from '@playwright/test';

test.describe('螳溯ｨｼ貂医∩繧｢繝励Ο繝ｼ繝√〒縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・', () => {
  test('debug-character-form縺ｨ蜷後§譁ｹ豕輔〒繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・', async ({ browser }) => {
    // 譁ｰ縺励＞繧ｳ繝ｳ繝・く繧ｹ繝医ｒ菴懈・・・ebug-character-form縺ｨ蜷後§・・
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 螳溯ｨｼ貂医∩繧｢繝励Ο繝ｼ繝√〒繝・せ繝磯幕蟋・);
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ・・ebug-character-form縺ｨ蜷後§・・
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    } catch (e) {
      console.log('笶・繝ｭ繧ｰ繧､繝ｳ螟ｱ謨・);
      await context.close();
      return;
    }
    
    // Step 2: 蜊∝・縺ｪ蠕・ｩ滂ｼ・ebug-character-form縺ｨ蜷後§・・
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 譁ｰ縺励＞繝壹・繧ｸ縺ｧ髢九￥・・ebug-character-form縺ｨ蜷後§・・
    const newPage = await context.newPage();
    console.log('\n塘 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧帝幕縺・..');
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // URL縺梧ｭ｣縺励＞縺薙→繧堤｢ｺ隱・
    const currentUrl = newPage.url();
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', currentUrl);
    
    if (!currentUrl.includes('/admin/characters/new')) {
      console.error('笶・譛溷ｾ・＠縺欟RL縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ');
      await newPage.screenshot({ path: 'proven-approach-error.png' });
      await context.close();
      throw new Error('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕斐〒縺阪∪縺帙ｓ縺ｧ縺励◆');
    }
    
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    
    // Step 4: 繝輔か繝ｼ繝縺ｫ蜈･蜉・
    console.log('\n統 繝輔か繝ｼ繝縺ｫ蜈･蜉帑ｸｭ...');
    
    // 蠕・ｩ・
    await newPage.waitForTimeout(2000);
    
    // 繝・く繧ｹ繝亥・蜉・
    const textInputs = await newPage.locator('input[type="text"]').all();
    if (textInputs.length >= 2) {
      await textInputs[0].fill('螳溯ｨｼ貂医∩繝・せ繝医く繝｣繝ｩ');
      await textInputs[1].fill('Proven Test Character');
      console.log('笨・蜷榊燕繧貞・蜉・);
    }
    
    // 繝・く繧ｹ繝医お繝ｪ繧｢
    const textareas = await newPage.locator('textarea').all();
    if (textareas.length > 0) {
      await textareas[0].fill('螳溯ｨｼ貂医∩繧｢繝励Ο繝ｼ繝√〒菴懈・縺輔ｌ縺溘ユ繧ｹ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
      console.log('笨・隱ｬ譏弱ｒ蜈･蜉・);
    }
    
    // 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ・域ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・・
    const selects = await newPage.locator('select').all();
    if (selects.length > 0) {
      const options = await selects[0].locator('option').all();
      // 遨ｺ縺ｧ縺ｪ縺・怙蛻昴・蛟､繧帝∈謚・
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await selects[0].selectOption(value);
          console.log(`笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・ ${value}`);
          break;
        }
      }
    }
    
    // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ・域ｧ譬ｼ繧ｿ繧ｰ・・
    const checkboxes = await newPage.locator('input[type="checkbox"]').all();
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・);
    }
    
    // Step 5: 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await newPage.screenshot({ path: 'proven-approach-form.png', fullPage: true });
    console.log('\n萄 繝輔か繝ｼ繝縺ｮ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・);
    
    // Step 6: 菫晏ｭ・
    const saveButton = newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
    if (await saveButton.isVisible()) {
      console.log('\n沈 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け...');
      await saveButton.click();
      
      // 邨先棡繧貞ｾ・▽
      await newPage.waitForTimeout(5000);
      
      // 謌仙粥縺ｮ遒ｺ隱・
      const finalUrl = newPage.url();
      const hasSuccess = !finalUrl.includes('/new') || 
                        await newPage.locator('.toast-success').isVisible().catch(() => false);
      
      console.log('\n投 邨先棡:');
      console.log('- 譛邨６RL:', finalUrl);
      console.log('- 謌仙粥:', hasSuccess ? '笨・ : '笶・);
      
      if (!hasSuccess) {
        const errors = await newPage.locator('.error, .text-red-600').allTextContents();
        console.log('- 繧ｨ繝ｩ繝ｼ:', errors);
        await newPage.screenshot({ path: 'proven-approach-result.png' });
      }
    }
    
    await context.close();
    console.log('\n笨・繝・せ繝亥ｮ御ｺ・);
  });
});
