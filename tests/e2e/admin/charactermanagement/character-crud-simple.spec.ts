import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・- 繧ｷ繝ｳ繝励Ν繝・せ繝・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('邂｡逅・・Ο繧ｰ繧､繝ｳ縺ｨ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ陦ｨ遉ｺ', async ({ page }) => {
    console.log('噫 繧ｷ繝ｳ繝励Ν繝・せ繝磯幕蟋・);
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺ｮ蟄伜惠遒ｺ隱・
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // 繝ｭ繧ｰ繧､繝ｳ諠・ｱ蜈･蜉・
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    
    // 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧ｯ繝ｪ繝・け
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ遘ｻ蜍・
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 繝壹・繧ｸ繧ｿ繧､繝医Ν縺ｾ縺溘・繝倥ャ繝繝ｼ縺ｮ遒ｺ隱・
    const pageTitle = await page.title();
    console.log(`塘 繝壹・繧ｸ繧ｿ繧､繝医Ν: ${pageTitle}`);
    
    // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺ｮ遒ｺ隱・
    const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")').first();
    const hasNewButton = await newButton.isVisible().catch(() => false);
    console.log(`曝 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ: ${hasNewButton ? '笨・ : '笶・}`);
    
    // 繝・・繝悶Ν縺ｾ縺溘・繝ｪ繧ｹ繝医・遒ｺ隱・
    const hasTable = await page.locator('table, .character-list').isVisible().catch(() => false);
    console.log(`投 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ: ${hasTable ? '笨・ : '笶・}`);
    
    expect(hasNewButton || hasTable).toBeTruthy();
  });

  test('譁ｰ隕上く繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・逕ｻ髱｢縺ｮ陦ｨ遉ｺ', async ({ page }) => {
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ逶ｴ謗･驕ｷ遘ｻ
    await page.goto('/admin/characters/new');
    await page.waitForLoadState('networkidle');
    
    // 繝輔か繝ｼ繝隕∫ｴ縺ｮ遒ｺ隱・
    const formChecks = {
      蜷榊燕蜈･蜉・ await page.locator('input[type="text"]').first().isVisible(),
      隱ｬ譏主・蜉・ await page.locator('textarea').first().isVisible(),
      諤ｧ蛻･驕ｸ謚・ await page.locator('select').first().isVisible(),
      菫晏ｭ倥・繧ｿ繝ｳ: await page.locator('button[type="submit"]').isVisible(),
    };
    
    console.log('統 繝輔か繝ｼ繝隕∫ｴ繝√ぉ繝・け:');
    Object.entries(formChecks).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value ? '笨・ : '笶・}`);
    });
    
    // 蝓ｺ譛ｬ逧・↑繝輔か繝ｼ繝隕∫ｴ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
    expect(formChecks.蜷榊燕蜈･蜉・.toBeTruthy();
    expect(formChecks.菫晏ｭ倥・繧ｿ繝ｳ).toBeTruthy();
  });
});
