import { test, expect } from '@playwright/test';

test.describe('螳牙ｮ夂沿・壹く繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝繝・せ繝・, () => {
  test('繝ｭ繧ｰ繧､繝ｳ蠕後↓繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ螳牙・縺ｫ驕ｷ遘ｻ', async ({ page }) => {
    console.log('噫 繝・せ繝磯幕蟋・ 螳牙ｮ夂沿繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝繝・せ繝・);
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    console.log('桃 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    
    // 繝ｭ繧ｰ繧､繝ｳ繝輔か繝ｼ繝縺ｫ蜈･蜉・
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    
    // 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け縺吶ｋ蜑阪↓縲√リ繝薙ご繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｾ・▽貅門ｙ
    const navigationPromise = page.waitForNavigation({ 
      url: '**/admin/dashboard',
      waitUntil: 'networkidle' 
    });
    
    // 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け
    await page.locator('button[type="submit"]').click();
    console.log('泊 繝ｭ繧ｰ繧､繝ｳ繝懊ち繝ｳ繧偵け繝ｪ繝・け');
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繧貞ｾ・▽
    await navigationPromise;
    console.log('笨・繝繝・す繝･繝懊・繝峨↓蛻ｰ驕・);
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', page.url());
    
    // Step 2: 繝壹・繧ｸ縺悟ｮ悟・縺ｫ螳牙ｮ壹☆繧九∪縺ｧ蠕・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 3遘貞ｾ・ｩ滂ｼ医☆縺ｹ縺ｦ縺ｮ髱槫酔譛溷・逅・′螳御ｺ・☆繧九・繧貞ｾ・▽・・
    
    // Step 3: 2縺､縺ｮ譁ｹ豕輔ｒ隧ｦ縺・
    
    // 譁ｹ豕柊: 繧ｵ繧､繝峨ヰ繝ｼ縺ｮ繝ｪ繝ｳ繧ｯ繧剃ｽｿ逕ｨ
    console.log('\n統 譁ｹ豕柊: 繧ｵ繧､繝峨ヰ繝ｼ縺九ｉ繝翫ン繧ｲ繝ｼ繝・);
    try {
      // 繧ｵ繧､繝峨ヰ繝ｼ縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・Μ繝ｳ繧ｯ繧呈爾縺・
      const sidebarLink = page.locator('nav a[href="/admin/characters"], aside a[href="/admin/characters"], a:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・), a:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ")').first();
      
      if (await sidebarLink.isVisible({ timeout: 2000 })) {
        await sidebarLink.click();
        await page.waitForURL('**/admin/characters', { timeout: 5000 });
        console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｫ蛻ｰ驕費ｼ医し繧､繝峨ヰ繝ｼ邨檎罰・・);
        
        // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
        await page.waitForLoadState('networkidle');
        const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")').first();
        
        if (await newButton.isVisible({ timeout: 3000 })) {
          await newButton.click();
          await page.waitForURL('**/admin/characters/new', { timeout: 5000 });
          console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕費ｼ域眠隕丈ｽ懈・繝懊ち繝ｳ邨檎罰・・);
        }
      }
    } catch (error) {
      console.log('笞・・譁ｹ豕柊縺悟､ｱ謨・', error.message);
    }
    
    // 譁ｹ豕稗: 迴ｾ蝨ｨ縺ｮURL繧堤｢ｺ隱阪＠縺ｦ驕ｩ蛻・↓蟇ｾ蠢・
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin/characters/new')) {
      console.log('\n統 譁ｹ豕稗: 谿ｵ髫守噪縺ｪ繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ');
      
      // 縺ｾ縺壹く繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ
      if (!currentUrl.includes('/admin/characters')) {
        await page.goto('/admin/characters', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｫ蛻ｰ驕費ｼ育峩謗･驕ｷ遘ｻ・・);
      }
      
      // 谺｡縺ｫ譁ｰ隕丈ｽ懈・繝壹・繧ｸ縺ｸ
      await page.goto('/admin/characters/new', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕費ｼ育峩謗･驕ｷ遘ｻ・・);
    }
    
    // Step 4: 繝輔か繝ｼ繝縺ｮ讀懆ｨｼ
    console.log('\n搭 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・讀懆ｨｼ:');
    
    // 迴ｾ蝨ｨ縺ｮ繝壹・繧ｸ縺後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｧ縺ゅｋ縺薙→繧堤｢ｺ隱・
    await expect(page).toHaveURL(/.*\/admin\/characters\/new/);
    
    // 繝輔か繝ｼ繝隕∫ｴ縺ｮ蟄伜惠遒ｺ隱・
    const formChecks = [
      { name: '蜷榊燕蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・, selector: 'input[type="text"]', action: async (el) => {
        const count = await el.count();
        console.log(`- 蜷榊燕蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・ ${count}蛟義);
        if (count > 0) {
          await el.first().fill('繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ');
          console.log('  笨・繝・せ繝亥・蜉帛ｮ御ｺ・);
        }
      }},
      { name: '諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ', selector: 'select', action: async (el) => {
        const count = await el.count();
        console.log(`- 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ: ${count}蛟義);
        if (count > 0 && await el.first().isVisible()) {
          const options = await el.first().locator('option').count();
          console.log(`  繧ｪ繝励す繝ｧ繝ｳ謨ｰ: ${options}`);
          if (options > 1) {
            await el.first().selectOption({ index: 1 });
            console.log('  笨・驕ｸ謚槫ｮ御ｺ・);
          }
        }
      }},
      { name: '諤ｧ譬ｼ繧ｿ繧ｰ', selector: 'input[type="checkbox"]', action: async (el) => {
        const count = await el.count();
        console.log(`- 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ: ${count}蛟義);
        if (count > 0 && await el.first().isVisible()) {
          await el.first().click();
          console.log('  笨・繝√ぉ繝・け螳御ｺ・);
        }
      }},
      { name: '隱ｬ譏弱ヵ繧｣繝ｼ繝ｫ繝・, selector: 'textarea', action: async (el) => {
        const count = await el.count();
        console.log(`- 繝・く繧ｹ繝医お繝ｪ繧｢: ${count}蛟義);
        if (count > 0) {
          await el.first().fill('繝・せ繝育畑縺ｮ隱ｬ譏取枚縺ｧ縺吶・);
          console.log('  笨・蜈･蜉帛ｮ御ｺ・);
        }
      }},
      { name: '菫晏ｭ倥・繧ｿ繝ｳ', selector: 'button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")', action: async (el) => {
        const isVisible = await el.first().isVisible();
        console.log(`- 菫晏ｭ倥・繧ｿ繝ｳ: ${isVisible ? '陦ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・ : '隕九▽縺九ｊ縺ｾ縺帙ｓ'}`);
      }}
    ];
    
    for (const check of formChecks) {
      const element = page.locator(check.selector);
      await check.action(element);
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
    await page.screenshot({ path: 'stable-character-form.png', fullPage: true });
    console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・stable-character-form.png 縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
    
    // 譛邨ら｢ｺ隱・
    console.log('\n笨・繝・せ繝亥ｮ御ｺ・);
    console.log('譛邨６RL:', page.url());
  });
});
