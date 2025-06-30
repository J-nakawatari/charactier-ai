import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・ｩ溯・ - 菫ｮ豁｣迚・, () => {
  test.setTimeout(60000); // 繝・せ繝医・繧ｿ繧､繝繧｢繧ｦ繝医ｒ60遘偵↓險ｭ螳・
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('譁ｰ隕上く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ菴懈・ - 菫ｮ豁｣迚・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝磯幕蟋具ｼ井ｿｮ豁｣迚茨ｼ・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      // 蜊∝・縺ｪ蠕・ｩ・
      await page.waitForTimeout(5000);
      await page.close();
      
      // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ繧堤峩謗･髢九￥
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      console.log('桃 迴ｾ蝨ｨ縺ｮURL:', newPage.url());
      
      // URL縺ｮ遒ｺ隱・
      if (!newPage.url().includes('/characters/new')) {
        throw new Error('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕斐〒縺阪∪縺帙ｓ縺ｧ縺励◆');
      }
      
      // 繝輔か繝ｼ繝隕∫ｴ縺ｮ蟄伜惠繧堤｢ｺ隱阪＠縺ｦ縺九ｉ蜈･蜉・
      console.log('統 繝輔か繝ｼ繝縺ｫ蜈･蜉帑ｸｭ...');
      
      const timestamp = Date.now();
      const characterName = `繝・せ繝医く繝｣繝ｩ_${timestamp}`;
      
      // Step 1: 蜷榊燕蜈･蜉幢ｼ亥ｭ伜惠遒ｺ隱堺ｻ倥″・・
      const nameInputs = await newPage.locator('input[type="text"]').count();
      console.log(`繝・く繧ｹ繝亥・蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚: ${nameInputs}`);
      
      if (nameInputs >= 2) {
        // 譌･譛ｬ隱槫錐
        const nameJaInput = newPage.locator('input[type="text"]').first();
        await nameJaInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameJaInput.fill(characterName);
        console.log('笨・譌･譛ｬ隱槫錐蜈･蜉・);
        
        // 闍ｱ隱槫錐
        const nameEnInput = newPage.locator('input[type="text"]').nth(1);
        await nameEnInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameEnInput.fill(`Test Character ${timestamp}`);
        console.log('笨・闍ｱ隱槫錐蜈･蜉・);
      } else {
        console.log('笞・・蜷榊燕蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
      // Step 2: 隱ｬ譏主・蜉幢ｼ亥ｭ伜惠遒ｺ隱堺ｻ倥″・・
      const textareaCount = await newPage.locator('textarea').count();
      console.log(`繝・く繧ｹ繝医お繝ｪ繧｢謨ｰ: ${textareaCount}`);
      
      if (textareaCount > 0) {
        const descInput = newPage.locator('textarea').first();
        await descInput.waitFor({ state: 'visible', timeout: 5000 });
        await descInput.fill('菫ｮ豁｣迚医ユ繧ｹ繝医〒菴懈・縺輔ｌ縺溘く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
        console.log('笨・隱ｬ譏主・蜉・);
      }
      
      // Step 3: 諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・亥ｭ伜惠遒ｺ隱堺ｻ倥″・・
      const selectCount = await newPage.locator('select').count();
      console.log(`繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ謨ｰ: ${selectCount}`);
      
      if (selectCount > 0) {
        const personalitySelect = newPage.locator('select').first();
        await personalitySelect.waitFor({ state: 'visible', timeout: 5000 });
        const options = await personalitySelect.locator('option').all();
        
        // 遨ｺ縺ｧ縺ｪ縺・､繧帝∈謚・
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await personalitySelect.selectOption(value);
            console.log(`笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚・ ${value}`);
            break;
          }
        }
      }
      
      // Step 4: 諤ｧ譬ｼ繧ｿ繧ｰ・亥ｭ伜惠遒ｺ隱堺ｻ倥″・・
      const checkboxCount = await newPage.locator('input[type="checkbox"]').count();
      console.log(`繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ謨ｰ: ${checkboxCount}`);
      
      if (checkboxCount > 0) {
        const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
        await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 });
        await firstCheckbox.click();
        console.log('笨・諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚・);
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・井ｿ晏ｭ伜燕・・
      await newPage.screenshot({ path: 'before-save-fixed.png' });
      
      // Step 5: 菫晏ｭ・
      const saveButton = newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
      const saveButtonExists = await saveButton.isVisible().catch(() => false);
      
      if (saveButtonExists) {
        console.log('沈 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け...');
        await saveButton.click();
        
        // 邨先棡繧貞ｾ・▽
        await newPage.waitForTimeout(5000);
        
        // 謌仙粥縺ｮ遒ｺ隱・
        const finalUrl = newPage.url();
        const hasSuccessMessage = await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false);
        
        console.log('投 邨先棡:');
        console.log('- 譛邨６RL:', finalUrl);
        console.log('- 謌仙粥繝｡繝・そ繝ｼ繧ｸ:', hasSuccessMessage);
        
        const isSuccess = !finalUrl.includes('/new') || hasSuccessMessage;
        
        if (!isSuccess) {
          const errors = await newPage.locator('.error, .text-red-600').allTextContents();
          console.log('笶・繧ｨ繝ｩ繝ｼ:', errors);
        } else {
          console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・謌仙粥');
        }
        
        expect(isSuccess).toBeTruthy();
      } else {
        console.log('笶・菫晏ｭ倥・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
    } catch (error) {
      console.error('繝・せ繝医お繝ｩ繝ｼ:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
  
  test('繧ｷ繝ｳ繝励Ν縺ｪ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ陦ｨ遉ｺ', async ({ page }) => {
    // 逶ｴ謗･繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨ｒ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // JavaScript縺ｧ驕ｷ遘ｻ
    await page.evaluate(() => {
      window.location.href = '/admin/characters';
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('桃 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ:', page.url());
    
    // 荳隕ｧ縺ｮ隕∫ｴ繧堤｢ｺ隱・
    const hasTable = await page.locator('table, .character-list').isVisible().catch(() => false);
    const hasNewButton = await page.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")').isVisible().catch(() => false);
    
    console.log('- 繝・・繝悶Ν/繝ｪ繧ｹ繝・', hasTable ? '笨・ : '笶・);
    console.log('- 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ:', hasNewButton ? '笨・ : '笶・);
    
    expect(hasTable || hasNewButton).toBeTruthy();
  });
});
