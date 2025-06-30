import { test, expect } from '@playwright/test';

test.describe('繧ｷ繝ｳ繝励Ν縺ｪ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝・, () => {
  test('邂｡逅・判髱｢縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽ懈・', async ({ page }) => {
    // 1. 邂｡逅・・Ο繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // 2. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ');
    
    // 3. 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
    // 縺・￥縺､縺九・繝代ち繝ｼ繝ｳ繧定ｩｦ縺・
    const createButtonSelectors = [
      'a[href="/admin/characters/new"]',
      'button:has-text("譁ｰ隕丈ｽ懈・")',
      'a:has-text("譁ｰ隕丈ｽ懈・")',
      'button:has-text("霑ｽ蜉")',
      'a:has-text("霑ｽ蜉")'
    ];
    
    let clicked = false;
    for (const selector of createButtonSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          clicked = true;
          console.log(`笨・繝懊ち繝ｳ繧偵け繝ｪ繝・け: ${selector}`);
          break;
        }
      } catch (e) {
        // 谺｡縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ繧定ｩｦ縺・
      }
    }
    
    if (!clicked) {
      throw new Error('譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
    }
    
    // 4. 繝輔か繝ｼ繝繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
    await page.waitForTimeout(2000);
    console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
    
    // 5. 繝輔か繝ｼ繝縺ｫ蜈･蜉幢ｼ域怙繧ゅす繝ｳ繝励Ν縺ｪ譁ｹ豕包ｼ・
    // 縺吶∋縺ｦ縺ｮ繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ蜿門ｾ・
    const textInputs = await page.locator('input[type="text"]').all();
    console.log(`繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${textInputs.length}`);
    
    if (textInputs.length >= 2) {
      // 譛蛻昴・2縺､縺ｫ蜷榊燕繧貞・蜉・
      await textInputs[0].fill('繝・せ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ');
      await textInputs[1].fill('Test Character');
      console.log('笨・蜷榊燕繧貞・蜉・);
    }
    
    // 縺吶∋縺ｦ縺ｮtextarea繧貞叙蠕・
    const textareas = await page.locator('textarea').all();
    console.log(`繝・く繧ｹ繝医お繝ｪ繧｢謨ｰ: ${textareas.length}`);
    
    if (textareas.length >= 2) {
      // 譛蛻昴・2縺､縺ｫ隱ｬ譏弱ｒ蜈･蜉・
      await textareas[0].fill('繝・せ繝育畑縺ｮ隱ｬ譏・);
      await textareas[1].fill('Test description');
      console.log('笨・隱ｬ譏弱ｒ蜈･蜉・);
    }
    
    // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚橸ｼ亥ｿ・茨ｼ・
    const selects = await page.locator('select').all();
    console.log(`繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ謨ｰ: ${selects.length}`);
    if (selects.length > 0) {
      // 譛蛻昴・繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ・域ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・・
      const options = await selects[0].locator('option').all();
      if (options.length > 1) {
        const value = await options[1].getAttribute('value');
        if (value) {
          await selects[0].selectOption(value);
          console.log('笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・);
        }
      }
    }
    
    // 諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚橸ｼ亥ｿ・茨ｼ・ 譛蛻昴・繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ繧偵け繝ｪ繝・け
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ謨ｰ: ${checkboxes.length}`);
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・);
    }
    
    // 6. 菫晏ｭ倥・繧ｿ繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
    const saveButtonSelectors = [
      'button:has-text("菫晏ｭ・)',
      'button:has-text("菴懈・")',
      'button:has-text("Save")',
      'button[type="submit"]'
    ];
    
    for (const selector of saveButtonSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log(`笨・菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け: ${selector}`);
          break;
        }
      } catch (e) {
        // 谺｡縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ繧定ｩｦ縺・
      }
    }
    
    // 7. 邨先棡繧堤｢ｺ隱・
    await page.waitForTimeout(3000);
    
    // 謌仙粥繝｡繝・そ繝ｼ繧ｸ縺ｾ縺溘・繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ遒ｺ隱・
    const successIndicators = [
      '.toast-success',
      '.success-message',
      '[role="alert"]',
      'text=謌仙粥',
      'text=菴懈・縺励∪縺励◆'
    ];
    
    let success = false;
    for (const selector of successIndicators) {
      if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        success = true;
        console.log(`笨・謌仙粥繝｡繝・そ繝ｼ繧ｸ: ${selector}`);
        break;
      }
    }
    
    // URL縺ｮ螟牙喧繧よ・蜉溘・謖・ｨ・
    if (page.url().includes('/admin/characters') && !page.url().includes('/new')) {
      success = true;
      console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｫ謌ｻ繧翫∪縺励◆');
    }
    
    expect(success).toBe(true);
  });
});
