import { test, expect } from '@playwright/test';

test.describe('遒ｺ螳溽沿・壹く繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝繝・せ繝・, () => {
  test('繧ｻ繝・す繝ｧ繝ｳCookie繧剃ｽｿ逕ｨ縺励※繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ', async ({ browser }) => {
    console.log('噫 遒ｺ螳溽沿繝・せ繝磯幕蟋・);
    
    // Step 1: 譁ｰ縺励＞繧ｳ繝ｳ繝・く繧ｹ繝医〒繝ｭ繧ｰ繧､繝ｳ
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    
    await loginPage.goto('/admin/login');
    await loginPage.fill('input[type="email"]', 'admin@example.com');
    await loginPage.fill('input[type="password"]', 'admin123');
    await loginPage.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    await loginPage.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // Cookie繧貞叙蠕・
    const cookies = await context.cookies();
    console.log(`根 ${cookies.length}蛟九・Cookie繧貞叙蠕輿);
    
    // 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ繧帝哩縺倥ｋ
    await loginPage.close();
    
    // Step 2: 蜊∝・縺ｪ蠕・ｩ滓凾髢・
    console.log('竢ｱ・・5遘貞ｾ・ｩ滉ｸｭ...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: 蜷後§繧ｳ繝ｳ繝・く繧ｹ繝医〒譁ｰ縺励＞繝壹・繧ｸ繧帝幕縺・
    const characterPage = await context.newPage();
    
    // 逶ｴ謗･繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ
    await characterPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    console.log('桃 URL:', characterPage.url());
    
    // Step 4: 繝壹・繧ｸ縺梧ｭ｣縺励￥隱ｭ縺ｿ霎ｼ縺ｾ繧後◆縺狗｢ｺ隱・
    const isCharacterNewPage = characterPage.url().includes('/admin/characters/new');
    if (!isCharacterNewPage) {
      console.log('笶・譛溷ｾ・＠縺欟RL縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ:', characterPage.url());
      await characterPage.screenshot({ path: 'unexpected-page.png' });
      throw new Error('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕斐〒縺阪∪縺帙ｓ縺ｧ縺励◆');
    }
    
    // Step 5: 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・讀懆ｨｼ
    console.log('\n搭 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・讀懆ｨｼ:');
    
    // 蜷・ヵ繧｣繝ｼ繝ｫ繝峨・蟄伜惠繧堤｢ｺ隱・
    const fields = {
      '繝・く繧ｹ繝亥・蜉・: await characterPage.locator('input[type="text"]').count(),
      '繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ': await characterPage.locator('select').count(),
      '繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ': await characterPage.locator('input[type="checkbox"]').count(),
      '繝・く繧ｹ繝医お繝ｪ繧｢': await characterPage.locator('textarea').count(),
      '菫晏ｭ倥・繧ｿ繝ｳ': await characterPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').count()
    };
    
    for (const [name, count] of Object.entries(fields)) {
      console.log(`- ${name}: ${count}蛟義);
    }
    
    // Step 6: 蝓ｺ譛ｬ逧・↑蜈･蜉帙ユ繧ｹ繝・
    if (fields['繝・く繧ｹ繝亥・蜉・] > 0) {
      await characterPage.locator('input[type="text"]').first().fill('繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷・);
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷阪ｒ蜈･蜉・);
    }
    
    if (fields['繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ'] > 0) {
      const select = characterPage.locator('select').first();
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
        console.log('笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・);
      }
    }
    
    if (fields['繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ'] > 0) {
      await characterPage.locator('input[type="checkbox"]').first().click();
      console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・);
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await characterPage.screenshot({ path: 'foolproof-test-result.png', fullPage: true });
    console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・foolproof-test-result.png 縺ｫ菫晏ｭ・);
    
    // 繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ
    expect(fields['繝・く繧ｹ繝亥・蜉・]).toBeGreaterThan(0);
    expect(fields['繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ']).toBeGreaterThan(0);
    expect(fields['繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ']).toBeGreaterThan(0);
    
    // 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
    await context.close();
    console.log('\n笨・繝・せ繝亥ｮ御ｺ・);
  });
  
  test('邂｡逅・判髱｢縺ｮ蝓ｺ譛ｬ逧・↑蜍穂ｽ懃｢ｺ隱・, async ({ page }) => {
    console.log('剥 邂｡逅・判髱｢縺ｮ蝓ｺ譛ｬ蜍穂ｽ懊ｒ遒ｺ隱・);
    
    // 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｮ遒ｺ隱・
    await page.goto('/admin/login');
    const hasEmailInput = await page.locator('input[type="email"]').isVisible();
    const hasPasswordInput = await page.locator('input[type="password"]').isVisible();
    const hasSubmitButton = await page.locator('button[type="submit"]').isVisible();
    
    console.log('繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝隕∫ｴ:');
    console.log(`- Email蜈･蜉・ ${hasEmailInput ? '笨・ : '笶・}`);
    console.log(`- Password蜈･蜉・ ${hasPasswordInput ? '笨・ : '笶・}`);
    console.log(`- 騾∽ｿ｡繝懊ち繝ｳ: ${hasSubmitButton ? '笨・ : '笶・}`);
    
    expect(hasEmailInput).toBeTruthy();
    expect(hasPasswordInput).toBeTruthy();
    expect(hasSubmitButton).toBeTruthy();
  });
});
