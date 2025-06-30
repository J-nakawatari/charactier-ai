import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ', () => {
  test('逶ｴ謗･URL縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ', async ({ page }) => {
    console.log('噫 繝・せ繝磯幕蟋・ 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ');
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // 繝ｭ繧ｰ繧､繝ｳ蠕後・繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // Step 2: 繝繝・す繝･繝懊・繝峨′螳悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｾ縺ｧ蠕・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 霑ｽ蜉縺ｮ螳牙・縺ｪ蠕・ｩ・
    
    // Step 3: 譁ｰ縺励＞繧ｿ繝悶〒髢九￥縺ｮ縺ｨ蜷後§繧医≧縺ｫ縲∝ｮ悟・縺ｫ譁ｰ縺励＞繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ縺ｨ縺励※蜃ｦ逅・
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // 繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
    await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    
    // Step 4: 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・遒ｺ隱・
    console.log('\n統 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・遒ｺ隱・');
    
    // 蝓ｺ譛ｬ逧・↑繝輔か繝ｼ繝隕∫ｴ縺ｮ蟄伜惠繧堤｢ｺ隱・
    const formElements = {
      '繝・く繧ｹ繝亥・蜉・: 'input[type="text"]',
      '繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ': 'select',
      '繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ': 'input[type="checkbox"]',
      '繝・く繧ｹ繝医お繝ｪ繧｢': 'textarea',
      '菫晏ｭ倥・繧ｿ繝ｳ': 'button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")'
    };
    
    for (const [name, selector] of Object.entries(formElements)) {
      const count = await page.locator(selector).count();
      console.log(`- ${name}: ${count}蛟義);
    }
    
    // Step 5: 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨・繝・せ繝亥・蜉・
    try {
      // 蜷榊燕繝輔ぅ繝ｼ繝ｫ繝峨↓蜈･蜉・
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ');
      console.log('笨・蜷榊燕繝輔ぅ繝ｼ繝ｫ繝峨↓蜈･蜉・);
      
      // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・
      const selectBox = page.locator('select').first();
      if (await selectBox.isVisible()) {
        const options = await selectBox.locator('option').allTextContents();
        console.log('諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ縺ｮ繧ｪ繝励す繝ｧ繝ｳ:', options.slice(0, 5)); // 譛蛻昴・5蛟九ｒ陦ｨ遉ｺ
        
        if (options.length > 1) {
          await selectBox.selectOption({ index: 1 });
          console.log('笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・);
        }
      }
      
      // 諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・);
      }
      
    } catch (error) {
      console.log('笞・・繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・謫堺ｽ應ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ:', error);
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
    await page.screenshot({ path: 'character-form-direct.png', fullPage: true });
    console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・character-form-direct.png 縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
  });
});
