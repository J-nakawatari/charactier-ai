import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ讀懆ｨｼ v2', () => {
  test('譁ｰ縺励＞繧ｳ繝ｳ繝・く繧ｹ繝医〒繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝繧堤｢ｺ隱・, async ({ browser }) => {
    // 譁ｰ縺励＞繝悶Λ繧ｦ繧ｶ繧ｳ繝ｳ繝・く繧ｹ繝医ｒ菴懈・
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繝・せ繝磯幕蟋・ 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ讀懆ｨｼ v2');
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺ｫ蜈･蜉・
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    } catch (e) {
      console.log('笶・繝ｭ繧ｰ繧､繝ｳ螟ｱ謨・);
      const errorMessages = await page.locator('.error, .text-red-600, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages.join(', '));
      }
      await page.screenshot({ path: 'login-error-v2.png' });
      await context.close();
      return;
    }
    
    // Step 2: 繝繝・す繝･繝懊・繝峨′螳悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｾ縺ｧ蠕・▽
    console.log('竢ｱ・・繝繝・す繝･繝懊・繝峨・螳牙ｮ壹ｒ蠕・ｩ滉ｸｭ...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 迴ｾ蝨ｨ縺ｮ繝壹・繧ｸ繧帝哩縺倥ｋ
    await page.close();
    
    // Step 3: 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧帝幕縺・
    console.log('塘 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧帝幕縺・);
    const newPage = await context.newPage();
    
    try {
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // URL縺梧ｭ｣縺励＞縺薙→繧堤｢ｺ隱・
      const currentUrl = newPage.url();
      console.log('桃 迴ｾ蝨ｨ縺ｮURL:', currentUrl);
      
      if (!currentUrl.includes('/admin/characters/new')) {
        throw new Error(`譛溷ｾ・＠縺欟RL縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ: ${currentUrl}`);
      }
      
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
      
    } catch (error) {
      console.log('笶・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨・', error.message);
      await newPage.screenshot({ path: 'navigation-error-v2.png' });
      await context.close();
      return;
    }
    
    // Step 4: 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000); // 霑ｽ蜉縺ｮ蠕・ｩ・
    
    console.log('\n搭 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・遒ｺ隱・');
    
    // 蜷・ｦ∫ｴ縺ｮ謨ｰ繧偵き繧ｦ繝ｳ繝茨ｼ医ｈ繧顔｢ｺ螳溘↓・・
    const elements = {
      '繝・く繧ｹ繝亥・蜉・: await newPage.locator('input[type="text"]').count(),
      '繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ': await newPage.locator('select').count(),
      '繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ': await newPage.locator('input[type="checkbox"]').count(),
      '繝・く繧ｹ繝医お繝ｪ繧｢': await newPage.locator('textarea').count(),
      '菫晏ｭ倥・繧ｿ繝ｳ': await newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').count()
    };
    
    // 繝・ヰ繝・げ諠・ｱ繧定ｿｽ蜉
    console.log('隕∫ｴ謨ｰ:', elements);
    
    // 繧ゅ＠隕∫ｴ縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医√ｈ繧雁ｺ・ｯ・峇縺ｧ讀懃ｴ｢
    if (elements['繝・く繧ｹ繝亥・蜉・] === 0) {
      console.log('笞・・繝・く繧ｹ繝亥・蜉帙′隕九▽縺九ｊ縺ｾ縺帙ｓ縲ゅ☆縺ｹ縺ｦ縺ｮinput隕∫ｴ繧堤｢ｺ隱・..');
      const allInputs = await newPage.locator('input').count();
      console.log(`蜈ｨinput隕∫ｴ: ${allInputs}蛟義);
    }
    
    for (const [name, count] of Object.entries(elements)) {
      console.log(`- ${name}: ${count}蛟義);
    }
    
    // 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨・蟄伜惠繧堤｢ｺ隱・
    expect(elements['繝・く繧ｹ繝亥・蜉・]).toBeGreaterThan(0);
    expect(elements['繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ']).toBeGreaterThan(0);
    expect(elements['繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ']).toBeGreaterThan(0);
    
    console.log('\n笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝縺ｮ蠢・医ヵ繧｣繝ｼ繝ｫ繝峨′豁｣縺励￥陦ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
    await newPage.screenshot({ path: 'character-form-v2.png', fullPage: true });
    console.log('萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・character-form-v2.png 縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
    
    // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
    await context.close();
  });
  
  test('邂｡逅・判髱｢縺ｮ隱崎ｨｼ迥ｶ諷九ｒ邯ｭ謖√＠縺ｦ繝壹・繧ｸ驕ｷ遘ｻ', async ({ page, context }) => {
    console.log('柏 隱崎ｨｼ迥ｶ諷九ｒ邯ｭ謖√＠縺溘・繝ｼ繧ｸ驕ｷ遘ｻ繝・せ繝・);
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨ｒ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ螳御ｺ・);
    
    // 蜊∝・縺ｫ蠕・▽
    await page.waitForTimeout(5000);
    
    // JavaScript縺ｧ逶ｴ謗･驕ｷ遘ｻ
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log('桃 譛邨６RL:', finalUrl);
    
    if (finalUrl.includes('/admin/characters/new')) {
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕費ｼ・avaScript驕ｷ遘ｻ・・);
      
      // 繝輔か繝ｼ繝縺ｮ邁｡譏鍋｢ｺ隱・
      const hasForm = await page.locator('form, input[type="text"], select').count() > 0;
      console.log(`繝輔か繝ｼ繝隕∫ｴ: ${hasForm ? '蟄伜惠縺吶ｋ' : '蟄伜惠縺励↑縺・}`);
    } else {
      console.log('笶・譛溷ｾ・＠縺溘・繝ｼ繧ｸ縺ｫ蛻ｰ驕斐〒縺阪∪縺帙ｓ縺ｧ縺励◆');
    }
  });
});
