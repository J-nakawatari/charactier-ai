import { test, expect } from '@playwright/test';

test.describe('繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・判髱｢縺ｮ隧ｳ邏ｰ繝・せ繝・, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('邱ｨ髮・判髱｢縺ｮ讒矩縺ｨ蜈･蜉・, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('噫 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・ｩｳ邏ｰ繝・せ繝磯幕蟋・);
    
    try {
      // 繝ｭ繧ｰ繧､繝ｳ
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ荳隕ｧ縺ｸ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 譛蛻昴・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ縺ｮ邱ｨ髮・・繧ｿ繝ｳ繧偵け繝ｪ繝・け
      const firstRow = page.locator('tbody tr').first();
      const editButton = firstRow.locator('td:last-child button').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForLoadState('networkidle');
        console.log('笨・邱ｨ髮・判髱｢縺ｸ驕ｷ遘ｻ');
      } else {
        throw new Error('邱ｨ髮・・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
      
      // 邱ｨ髮・判髱｢縺ｮ隕∫ｴ遒ｺ隱・
      console.log('\n搭 邱ｨ髮・判髱｢縺ｮ隕∫ｴ遒ｺ隱・');
      
      // 1. 繧ｿ繧､繝医Ν遒ｺ隱・
      const title = await page.locator('h1:has-text("繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・)').isVisible();
      console.log(`- 繧ｿ繧､繝医Ν縲後く繝｣繝ｩ繧ｯ繧ｿ繝ｼ邱ｨ髮・・ ${title ? '笨・ : '笶・}`);
      
      // 2. 險隱槭ち繝也｢ｺ隱・
      const jpTab = await page.locator('button:has-text("譌･譛ｬ隱・)').isVisible();
      const enTab = await page.locator('button:has-text("English")').isVisible();
      console.log(`- 譌･譛ｬ隱槭ち繝・ ${jpTab ? '笨・ : '笶・}`);
      console.log(`- English繧ｿ繝・ ${enTab ? '笨・ : '笶・}`);
      
      // 3. 蝓ｺ譛ｬ諠・ｱ縺ｮ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝・
      console.log('\n統 蝓ｺ譛ｬ諠・ｱ繝輔ぅ繝ｼ繝ｫ繝・');
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ蜷搾ｼ域律譛ｬ隱橸ｼ・
      const nameInput = page.locator('input[value*="繝・せ繝医く繝｣繝ｩ"]').first();
      if (await nameInput.isVisible()) {
        const currentName = await nameInput.inputValue();
        console.log(`- 迴ｾ蝨ｨ縺ｮ蜷榊燕: ${currentName}`);
        
        // 蜷榊燕繧呈峩譁ｰ
        await nameInput.clear();
        await nameInput.fill(`${currentName}_邱ｨ髮・ｸ医∩`);
        console.log('笨・蜷榊燕繧呈峩譁ｰ');
      }
      
      // 繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ
      const messageTextarea = page.locator('textarea').first();
      if (await messageTextarea.isVisible()) {
        await messageTextarea.clear();
        await messageTextarea.fill('邱ｨ髮・ユ繧ｹ繝医〒譖ｴ譁ｰ縺輔ｌ縺溘ョ繝輔か繝ｫ繝医Γ繝・そ繝ｼ繧ｸ縺ｧ縺吶・);
        console.log('笨・繝・ヵ繧ｩ繝ｫ繝医Γ繝・そ繝ｼ繧ｸ繧呈峩譁ｰ');
      }
      
      // 4. 蝓ｺ譛ｬ險ｭ螳壹そ繧ｯ繧ｷ繝ｧ繝ｳ
      console.log('\n笞呻ｸ・蝓ｺ譛ｬ險ｭ螳・');
      
      // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ遞ｮ鬘橸ｼ医ラ繝ｭ繝・・繝繧ｦ繝ｳ・・
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible()) {
        const currentValue = await typeSelect.inputValue();
        console.log(`- 迴ｾ蝨ｨ縺ｮ繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ遞ｮ鬘・ ${currentValue}`);
      }
      
      // 諤ｧ蛻･驕ｸ謚・
      const genderInputs = page.locator('input[name="諤ｧ蛻･"], input[name="gender"]');
      console.log(`- 諤ｧ蛻･繧ｪ繝励す繝ｧ繝ｳ謨ｰ: ${await genderInputs.count()}`);
      
      // 5. 諤ｧ譬ｼ繝ｻ迚ｹ蠕ｴ險ｭ螳・
      console.log('\n鹿 諤ｧ譬ｼ繝ｻ迚ｹ蠕ｴ險ｭ螳・');
      
      // 諤ｧ譬ｼ繧ｿ繧､繝励・繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ
      const personalityCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await personalityCheckboxes.count();
      console.log(`- 諤ｧ譬ｼ繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ謨ｰ: ${checkboxCount}`);
      
      // 縺・￥縺､縺九メ繧ｧ繝・け繧貞・繧後ｋ
      if (checkboxCount > 0) {
        // 縲悟━縺励＞縲阪↓繝√ぉ繝・け
        const kindCheckbox = page.locator('label:has-text("蜆ｪ縺励＞") input[type="checkbox"]');
        if (await kindCheckbox.isVisible() && !(await kindCheckbox.isChecked())) {
          await kindCheckbox.click();
          console.log('笨・縲悟━縺励＞縲阪ｒ繝√ぉ繝・け');
        }
      }
      
      // 6. AI險ｭ螳・
      console.log('\n､・AI險ｭ螳・');
      const aiModelSelect = page.locator('select:has(option:has-text("GPT"))');
      if (await aiModelSelect.isVisible()) {
        const currentModel = await aiModelSelect.inputValue();
        console.log(`- 迴ｾ蝨ｨ縺ｮAI繝｢繝・Ν: ${currentModel}`);
      }
      
      // 7. 逕ｻ蜒剰ｨｭ螳壹・遒ｺ隱・
      console.log('\n名・・逕ｻ蜒剰ｨｭ螳・');
      
      // 繧｢繝舌ち繝ｼ逕ｻ蜒・
      const avatarUpload = page.locator('text="繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ逕ｻ蜒剰ｨｭ螳・').locator('..').locator('input[type="file"]').first();
      console.log(`- 繧｢繝舌ち繝ｼ逕ｻ蜒上い繝・・繝ｭ繝ｼ繝・ ${await avatarUpload.count() > 0 ? '笨・ : '笶・}`);
      
      // 繧ｮ繝｣繝ｩ繝ｪ繝ｼ逕ｻ蜒・
      const gallerySection = await page.locator('text="繧ｮ繝｣繝ｩ繝ｪ繝ｼ逕ｻ蜒・').isVisible();
      console.log(`- 繧ｮ繝｣繝ｩ繝ｪ繝ｼ逕ｻ蜒上そ繧ｯ繧ｷ繝ｧ繝ｳ: ${gallerySection ? '笨・ : '笶・}`);
      
      // 繝ｬ繝吶Ν逕ｻ蜒上・謨ｰ繧堤｢ｺ隱・
      const levelImages = page.locator('text=/隗｣謾ｾ繝ｬ繝吶Ν \\d+/');
      const levelImageCount = await levelImages.count();
      console.log(`- 繝ｬ繝吶Ν逕ｻ蜒上せ繝ｭ繝・ヨ謨ｰ: ${levelImageCount}`);
      
      // 8. 菫晏ｭ倥・繧ｿ繝ｳ
      const saveButton = page.locator('button:has-text("菫晏ｭ・)');
      console.log(`\n沈 菫晏ｭ倥・繧ｿ繝ｳ: ${await saveButton.isVisible() ? '笨・ : '笶・}`);
      
      // 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ
      await page.screenshot({ path: 'character-edit-detailed.png', fullPage: true });
      console.log('\n萄 繧ｹ繧ｯ繝ｪ繝ｼ繝ｳ繧ｷ繝ｧ繝・ヨ菫晏ｭ・ character-edit-detailed.png');
      
      // 螳滄圀縺ｫ菫晏ｭ・
      if (await saveButton.isVisible()) {
        await saveButton.click();
        console.log('沈 菫晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け');
        
        // 菫晏ｭ倡ｵ先棡繧貞ｾ・▽
        await page.waitForTimeout(3000);
        
        // 謌仙粥繝｡繝・そ繝ｼ繧ｸ縺ｾ縺溘・繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ遒ｺ隱・
        const currentUrl = page.url();
        const hasSuccessMessage = await page.locator('.toast-success, text="菫晏ｭ倥＠縺ｾ縺励◆"').isVisible().catch(() => false);
        
        console.log(`\n投 菫晏ｭ倡ｵ先棡:`);
        console.log(`- URL: ${currentUrl}`);
        console.log(`- 謌仙粥繝｡繝・そ繝ｼ繧ｸ: ${hasSuccessMessage ? '笨・ : '笶・}`);
      }
      
    } catch (error) {
      console.error('笶・繝・せ繝医お繝ｩ繝ｼ:', error);
      await page.screenshot({ path: 'character-edit-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
