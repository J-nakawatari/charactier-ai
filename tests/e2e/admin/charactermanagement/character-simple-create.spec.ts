import { test, expect } from '@playwright/test';

test.describe('繧ｷ繝ｳ繝励Ν縺ｪ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝・, () => {
  test('譛蟆城剞縺ｮ蜈･蜉帙〒繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧剃ｽ懈・', async ({ page }) => {
    // 逶ｴ謗･繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺九ｉ髢句ｧ・
    await page.goto('/admin/login');
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨ｒ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ螳御ｺ・);
    
    // 5遘貞ｾ・ｩ滂ｼ磯㍾隕・ｼ・
    await page.waitForTimeout(5000);
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ邨檎罰縺ｧ驕ｷ遘ｻ・医ｈ繧顔｢ｺ螳滂ｼ・
    console.log('塘 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ驕ｷ遘ｻ...');
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
    console.log('剥 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※縺・∪縺・..');
    const newButtonSelectors = [
      'a[href="/admin/characters/new"]',
      'button:has-text("譁ｰ隕丈ｽ懈・")',
      'a:has-text("譁ｰ隕丈ｽ懈・")',
      'button:has-text("霑ｽ蜉")',
      'a:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ繧定ｿｽ蜉")'
    ];
    
    let clicked = false;
    for (const selector of newButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
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
      console.log('笞・・譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲ら峩謗･URL縺ｧ驕ｷ遘ｻ繧定ｩｦ縺ｿ縺ｾ縺・..');
      await page.goto('/admin/characters/new');
    }
    
    // 繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('桃 迴ｾ蝨ｨ縺ｮURL:', currentUrl);
    
    // URL縺梧ｭ｣縺励＞縺薙→繧堤｢ｺ隱搾ｼ医ｈ繧頑沐霆溘↓・・
    if (!currentUrl.includes('/characters/new') && !currentUrl.includes('/characters/create')) {
      console.error('笶・譛溷ｾ・＠縺欟RL縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ:', currentUrl);
      await page.screenshot({ path: 'navigation-error.png' });
      
      // 繝壹・繧ｸ縺ｮ蜀・ｮｹ繧堤｢ｺ隱・
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      console.log('繝壹・繧ｸ繧ｿ繧､繝医Ν:', pageTitle);
      console.log('繝壹・繧ｸ縺ｮ譛蛻昴・200譁・ｭ・', bodyText.substring(0, 200));
      
      throw new Error(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕斐〒縺阪∪縺帙ｓ縺ｧ縺励◆縲ら樟蝨ｨ縺ｮURL: ${currentUrl}`);
    }
    
    // 繝輔か繝ｼ繝隕∫ｴ縺ｮ蟄伜惠遒ｺ隱・
    const formElements = {
      'input[type="text"]': await page.locator('input[type="text"]').count(),
      'select': await page.locator('select').count(),
      'checkbox': await page.locator('input[type="checkbox"]').count(),
      'textarea': await page.locator('textarea').count(),
      'submit': await page.locator('button[type="submit"]').count()
    };
    
    console.log('搭 繝輔か繝ｼ繝隕∫ｴ:', formElements);
    
    // 蠢・磯・岼縺ｮ縺ｿ蜈･蜉・
    if (formElements['input[type="text"]'] > 0) {
      // 蜷榊燕
      await page.locator('input[type="text"]').first().fill('繧ｷ繝ｳ繝励Ν繝・せ繝医く繝｣繝ｩ');
      await page.locator('input[type="text"]').nth(1).fill('Simple Test Character');
      console.log('笨・蜷榊燕蜈･蜉帛ｮ御ｺ・);
    }
    
    if (formElements['select'] > 0) {
      // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      
      // 遨ｺ縺ｧ縺ｪ縺・怙蛻昴・蛟､繧帝∈謚・
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await select.selectOption(value);
          console.log(`笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚槫ｮ御ｺ・ ${value}`);
          break;
        }
      }
    }
    
    if (formElements['checkbox'] > 0) {
      // 諤ｧ譬ｼ繧ｿ繧ｰ
      await page.locator('input[type="checkbox"]').first().click();
      console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚槫ｮ御ｺ・);
    }
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
    await page.screenshot({ path: 'simple-create-form.png' });
    
    // 菫晏ｭ倥・繧ｿ繝ｳ縺ｮ蟄伜惠遒ｺ隱・
    const saveButton = page.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
    const buttonExists = await saveButton.isVisible();
    
    console.log(`菫晏ｭ倥・繧ｿ繝ｳ: ${buttonExists ? '笨・蟄伜惠' : '笶・荳榊惠'}`);
    
    if (buttonExists) {
      // 繝懊ち繝ｳ縺梧怏蜉ｹ縺ｫ縺ｪ繧九∪縺ｧ蠕・▽
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      
      // 菫晏ｭ倥ｒ繧ｯ繝ｪ繝・け
      await saveButton.click();
      console.log('竢ｳ 菫晏ｭ倅ｸｭ...');
      
      // 邨先棡繧貞ｾ・▽
      await page.waitForTimeout(5000);
      
      // 謌仙粥縺ｮ遒ｺ隱・
      const finalUrl = page.url();
      const success = !finalUrl.includes('/new') || 
                     await page.locator('.toast-success').isVisible().catch(() => false);
      
      console.log(`邨先棡: ${success ? '笨・謌仙粥' : '笶・螟ｱ謨・}`);
      console.log('譛邨６RL:', finalUrl);
      
      if (!success) {
        const errors = await page.locator('.error, .text-red-600').allTextContents();
        console.log('繧ｨ繝ｩ繝ｼ:', errors);
      }
    }
  });
});
