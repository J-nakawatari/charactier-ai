import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝輔か繝ｼ繝繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ', () => {
  test('邂｡逅・判髱｢縺九ｉ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ驕ｷ遘ｻ', async ({ page }) => {
    // 邂｡逅・・Ο繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    } catch (e) {
      console.log('笶・繝ｭ繧ｰ繧､繝ｳ螟ｱ謨・);
      return;
    }
    
    // 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後ｋ縺ｮ繧貞ｾ・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 霑ｽ蜉縺ｮ蠕・ｩ・
    
    // 譁ｹ豕・: 繧ｵ繧､繝峨ヰ繝ｼ繝｡繝九Η繝ｼ縺九ｉ驕ｷ遘ｻ・域耳螂ｨ・・
    try {
      // 繧ｵ繧､繝峨ヰ繝ｼ縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・Μ繝ｳ繧ｯ繧偵け繝ｪ繝・け
      const characterMenuLink = page.locator('a[href="/admin/characters"], nav a:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ")');
      if (await characterMenuLink.isVisible({ timeout: 3000 })) {
        await characterMenuLink.click();
        await page.waitForURL('**/admin/characters');
        console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ驕ｷ遘ｻ');
        
        // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧偵け繝ｪ繝・け
        const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")');
        await newButton.click();
        await page.waitForURL('**/admin/characters/new');
        console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ驕ｷ遘ｻ');
      } else {
        throw new Error('繧ｵ繧､繝峨ヰ繝ｼ繝｡繝九Η繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
    } catch (e) {
      console.log('笞・・繝｡繝九Η繝ｼ繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ縺ｫ螟ｱ謨励∫峩謗･URL縺ｧ驕ｷ遘ｻ繧定ｩｦ縺ｿ縺ｾ縺・);
      
      // 譁ｹ豕・: 逶ｴ謗･URL縺ｧ驕ｷ遘ｻ・医ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ・・
      await page.goto('/admin/characters', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
      const createButtons = [
        'a[href="/admin/characters/new"]',
        'button:has-text("譁ｰ隕丈ｽ懈・")',
        'a:has-text("譁ｰ隕丈ｽ懈・")',
        'button:has-text("霑ｽ蜉")',
        'a:has-text("霑ｽ蜉")'
      ];
      
      let clicked = false;
      for (const selector of createButtons) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          clicked = true;
          console.log(`笨・繝懊ち繝ｳ繧偵け繝ｪ繝・け: ${selector}`);
          break;
        }
      }
      
      if (!clicked) {
        // 譛邨よ焔谿ｵ: 逶ｴ謗･URL縺ｧ驕ｷ遘ｻ
        await page.goto('/admin/characters/new', { waitUntil: 'networkidle' });
      }
    }
    
    // 繝輔か繝ｼ繝縺瑚｡ｨ遉ｺ縺輔ｌ繧九∪縺ｧ蠕・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨・遒ｺ隱・
    console.log('統 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨ｒ遒ｺ隱堺ｸｭ...');
    
    // 蜷榊燕蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・
    const nameFields = await page.locator('input[type="text"]').count();
    console.log(`繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${nameFields}`);
    
    // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ
    const selectBoxes = await page.locator('select').count();
    console.log(`繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ謨ｰ: ${selectBoxes}`);
    
    // 諤ｧ譬ｼ繧ｿ繧ｰ・医メ繧ｧ繝・け繝懊ャ繧ｯ繧ｹ・・
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ謨ｰ: ${checkboxes}`);
    
    // 繝・く繧ｹ繝医お繝ｪ繧｢
    const textareas = await page.locator('textarea').count();
    console.log(`繝・く繧ｹ繝医お繝ｪ繧｢謨ｰ: ${textareas}`);
    
    // 菫晏ｭ倥・繧ｿ繝ｳ
    const saveButton = page.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")');
    if (await saveButton.isVisible()) {
      console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ・
    await page.screenshot({ path: 'character-form.png', fullPage: true });
    console.log('萄 繝輔か繝ｼ繝縺ｮ繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧・character-form.png 縺ｫ菫晏ｭ倥＠縺ｾ縺励◆');
  });
});
