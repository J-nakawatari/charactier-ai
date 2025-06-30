import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ繝・ヰ繝・げ', () => {
  test('繝輔か繝ｼ繝縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ迥ｶ諷九ｒ隧ｳ邏ｰ縺ｫ遒ｺ隱・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繝・ヰ繝・げ繝・せ繝磯幕蟋・);
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ
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
      await page.screenshot({ path: 'login-failed-debug.png' });
      await context.close();
      return;
    }
    
    // Step 2: 蜊∝・縺ｪ蠕・ｩ・
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 譁ｰ縺励＞繝壹・繧ｸ縺ｧ髢九￥
    const newPage = await context.newPage();
    console.log('\n塘 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧帝幕縺・..');
    
    // 繝阪ャ繝医Ρ繝ｼ繧ｯ繝ｭ繧ｰ繧呈怏蜉ｹ蛹・
    newPage.on('response', response => {
      if (response.url().includes('/admin/characters/new')) {
        console.log(`藤 Response: ${response.status()} ${response.url()}`);
      }
    });
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Step 4: 繝壹・繧ｸ縺ｮ迥ｶ諷九ｒ隧ｳ縺励￥遒ｺ隱・
    console.log('\n剥 繝壹・繧ｸ迥ｶ諷九・遒ｺ隱・');
    console.log('- URL:', newPage.url());
    console.log('- 繧ｿ繧､繝医Ν:', await newPage.title());
    
    // HTML縺ｮ蜀・ｮｹ繧堤｢ｺ隱・
    const bodyText = await newPage.locator('body').innerText();
    console.log('- 繝壹・繧ｸ縺ｮ譛蛻昴・100譁・ｭ・', bodyText.substring(0, 100));
    
    // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈爾縺・
    const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('笞・・繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages);
    }
    
    // Step 5: 繝輔か繝ｼ繝隕∫ｴ繧呈ｮｵ髫守噪縺ｫ遒ｺ隱・
    console.log('\n搭 繝輔か繝ｼ繝隕∫ｴ縺ｮ隧ｳ邏ｰ遒ｺ隱・');
    
    // 蝓ｺ譛ｬ逧・↑隕∫ｴ縺ｮ蟄伜惠遒ｺ隱・
    const formExists = await newPage.locator('form').count() > 0;
    console.log(`- <form>繧ｿ繧ｰ: ${formExists ? '蟄伜惠縺吶ｋ' : '蟄伜惠縺励↑縺・}`);
    
    // 繧医ｊ蠎・ｯ・↑繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ縺ｧ遒ｺ隱・
    const inputElements = {
      '縺吶∋縺ｦ縺ｮ<input>': await newPage.locator('input').count(),
      '繝・く繧ｹ繝亥梛<input>': await newPage.locator('input[type="text"]').count(),
      '縺吶∋縺ｦ縺ｮ<select>': await newPage.locator('select').count(),
      '縺吶∋縺ｦ縺ｮ<textarea>': await newPage.locator('textarea').count(),
      '縺吶∋縺ｦ縺ｮ<button>': await newPage.locator('button').count(),
      'type=submit縺ｮ繝懊ち繝ｳ': await newPage.locator('button[type="submit"]').count()
    };
    
    for (const [name, count] of Object.entries(inputElements)) {
      console.log(`- ${name}: ${count}蛟義);
    }
    
    // Step 6: 蜈ｷ菴鍋噪縺ｪ繝輔ぅ繝ｼ繝ｫ繝峨ｒ蜷榊燕縺ｧ謗｢縺・
    console.log('\n剥 蜈ｷ菴鍋噪縺ｪ繝輔ぅ繝ｼ繝ｫ繝峨・讀懃ｴ｢:');
    
    const fieldSelectors = [
      { name: '蜷榊燕繝輔ぅ繝ｼ繝ｫ繝・, selectors: ['input[name*="name"]', 'input[placeholder*="蜷榊燕"]', 'input[placeholder*="Name"]'] },
      { name: '隱ｬ譏弱ヵ繧｣繝ｼ繝ｫ繝・, selectors: ['textarea[name*="description"]', 'textarea[placeholder*="隱ｬ譏・]'] },
      { name: '諤ｧ譬ｼ驕ｸ謚・, selectors: ['select[name*="personality"]', 'select[name*="preset"]'] },
      { name: '菫晏ｭ倥・繧ｿ繝ｳ', selectors: ['button:has-text("菫晏ｭ・)', 'button:has-text("菴懈・")', 'button:has-text("Save")'] }
    ];
    
    for (const field of fieldSelectors) {
      let found = false;
      for (const selector of field.selectors) {
        const count = await newPage.locator(selector).count();
        if (count > 0) {
          console.log(`笨・${field.name}: "${selector}" 縺ｧ ${count}蛟玖ｦ九▽縺九ｊ縺ｾ縺励◆`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`笶・${field.name}: 隕九▽縺九ｊ縺ｾ縺帙ｓ`);
      }
    }
    
    // Step 7: 繝壹・繧ｸ蜈ｨ菴薙・讒矩繧堤｢ｺ隱・
    console.log('\n盗 繝壹・繧ｸ讒矩縺ｮ遒ｺ隱・');
    const mainContent = await newPage.locator('main, .main-content, #content, .container').count();
    console.log(`- 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・お繝ｪ繧｢: ${mainContent}蛟義);
    
    const sidebar = await newPage.locator('aside, .sidebar, nav').count();
    console.log(`- 繧ｵ繧､繝峨ヰ繝ｼ/繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ: ${sidebar}蛟義);
    
    // Step 8: JavaScript繧ｨ繝ｩ繝ｼ繧堤｢ｺ隱・
    const jsErrors: string[] = [];
    newPage.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await newPage.waitForTimeout(2000);
    if (jsErrors.length > 0) {
      console.log('\n笶・JavaScript繧ｨ繝ｩ繝ｼ:');
      jsErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await newPage.screenshot({ path: 'debug-character-form.png', fullPage: true });
    console.log('\n萄 繝・ヰ繝・げ逕ｨ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・debug-character-form.png 縺ｫ菫晏ｭ・);
    
    // HTML繧剃ｿ晏ｭ・
    const html = await newPage.content();
    require('fs').writeFileSync('debug-character-form.html', html);
    console.log('塘 HTML繧・debug-character-form.html 縺ｫ菫晏ｭ・);
    
    await context.close();
  });
});
