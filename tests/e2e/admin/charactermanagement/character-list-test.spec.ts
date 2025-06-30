import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ逕ｻ髱｢縺ｮ繝・せ繝・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ逕ｻ髱｢縺ｮ隕∫ｴ遒ｺ隱・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ逕ｻ髱｢繝・せ繝磯幕蟋・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 1. 繝倥ャ繝繝ｼ隕∫ｴ縺ｮ遒ｺ隱・
      console.log('\n搭 繝倥ャ繝繝ｼ隕∫ｴ縺ｮ遒ｺ隱・');
      
      // 繧ｿ繧､繝医Ν
      const title = await page.locator('h1:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・)').isVisible();
      console.log(`- 繧ｿ繧､繝医Ν縲後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・ ${title ? '笨・ : '笶・}`);
      
      // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ・亥承荳翫・邏ｫ濶ｲ縺ｮ繝懊ち繝ｳ・・
      const newButton = await page.locator('button:has-text("譁ｰ隕丈ｽ懈・")').isVisible();
      console.log(`- 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ: ${newButton ? '笨・ : '笶・}`);
      
      // 邨ｱ險医き繝ｼ繝・
      const statsCards = await page.locator('.grid > div').count();
      console.log(`- 邨ｱ險医き繝ｼ繝画焚: ${statsCards}`);
      
      // 2. 讀懃ｴ｢繝ｻ繝輔ぅ繝ｫ繧ｿ繝ｼ讖溯・縺ｮ遒ｺ隱・
      console.log('\n剥 讀懃ｴ｢繝ｻ繝輔ぅ繝ｫ繧ｿ繝ｼ讖溯・:');
      
      // 讀懃ｴ｢繝懊ャ繧ｯ繧ｹ
      const searchInput = await page.locator('input[placeholder*="繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ讀懃ｴ｢"]').isVisible();
      console.log(`- 讀懃ｴ｢繝懊ャ繧ｯ繧ｹ: ${searchInput ? '笨・ : '笶・}`);
      
      // 繝輔ぅ繝ｫ繧ｿ繝ｼ繝懊ち繝ｳ
      const filterButton = await page.locator('button:has-text("繝輔ぅ繝ｫ繧ｿ繝ｼ")').isVisible();
      console.log(`- 繝輔ぅ繝ｫ繧ｿ繝ｼ繝懊ち繝ｳ: ${filterButton ? '笨・ : '笶・}`);
      
      // 繧ｨ繧ｯ繧ｹ繝昴・繝医・繧ｿ繝ｳ
      const exportButton = await page.locator('button:has-text("繧ｨ繧ｯ繧ｹ繝昴・繝・)').isVisible();
      console.log(`- 繧ｨ繧ｯ繧ｹ繝昴・繝医・繧ｿ繝ｳ: ${exportButton ? '笨・ : '笶・}`);
      
      // 3. 繝・・繝悶Ν縺ｮ遒ｺ隱・
      console.log('\n投 繝・・繝悶Ν讒矩:');
      
      // 繝・・繝悶Ν繝倥ャ繝繝ｼ
      const headers = await page.locator('thead th').allTextContents();
      console.log('- 繝倥ャ繝繝ｼ:', headers);
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ陦梧焚
      const rows = await page.locator('tbody tr').count();
      console.log(`- 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ謨ｰ: ${rows}陦形);
      
      // 4. 蜷・｡後・隕∫ｴ遒ｺ隱搾ｼ域怙蛻昴・陦鯉ｼ・
      if (rows > 0) {
        console.log('\n統 譛蛻昴・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ陦後・遒ｺ隱・');
        const firstRow = page.locator('tbody tr').first();
        
        // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷阪→ID
        const characterInfo = await firstRow.locator('td').first().textContent();
        console.log(`- 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ諠・ｱ: ${characterInfo}`);
        
        // 繧ｹ繝・・繧ｿ繧ｹ・亥・髢倶ｸｭ・・
        const status = await firstRow.locator('span:has-text("蜈ｬ髢倶ｸｭ")').isVisible();
        console.log(`- 繧ｹ繝・・繧ｿ繧ｹ縲悟・髢倶ｸｭ縲・ ${status ? '笨・ : '笶・}`);
        
        // 謫堺ｽ懊・繧ｿ繝ｳ・育ｷｨ髮・→蜑企勁・・
        const editButton = await firstRow.locator('button[title*="邱ｨ髮・], a[href*="/edit"]').isVisible();
        const deleteButton = await firstRow.locator('button[title*="蜑企勁"]').isVisible();
        console.log(`- 邱ｨ髮・・繧ｿ繝ｳ: ${editButton ? '笨・ : '笶・}`);
        console.log(`- 蜑企勁繝懊ち繝ｳ: ${deleteButton ? '笨・ : '笶・}`);
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await page.screenshot({ path: 'character-list-test.png', fullPage: true });
      console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・ character-list-test.png');
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      await page.screenshot({ path: 'character-list-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });

  test('譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺ｮ繧ｯ繝ｪ繝・け', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧偵け繝ｪ繝・け
      await page.locator('button:has-text("譁ｰ隕丈ｽ懈・")').click();
      
      // 繝壹・繧ｸ驕ｷ遘ｻ繧貞ｾ・▽
      await page.waitForLoadState('networkidle');
      
      // URL縺悟､峨ｏ縺｣縺溘％縺ｨ繧堤｢ｺ隱・
      const currentUrl = page.url();
      console.log(`驕ｷ遘ｻ蜈・RL: ${currentUrl}`);
      expect(currentUrl).toContain('/characters/new');
      
    } finally {
      await context.close();
    }
  });

  test('邱ｨ髮・・繧ｿ繝ｳ縺ｮ繧ｯ繝ｪ繝・け', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 譛蛻昴・陦後・邱ｨ髮・・繧ｿ繝ｳ繧偵け繝ｪ繝・け
      const firstEditButton = page.locator('tbody tr').first().locator('button[title*="邱ｨ髮・], a[href*="/edit"]');
      
      if (await firstEditButton.isVisible()) {
        await firstEditButton.click();
        await page.waitForLoadState('networkidle');
        
        // URL縺檎ｷｨ髮・・繝ｼ繧ｸ縺ｫ螟峨ｏ縺｣縺溘％縺ｨ繧堤｢ｺ隱・
        const currentUrl = page.url();
        console.log(`邱ｨ髮・・繝ｼ繧ｸURL: ${currentUrl}`);
        expect(currentUrl).toMatch(/\/characters\/[^\/]+\/edit/);
      }
      
    } finally {
      await context.close();
    }
  });
});
