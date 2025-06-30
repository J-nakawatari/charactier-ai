import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邂｡逅・ｩ溯・ - 譛邨ゆｿｮ豁｣迚・, () => {
  test.setTimeout(60000); // 蜈ｨ繝・せ繝医・繧ｿ繧､繝繧｢繧ｦ繝医ｒ60遘偵↓險ｭ螳・
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝・- 谿ｵ髫守噪繧｢繝励Ο繝ｼ繝・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝・せ繝磯幕蟋具ｼ域怙邨ら沿・・);
    
    try {
      // 繧ｹ繝・ャ繝・: 繝ｭ繧ｰ繧､繝ｳ
      console.log('統 繧ｹ繝・ャ繝・: 繝ｭ繧ｰ繧､繝ｳ荳ｭ...');
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      // 繧ｹ繝・ャ繝・: 螳牙ｮ壼喧縺ｮ縺溘ａ縺ｮ蠕・ｩ・
      console.log('竢ｳ 繧ｹ繝・ャ繝・: 螳牙ｮ壼喧蠕・ｩ滉ｸｭ...');
      await page.waitForTimeout(5000);
      await page.close();
      
      // 繧ｹ繝・ャ繝・: 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
      console.log('統 繧ｹ繝・ャ繝・: 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｸ驕ｷ遘ｻ...');
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // 繧ｹ繝・ャ繝・: 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾縺励※繧ｯ繝ｪ繝・け
      console.log('剥 繧ｹ繝・ャ繝・: 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ繧呈爾邏｢荳ｭ...');
      const newButtonSelectors = [
        'a[href="/admin/characters/new"]',
        'button:has-text("譁ｰ隕丈ｽ懈・")',
        'a:has-text("譁ｰ隕丈ｽ懈・")',
        '.new-character-button',
        'button[data-action="create-character"]'
      ];
      
      let buttonClicked = false;
      for (const selector of newButtonSelectors) {
        try {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            buttonClicked = true;
            console.log(`笨・繝懊ち繝ｳ繧ｯ繝ｪ繝・け謌仙粥: ${selector}`);
            break;
          }
        } catch (e) {
          // 谺｡縺ｮ繧ｻ繝ｬ繧ｯ繧ｿ繝ｼ繧定ｩｦ縺・
        }
      }
      
      if (!buttonClicked) {
        console.log('笞・・繝懊ち繝ｳ縺瑚ｦ九▽縺九ｉ縺ｪ縺・◆繧√∫峩謗･URL縺ｸ驕ｷ遘ｻ');
        await newPage.goto('/admin/characters/new');
      }
      
      // 繧ｹ繝・ャ繝・: 繝輔か繝ｼ繝繝壹・繧ｸ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ蠕・ｩ・
      console.log('竢ｳ 繧ｹ繝・ャ繝・: 繝輔か繝ｼ繝繝壹・繧ｸ隱ｭ縺ｿ霎ｼ縺ｿ蠕・ｩ・..');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // URL縺ｮ遒ｺ隱・
      const currentUrl = newPage.url();
      console.log(`桃 迴ｾ蝨ｨ縺ｮURL: ${currentUrl}`);
      
      if (!currentUrl.includes('/characters/new') && !currentUrl.includes('/characters/create')) {
        console.error('笶・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕斐〒縺阪∪縺帙ｓ縺ｧ縺励◆');
        await newPage.screenshot({ path: 'final-navigation-error.png' });
        throw new Error('繝翫ン繧ｲ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ');
      }
      
      // 繧ｹ繝・ャ繝・: 繝輔か繝ｼ繝隕∫ｴ縺ｮ蟄伜惠遒ｺ隱・
      console.log('剥 繧ｹ繝・ャ繝・: 繝輔か繝ｼ繝隕∫ｴ縺ｮ遒ｺ隱・..');
      const formCheck = {
        textInputs: await newPage.locator('input[type="text"]').count(),
        selects: await newPage.locator('select').count(),
        checkboxes: await newPage.locator('input[type="checkbox"]').count(),
        textareas: await newPage.locator('textarea').count(),
        submitButtons: await newPage.locator('button[type="submit"]').count()
      };
      
      console.log('搭 繝輔か繝ｼ繝隕∫ｴ謨ｰ:', formCheck);
      
      // 繧ｹ繝・ャ繝・: 繝輔か繝ｼ繝蜈･蜉幢ｼ域ｮｵ髫守噪縺ｫ・・
      console.log('統 繧ｹ繝・ャ繝・: 繝輔か繝ｼ繝蜈･蜉幃幕蟋・..');
      const timestamp = Date.now();
      
      // 7-1: 蜷榊燕蜈･蜉・
      if (formCheck.textInputs >= 2) {
        console.log('  7-1: 蜷榊燕蜈･蜉帑ｸｭ...');
        const nameJa = newPage.locator('input[type="text"]').first();
        await nameJa.waitFor({ state: 'visible', timeout: 5000 });
        await nameJa.clear();
        await nameJa.fill(`譛邨ゅユ繧ｹ繝医く繝｣繝ｩ_${timestamp}`);
        await newPage.waitForTimeout(500);
        
        const nameEn = newPage.locator('input[type="text"]').nth(1);
        await nameEn.waitFor({ state: 'visible', timeout: 5000 });
        await nameEn.clear();
        await nameEn.fill(`Final Test Character ${timestamp}`);
        await newPage.waitForTimeout(500);
        console.log('  笨・蜷榊燕蜈･蜉帛ｮ御ｺ・);
      }
      
      // 7-2: 隱ｬ譏主・蜉幢ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      if (formCheck.textareas >= 2) {
        console.log('  7-2: 隱ｬ譏主・蜉帑ｸｭ...');
        // 譌･譛ｬ隱櫁ｪｬ譏・
        const descriptionJa = newPage.locator('textarea').first();
        await descriptionJa.waitFor({ state: 'visible', timeout: 5000 });
        await descriptionJa.clear();
        await descriptionJa.fill('譛邨ゆｿｮ豁｣迚医・繝・せ繝医〒菴懈・縺輔ｌ縺溘く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶・);
        
        // 闍ｱ隱櫁ｪｬ譏・
        const descriptionEn = newPage.locator('textarea').nth(1);
        await descriptionEn.waitFor({ state: 'visible', timeout: 5000 });
        await descriptionEn.clear();
        await descriptionEn.fill('This is a test character created with the final version.');
        
        await newPage.waitForTimeout(500);
        console.log('  笨・隱ｬ譏趣ｼ域律譛ｬ隱槭・闍ｱ隱橸ｼ牙・蜉帛ｮ御ｺ・);
      }
      
      // 7-3: 諤ｧ蛻･縺ｨ諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚・
      if (formCheck.selects > 0) {
        console.log('  7-3: 繧ｻ繝ｬ繧ｯ繝医・繝・け繧ｹ蜃ｦ逅・ｸｭ...');
        const selects = await newPage.locator('select').all();
        
        // 譛蛻昴・繧ｻ繝ｬ繧ｯ繝茨ｼ域ｧ蛻･・・
        if (selects.length > 0) {
          const genderSelect = selects[0];
          await genderSelect.waitFor({ state: 'visible', timeout: 5000 });
          const genderOptions = await genderSelect.locator('option').all();
          if (genderOptions.length > 1) {
            const value = await genderOptions[1].getAttribute('value');
            if (value) {
              await genderSelect.selectOption(value);
              console.log(`  笨・諤ｧ蛻･驕ｸ謚槫ｮ御ｺ・ ${value}`);
            }
          }
        }
        
        // 2逡ｪ逶ｮ縺ｮ繧ｻ繝ｬ繧ｯ繝茨ｼ域ｧ譬ｼ繝励Μ繧ｻ繝・ヨ・・
        if (selects.length > 1) {
          const personalitySelect = selects[1];
          await personalitySelect.waitFor({ state: 'visible', timeout: 5000 });
          const personalityOptions = await personalitySelect.locator('option').all();
          console.log(`  諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ繧ｪ繝励す繝ｧ繝ｳ謨ｰ: ${personalityOptions.length}`);
          
          // 遨ｺ縺ｧ縺ｪ縺・怙蛻昴・蛟､繧帝∈謚・
          for (let i = 1; i < personalityOptions.length; i++) {
            const optionValue = await personalityOptions[i].getAttribute('value');
            const optionText = await personalityOptions[i].textContent();
            
            if (optionValue && optionValue !== '') {
              await personalitySelect.selectOption(optionValue);
              await newPage.waitForTimeout(500);
              console.log(`  笨・諤ｧ譬ｼ繝励Μ繧ｻ繝・ヨ驕ｸ謚槫ｮ御ｺ・ ${optionValue} (${optionText})`);
              break;
            }
          }
        }
      }
      
      // 7-4: 諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚・
      if (formCheck.checkboxes > 0) {
        console.log('  7-4: 諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚樔ｸｭ...');
        const checkbox = newPage.locator('input[type="checkbox"]').first();
        await checkbox.waitFor({ state: 'visible', timeout: 5000 });
        await checkbox.click();
        await newPage.waitForTimeout(500);
        console.log('  笨・諤ｧ譬ｼ繧ｿ繧ｰ驕ｸ謚槫ｮ御ｺ・);
      }
      
      // 7-5: 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ・域律譛ｬ隱槭・闍ｱ隱橸ｼ・
      if (formCheck.textareas >= 4) {
        console.log('  7-5: 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ蜈･蜉帑ｸｭ...');
        // 譌･譛ｬ隱槭ョ繝輔か繝ｫ繝医Γ繝・そ繝ｼ繧ｸ
        const defaultMessageJa = newPage.locator('textarea').nth(2);
        await defaultMessageJa.waitFor({ state: 'visible', timeout: 5000 });
        await defaultMessageJa.clear();
        await defaultMessageJa.fill('縺薙ｓ縺ｫ縺｡縺ｯ・√ユ繧ｹ繝医く繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｧ縺吶ｈ繧峨＠縺上♀鬘倥＞縺励∪縺呻ｼ・);
        
        // 闍ｱ隱槭ョ繝輔か繝ｫ繝医Γ繝・そ繝ｼ繧ｸ
        const defaultMessageEn = newPage.locator('textarea').nth(3);
        await defaultMessageEn.waitFor({ state: 'visible', timeout: 5000 });
        await defaultMessageEn.clear();
        await defaultMessageEn.fill('Hello! I am a test character. Nice to meet you!');
        
        await newPage.waitForTimeout(500);
        console.log('  笨・繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ蜈･蜉帛ｮ御ｺ・);
      }
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ・亥・蜉帛ｾ鯉ｼ・
      await newPage.screenshot({ path: 'final-form-filled.png', fullPage: true });
      console.log('萄 蜈･蜉帛ｾ後・繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・);
      
      // 繧ｹ繝・ャ繝・: 菫晏ｭ伜・逅・
      console.log('沈 繧ｹ繝・ャ繝・: 菫晏ｭ伜・逅・..');
      const saveButton = newPage.locator('button[type="submit"], button:has-text("菫晏ｭ・), button:has-text("菴懈・")').first();
      
      if (await saveButton.isVisible()) {
        // 繝懊ち繝ｳ縺梧怏蜉ｹ縺ｫ縺ｪ繧九∪縺ｧ蠕・▽
        await expect(saveButton).toBeEnabled({ timeout: 10000 });
        
        // 繝阪ャ繝医Ρ繝ｼ繧ｯ縺悟ｮ牙ｮ壹☆繧九∪縺ｧ蠕・▽
        await newPage.waitForLoadState('networkidle');
        
        // 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け
        await saveButton.click();
        console.log('笨・菫晏ｭ倥・繧ｿ繝ｳ繧ｯ繝ｪ繝・け');
        
        // 繝医・繧ｹ繝医′陦ｨ遉ｺ縺輔ｌ繧九∪縺ｧ蠕・▽・井ｽ懈・螳御ｺ・Γ繝・そ繝ｼ繧ｸ・・
        try {
          await newPage.waitForSelector('[role="alert"]:has-text("菴懈・螳御ｺ・), .toast:has-text("菴懈・螳御ｺ・)', { timeout: 10000 });
          console.log('笨・菴懈・螳御ｺ・ヨ繝ｼ繧ｹ繝医′陦ｨ遉ｺ縺輔ｌ縺ｾ縺励◆');
        } catch (e) {
          console.log('笞・・菴懈・螳御ｺ・ヨ繝ｼ繧ｹ繝医′隕九▽縺九ｊ縺ｾ縺帙ｓ');
        }
        
        // URL縺ｮ螟画峩繧貞ｾ・▽・医Μ繝繧､繝ｬ繧ｯ繝茨ｼ・
        try {
          await newPage.waitForURL('**/admin/characters', { timeout: 5000 });
          console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝医＆繧後∪縺励◆');
        } catch (e) {
          console.log('笞・・繝ｪ繝繧､繝ｬ繧ｯ繝医′螳御ｺ・＠縺ｾ縺帙ｓ縺ｧ縺励◆');
        }
        
        // 謌仙粥蛻､螳夲ｼ郁ｩｳ邏ｰ縺ｪ繝ｭ繧ｰ莉倥″・・
        const finalUrl = newPage.url();
        
        // 蜷・擅莉ｶ繧貞句挨縺ｫ繝√ぉ繝・け
        const urlChanged = finalUrl.includes('/admin/characters') && !finalUrl.includes('/new');
        const toastVisible = await newPage.locator('[role="alert"]:has-text("菴懈・螳御ｺ・), .toast:has-text("菴懈・螳御ｺ・), [role="alert"]:has-text("譁ｰ隕丈ｽ懈・縺励∪縺励◆")').isVisible().catch(() => false);
        const characterNameVisible = await newPage.locator(`text="譛邨ゅユ繧ｹ繝医く繝｣繝ｩ_${timestamp}"`).isVisible().catch(() => false);
        
        console.log('\n投 謌仙粥譚｡莉ｶ縺ｮ隧ｳ邏ｰ:');
        console.log(`- URL螟画峩 (characters繝壹・繧ｸ): ${urlChanged ? '笨・ : '笶・} (${finalUrl})`);
        console.log(`- 謌仙粥繝医・繧ｹ繝郁｡ｨ遉ｺ: ${toastVisible ? '笨・ : '笶・}`);
        console.log(`- 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷崎｡ｨ遉ｺ: ${characterNameVisible ? '笨・ : '笶・}`);
        
        // 繝壹・繧ｸ荳翫・縺吶∋縺ｦ縺ｮ繝医・繧ｹ繝医Γ繝・そ繝ｼ繧ｸ繧貞叙蠕・
        const allToasts = await newPage.locator('[role="alert"], .toast, .toast-message').allTextContents();
        if (allToasts.length > 0) {
          console.log('- 讀懷・縺輔ｌ縺溘ヨ繝ｼ繧ｹ繝・', allToasts);
        }
        
        // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧呈爾縺・
        const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]:has-text("繧ｨ繝ｩ繝ｼ"), .error-message, .bg-red-50').allTextContents();
        if (errorMessages.length > 0) {
          console.log('- 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ:', errorMessages);
        }
        
        const hasSuccess = urlChanged || toastVisible || characterNameVisible;
        console.log(`\n投 譛邨らｵ先棡: ${hasSuccess ? '笨・謌仙粥' : '笶・螟ｱ謨・}`);
        
        if (!hasSuccess) {
          await newPage.screenshot({ path: 'final-save-error.png', fullPage: true });
          console.log('- 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: final-save-error.png');
          
          // 繝輔か繝ｼ繝縺ｮ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ繧堤｢ｺ隱・
          const validationErrors = await newPage.locator('.bg-red-50 ul li').allTextContents();
          if (validationErrors.length > 0) {
            console.log('- 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ:', validationErrors);
          }
        }
        
        expect(hasSuccess).toBeTruthy();
      } else {
        console.error('笶・菫晏ｭ倥・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
        throw new Error('菫晏ｭ倥・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      throw error;
    } finally {
      await context.close();
      console.log('\n笨・繝・せ繝亥ｮ御ｺ・);
    }
  });
  
  test('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｮ陦ｨ遉ｺ遒ｺ隱・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // 繝繝・す繝･繝懊・繝峨ｒ蠕・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    await page.close();
    
    // 譁ｰ縺励＞繝壹・繧ｸ縺ｧ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繧帝幕縺・
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000);
    
    // 荳隕ｧ縺ｮ隕∫ｴ繧堤｢ｺ隱・
    const hasTable = await newPage.locator('table, .character-list, .character-grid').isVisible().catch(() => false);
    const hasNewButton = await newPage.locator('a[href="/admin/characters/new"], button:has-text("譁ｰ隕丈ｽ懈・")').isVisible().catch(() => false);
    
    console.log('搭 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ繝壹・繧ｸ:');
    console.log(`- 繝・・繝悶Ν/繝ｪ繧ｹ繝・ ${hasTable ? '笨・ : '笶・}`);
    console.log(`- 譁ｰ隕丈ｽ懈・繝懊ち繝ｳ: ${hasNewButton ? '笨・ : '笶・}`);
    
    expect(hasTable || hasNewButton).toBeTruthy();
    
    await context.close();
  });
});
