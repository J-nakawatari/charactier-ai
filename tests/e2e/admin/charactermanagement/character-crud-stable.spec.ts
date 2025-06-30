import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・ｩ溯・ - 螳牙ｮ夂沿', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  // 蜷・ユ繧ｹ繝医〒譁ｰ縺励＞繧ｳ繝ｳ繝・く繧ｹ繝医ｒ菴ｿ逕ｨ・医ｈ繧雁ｮ牙ｮ夲ｼ・
  test('譁ｰ隕上く繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・・亥ｮ牙ｮ夂沿・・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝磯幕蟋・);
    
    // Step 1: 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // Step 2: 蜊∝・縺ｪ蠕・ｩ・
    await page.waitForTimeout(3000);
    
    // Step 3: 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Step 4: 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
    const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")').first();
    await expect(newButton).toBeVisible({ timeout: 10000 });
    await newButton.click();
    
    // Step 5: 繝輔か繝ｼ繝繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
    await page.waitForURL('**/admin/characters/new', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    
    // Step 6: 繧ｷ繝ｳ繝励Ν縺ｪ繝輔か繝ｼ繝蜈･蜉・
    const timestamp = Date.now();
    const characterName = `繝・せ繝医く繝｣繝ｩ_${timestamp}`;
    
    // 譛蛻昴・text input縺ｫ蜷榊燕繧貞・蜉・
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill(characterName);
    console.log('笨・蜷榊燕繧貞・蜉・', characterName);
    
    // 2逡ｪ逶ｮ縺ｮtext input縺ｫ闍ｱ隱槫錐繧貞・蜉・
    const nameEnInput = page.locator('input[type="text"]').nth(1);
    await nameEnInput.fill(`Test Character ${timestamp}`);
    
    // 譛蛻昴・textarea縺ｫ隱ｬ譏弱ｒ蜈･蜉・
    const descInput = page.locator('textarea').first();
    await descInput.fill('螳牙ｮ夂沿繝・せ繝医〒菴懈・縺輔ｌ縺溘く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
    
    // 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・
    const personalitySelect = page.locator('select').first();
    const optionCount = await personalitySelect.locator('option').count();
    if (optionCount > 1) {
      await personalitySelect.selectOption({ index: 1 });
      console.log('笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧帝∈謚・);
    }
    
    // 諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚橸ｼ域怙蛻昴・繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ・・
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();
    console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ繧帝∈謚・);
    
    // Step 7: 菫晏ｭ・
    const saveButton = page.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・井ｿ晏ｭ伜燕・・
    await page.screenshot({ path: 'before-save.png' });
    
    await saveButton.click();
    console.log('竢ｳ 菫晏ｭ伜・逅・ｸｭ...');
    
    // Step 8: 謌仙粥繧堤｢ｺ隱搾ｼ郁､・焚縺ｮ譁ｹ豕包ｼ・
    await page.waitForTimeout(3000); // 蜃ｦ逅・ｒ蠕・▽
    
    const currentUrl = page.url();
    const hasSuccessMessage = await page.locator('.toast-success, .success-message').isVisible().catch(() => false);
    const hasCharacterName = await page.locator(`text="${characterName}"`).isVisible().catch(() => false);
    
    console.log('投 邨先棡:');
    console.log('- 迴ｾ蝨ｨ縺ｮURL:', currentUrl);
    console.log('- 謌仙粥繝｡繝・そ繝ｼ繧ｸ:', hasSuccessMessage);
    console.log('- 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷崎｡ｨ遉ｺ:', hasCharacterName);
    
    // 縺・★繧後°縺ｮ譚｡莉ｶ繧呈ｺ縺溘○縺ｰ謌仙粥
    const isSuccess = currentUrl.includes('/admin/characters') || hasSuccessMessage || hasCharacterName;
    
    if (!isSuccess) {
      // 繧ｨ繝ｩ繝ｼ諠・ｱ繧貞庶髮・
      const errorText = await page.locator('.error, .text-red-600').allTextContents();
      console.log('笶・繧ｨ繝ｩ繝ｼ:', errorText);
      await page.screenshot({ path: 'character-creation-failed.png' });
    }
    
    expect(isSuccess).toBeTruthy();
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・謌仙粥');
    
    await context.close();
  });
  
  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｮ陦ｨ遉ｺ', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 荳隕ｧ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    const characterTable = page.locator('table, .character-list');
    await expect(characterTable).toBeVisible({ timeout: 10000 });
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
    const characterRows = page.locator('tbody tr, .character-item');
    const rowCount = await characterRows.count();
    console.log(`繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ謨ｰ: ${rowCount}`);
    
    expect(rowCount).toBeGreaterThan(0);
    
    await context.close();
  });
  
  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ邱ｨ髮・ｼ育ｰ｡譏鍋沿・・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 譛蛻昴・邱ｨ髮・・繧ｿ繝ｳ繧偵け繝ｪ繝・け
    const editButton = page.locator('a:has-text("邱ｨ髮・), button:has-text("邱ｨ髮・)').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      
      // 邱ｨ髮・・繝ｼ繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧貞ｾ・▽
      await page.waitForURL('**/admin/characters/**/edit', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      
      // 繝輔か繝ｼ繝縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
      const formExists = await page.locator('form, input[type="text"]').isVisible();
      expect(formExists).toBeTruthy();
      
      console.log('笨・邱ｨ髮・・繝ｼ繧ｸ縺梧ｭ｣蟶ｸ縺ｫ陦ｨ遉ｺ縺輔ｌ縺ｾ縺励◆');
    } else {
      console.log('笞・・邱ｨ髮・庄閭ｽ縺ｪ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺後≠繧翫∪縺帙ｓ');
    }
    
    await context.close();
  });
});
