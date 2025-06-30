import { test, expect } from '@playwright/test';

test.describe('譛蟆城剞縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝・, () => {
  test('繧ｻ繝・す繝ｧ繝ｳ邯ｭ謖√〒繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ', async ({ page, context }) => {
    console.log('噫 譛蟆城剞縺ｮ繝・せ繝磯幕蟋・);
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨↓蛻ｰ驕斐☆繧九∪縺ｧ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // Step 2: 蜊∝・縺ｪ蠕・ｩ滓凾髢薙ｒ遒ｺ菫・
    await page.waitForTimeout(5000);
    console.log('竢ｱ・・5遘貞ｾ・ｩ溷ｮ御ｺ・);
    
    // Step 3: 譁ｰ縺励＞繝壹・繧ｸ繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧帝幕縺・
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters/new');
    await newPage.waitForLoadState('networkidle');
    
    console.log('笨・譁ｰ縺励＞繧ｿ繝悶〒繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧帝幕縺阪∪縺励◆');
    console.log('桃 URL:', newPage.url());
    
    // Step 4: 繝輔か繝ｼ繝縺ｮ蝓ｺ譛ｬ遒ｺ隱・
    const hasTextInput = await newPage.locator('input[type="text"]').count() > 0;
    const hasSelect = await newPage.locator('select').count() > 0;
    const hasCheckbox = await newPage.locator('input[type="checkbox"]').count() > 0;
    const hasTextarea = await newPage.locator('textarea').count() > 0;
    const hasSubmitButton = await newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').count() > 0;
    
    console.log('\n搭 繝輔か繝ｼ繝隕∫ｴ縺ｮ遒ｺ隱・');
    console.log(`- 繝・く繧ｹ繝亥・蜉・ ${hasTextInput ? '笨・ : '笶・}`);
    console.log(`- 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ: ${hasSelect ? '笨・ : '笶・}`);
    console.log(`- 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ: ${hasCheckbox ? '笨・ : '笶・}`);
    console.log(`- 繝・く繧ｹ繝医お繝ｪ繧｢: ${hasTextarea ? '笨・ : '笶・}`);
    console.log(`- 騾∽ｿ｡繝懊ち繝ｳ: ${hasSubmitButton ? '笨・ : '笶・}`);
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await newPage.screenshot({ path: 'minimal-test-result.png' });
    console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・minimal-test-result.png 縺ｫ菫晏ｭ・);
    
    // 蠢・医ヵ繧｣繝ｼ繝ｫ繝峨′縺吶∋縺ｦ蟄伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
    expect(hasTextInput).toBeTruthy();
    expect(hasSelect).toBeTruthy();
    expect(hasCheckbox).toBeTruthy();
    
    await newPage.close();
  });
});
