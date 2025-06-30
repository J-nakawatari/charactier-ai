import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・ョ繝舌ャ繧ｰ', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('邂｡逅・判髱｢縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ縺ｨ譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺ｮ遒ｺ隱・, async ({ page }) => {
    // 1. 繝ｭ繧ｰ繧､繝ｳ
    console.log('1. 邂｡逅・・Ο繧ｰ繧､繝ｳ髢句ｧ・);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    // 繝ｭ繧ｰ繧､繝ｳ蠕後・驕ｷ遘ｻ繧貞ｾ・▽
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('笨・繝繝・す繝･繝懊・繝峨∈驕ｷ遘ｻ謌仙粥');
    } catch (e) {
      console.log('笶・繝繝・す繝･繝懊・繝峨∈驕ｷ遘ｻ螟ｱ謨・);
      console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
      await page.screenshot({ path: 'admin-login-failed.png' });
      return;
    }
    
    // 2. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ
    console.log('2. 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ遘ｻ蜍・);
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
    await page.screenshot({ path: 'admin-characters-page.png' });
    
    // 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺・
    const createButtons = [
      'button:has-text("譁ｰ隕丈ｽ懈・")',
      'a:has-text("譁ｰ隕丈ｽ懈・")',
      'button:has-text("Create")',
      'a:has-text("Create")',
      'button:has-text("霑ｽ蜉")',
      'a:has-text("霑ｽ蜉")',
      'button[aria-label*="create"]',
      'a[href*="create"]',
      'a[href*="new"]'
    ];
    
    let createButton = null;
    for (const selector of createButtons) {
      const button = page.locator(selector);
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        createButton = button;
        console.log(`笨・譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆: ${selector}`);
        break;
      }
    }
    
    if (!createButton) {
      console.log('笶・譁ｰ隕丈ｽ懈・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      // 繝壹・繧ｸ蜀・・繝懊ち繝ｳ縺ｨ繝ｪ繝ｳ繧ｯ繧貞・縺ｦ陦ｨ遉ｺ
      const allButtons = await page.locator('button').all();
      console.log(`繝懊ち繝ｳ謨ｰ: ${allButtons.length}`);
      for (let i = 0; i < Math.min(5, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  繝懊ち繝ｳ${i + 1}: ${text}`);
      }
      
      const allLinks = await page.locator('a').all();
      console.log(`繝ｪ繝ｳ繧ｯ謨ｰ: ${allLinks.length}`);
      for (let i = 0; i < Math.min(5, allLinks.length); i++) {
        const text = await allLinks[i].textContent();
        const href = await allLinks[i].getAttribute('href');
        console.log(`  繝ｪ繝ｳ繧ｯ${i + 1}: ${text} (${href})`);
      }
      return;
    }
    
    // 3. 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧偵け繝ｪ繝・け
    console.log('3. 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧偵け繝ｪ繝・け');
    await createButton.click();
    
    // 繝壹・繧ｸ驕ｷ遘ｻ縺ｾ縺溘・繝｢繝ｼ繝繝ｫ陦ｨ遉ｺ繧貞ｾ・▽
    await page.waitForTimeout(2000);
    console.log('迴ｾ蝨ｨ縺ｮURL:', page.url());
    await page.screenshot({ path: 'admin-character-create-form.png' });
    
    // 繝輔か繝ｼ繝隕∫ｴ繧呈爾縺・
    const formFields = [
      'input[name="name.ja"]',
      'input[name="nameJa"]',
      'input[name="name"]',
      'input[placeholder*="蜷榊燕"]',
      'input[placeholder*="Name"]',
      'input[type="text"]'
    ];
    
    console.log('4. 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝ｫ繝峨ｒ謗｢縺・);
    for (const selector of formFields) {
      const field = page.locator(selector);
      const count = await field.count();
      if (count > 0) {
        console.log(`笨・繝輔ぅ繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺励◆: ${selector} (${count}蛟・`);
        const isVisible = await field.first().isVisible();
        console.log(`   陦ｨ遉ｺ迥ｶ諷・ ${isVisible}`);
      }
    }
    
    // 縺吶∋縺ｦ縺ｮ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ陦ｨ遉ｺ
    const allInputs = await page.locator('input').all();
    console.log(`蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${allInputs.length}`);
    for (let i = 0; i < Math.min(10, allInputs.length); i++) {
      const name = await allInputs[i].getAttribute('name');
      const placeholder = await allInputs[i].getAttribute('placeholder');
      const type = await allInputs[i].getAttribute('type');
      console.log(`  蜈･蜉・{i + 1}: name="${name}" placeholder="${placeholder}" type="${type}"`);
    }
  });
});
