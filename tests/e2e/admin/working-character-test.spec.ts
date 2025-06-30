import { test, expect } from '@playwright/test';

test.describe('蜍穂ｽ懃｢ｺ隱肴ｸ医∩縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繝・せ繝・, () => {
  test('debug-character-form縺ｨ蜷後§繧｢繝励Ο繝ｼ繝√ｒ菴ｿ逕ｨ', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 蜍穂ｽ懃｢ｺ隱肴ｸ医∩繧｢繝励Ο繝ｼ繝√〒繝・せ繝磯幕蟋・);
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ・・ebug-character-form縺ｨ蜷後§・・
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
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
    
    // Step 4: 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000);
    
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    console.log('桃 URL:', newPage.url());
    
    // Step 5: 繝輔か繝ｼ繝隕∫ｴ縺ｮ遒ｺ隱・
    const elements = {
      '繝・く繧ｹ繝亥・蜉・: await newPage.locator('input[type="text"]').count(),
      '繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ': await newPage.locator('select').count(),
      '繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ': await newPage.locator('input[type="checkbox"]').count(),
      '繝・く繧ｹ繝医お繝ｪ繧｢': await newPage.locator('textarea').count(),
      '菫晏ｭ倥・繧ｿ繝ｳ': await newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').count()
    };
    
    console.log('\n搭 繝輔か繝ｼ繝隕∫ｴ:', elements);
    
    // Step 6: 螳滄圀縺ｫ繝輔か繝ｼ繝縺ｫ蜈･蜉帙＠縺ｦ縺ｿ繧・
    if (elements['繝・く繧ｹ繝亥・蜉・] > 0) {
      const nameInput = newPage.locator('input[type="text"]').first();
      await nameInput.fill('繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ_' + Date.now());
      console.log('笨・蜷榊燕繧貞・蜉・);
    }
    
    if (elements['繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ'] > 0) {
      const select = newPage.locator('select').first();
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
        console.log('笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・);
      }
    }
    
    if (elements['繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ'] > 0) {
      await newPage.locator('input[type="checkbox"]').first().click();
      console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・);
    }
    
    if (elements['繝・く繧ｹ繝医お繝ｪ繧｢'] > 0) {
      const textarea = newPage.locator('textarea').first();
      await textarea.fill('縺薙ｌ縺ｯE2E繝・せ繝医〒菴懈・縺輔ｌ縺溘く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
      console.log('笨・隱ｬ譏弱ｒ蜈･蜉・);
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await newPage.screenshot({ path: 'working-character-form.png', fullPage: true });
    console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・working-character-form.png 縺ｫ菫晏ｭ・);
    
    // 繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ
    expect(elements['繝・く繧ｹ繝亥・蜉・]).toBeGreaterThan(0);
    expect(elements['繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ']).toBeGreaterThan(0);
    expect(elements['繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ']).toBeGreaterThan(0);
    
    console.log('\n笨・縺吶∋縺ｦ縺ｮ繝・せ繝医′謌仙粥縺励∪縺励◆・・);
    
    await context.close();
  });
  
  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｮ遒ｺ隱・, async ({ browser }) => {
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await loginPage.goto('/admin/login');
    await loginPage.fill('input[type="email"]', 'admin@example.com');
    await loginPage.fill('input[type="password"]', 'admin123');
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await loginPage.waitForTimeout(3000);
    await loginPage.close();
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繧帝幕縺・
    const listPage = await context.newPage();
    await listPage.goto('/admin/characters', { waitUntil: 'networkidle' });
    await listPage.waitForTimeout(2000);
    
    console.log('桃 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ:', listPage.url());
    
    // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺・
    const newButton = listPage.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")');
    const buttonExists = await newButton.count() > 0;
    console.log(`譁ｰ隕丈ｽ懈・繝懊ち繝ｳ: ${buttonExists ? '笨・蟄伜惠縺吶ｋ' : '笶・蟄伜惠縺励↑縺・}`);
    
    if (buttonExists) {
      await newButton.first().click();
      await listPage.waitForURL('**/admin/characters/new', { timeout: 10000 });
      console.log('笨・譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺九ｉ驕ｷ遘ｻ謌仙粥');
    }
    
    await context.close();
  });
});
