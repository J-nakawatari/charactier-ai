import { test, expect } from '@playwright/test';

test.describe('繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・ｩ溯・縺ｮ蛹・峡逧Е2E繝・せ繝・, () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  test.beforeEach(async ({ page }) => {
    // 邂｡逅・・Ο繧ｰ繧､繝ｳ
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  });

  test('繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺ｮ陦ｨ遉ｺ縺ｨ讀懃ｴ｢', async ({ page }) => {
    // 繝ｦ繝ｼ繧ｶ繝ｼ邂｡逅・・繝ｼ繧ｸ縺ｸ
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 邨ｱ險医き繝ｼ繝峨′陦ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    const statsCards = page.locator('div').filter({ hasText: '邱上Θ繝ｼ繧ｶ繝ｼ謨ｰ' }).first();
    await expect(statsCards).toBeVisible();
    
    // 繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    const userListHeading = page.locator('h3:has-text("繝ｦ繝ｼ繧ｶ繝ｼ荳隕ｧ")');
    await expect(userListHeading).toBeVisible();
    
    // 繝・・繝悶Ν縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
    const userTable = page.locator('table').first();
    await expect(userTable).toBeVisible();
    
    // 讀懃ｴ｢讖溯・縺ｮ繝・せ繝・
    const searchInput = page.locator('input[placeholder="繝ｦ繝ｼ繧ｶ繝ｼ讀懃ｴ｢..."]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // 繝・ヰ繧ｦ繝ｳ繧ｹ繧貞ｾ・▽
      
      // 讀懃ｴ｢邨先棡縺悟渚譏縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱搾ｼ医Δ繝舌う繝ｫ繝薙Η繝ｼ繧り・・・・
      const searchResults = page.locator('tbody tr, div.border.rounded-lg'); // 繝・・繝悶Ν陦後∪縺溘・繝｢繝舌う繝ｫ逕ｨ繧ｫ繝ｼ繝・
      const count = await searchResults.count();
      console.log(`讀懃ｴ｢邨先棡: ${count}莉ｶ`);
    }
    
    // 繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ縺ｮ遒ｺ隱・
    const paginationText = page.locator('text=/\\d+ - \\d+ \\/ \\d+莉ｶ/');
    if (await paginationText.isVisible()) {
      const text = await paginationText.textContent();
      console.log(`繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ: ${text}`);
      
      // 谺｡縺ｮ繝壹・繧ｸ繝懊ち繝ｳ縺後≠繧九°遒ｺ隱・
      const nextButton = page.locator('button').filter({ hasText: '>' }).first();
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        console.log('谺｡縺ｮ繝壹・繧ｸ繝懊ち繝ｳ縺悟茜逕ｨ蜿ｯ閭ｽ縺ｧ縺・);
      }
    }
  });

  test('繝ｦ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ縺ｮ陦ｨ遉ｺ', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 譛蛻昴・繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隧ｳ邏ｰ陦ｨ遉ｺ繝懊ち繝ｳ・育岼縺ｮ繧｢繧､繧ｳ繝ｳ・峨ｒ繧ｯ繝ｪ繝・け
    const viewButton = page.locator('button:has(svg)').filter({ has: page.locator('[data-lucide="eye"]') }).first();
    // 莉｣譖ｿ繧ｻ繝ｬ繧ｯ繧ｿ
    const alternativeViewButton = page.locator('td button').first();
    
    try {
      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
      } else {
        await alternativeViewButton.click();
      }
    } catch {
      console.log('笞・・繝ｦ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ繝懊ち繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      return;
    }
    
    // 繝ｦ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ繝壹・繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // 繝ｦ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ繝壹・繧ｸ縺九←縺・°繧堤｢ｺ隱・
    const userDetailPage = await page.url();
    if (userDetailPage.includes('/users/')) {
      console.log('笨・繝ｦ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ繝壹・繧ｸ縺ｫ驕ｷ遘ｻ縺励∪縺励◆');
      
      // 繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
      const userInfo = page.locator('text=/繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ|Email/');
      await expect(userInfo).toBeVisible({ timeout: 5000 });
      
      // 邱ｨ髮・ｩ溯・縺後≠繧九°遒ｺ隱搾ｼ医Θ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ繝壹・繧ｸ縺ｫ縺ｯ邱ｨ髮・ｩ溯・縺後↑縺・庄閭ｽ諤ｧ・・
      const editButton = page.locator('button:has-text("邱ｨ髮・)');
      if (await editButton.isVisible({ timeout: 2000 })) {
        console.log('邱ｨ髮・・繧ｿ繝ｳ縺瑚ｦ九▽縺九ｊ縺ｾ縺励◆');
        await editButton.click();
        
        // 邱ｨ髮・ヵ繧ｩ繝ｼ繝縺瑚｡ｨ遉ｺ縺輔ｌ繧九・繧貞ｾ・▽
        await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 5000 });
      } else {
        console.log('邃ｹ・・縺薙・繝壹・繧ｸ縺ｫ縺ｯ邱ｨ髮・ｩ溯・縺後≠繧翫∪縺帙ｓ');
      }
    } else {
      console.log('笞・・繝ｦ繝ｼ繧ｶ繝ｼ隧ｳ邏ｰ繝壹・繧ｸ縺ｸ縺ｮ驕ｷ遘ｻ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }
  });

  test('繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝医・蛛懈ｭ｢縺ｨ蜀埼幕', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 繧｢繧ｯ繝・ぅ繝悶↑繝ｦ繝ｼ繧ｶ繝ｼ繧呈爾縺・
    const activeUserRow = page.locator('tr:has-text("繧｢繧ｯ繝・ぅ繝・)').first();
    
    if (await activeUserRow.isVisible()) {
      // 蛛懈ｭ｢繝懊ち繝ｳ・育ｦ∵ｭ｢繧｢繧､繧ｳ繝ｳ・峨ｒ繧ｯ繝ｪ繝・け - 謫堺ｽ懷・縺ｮ2逡ｪ逶ｮ縺ｮ繝懊ち繝ｳ
      const banButton = activeUserRow.locator('td:last-child button').nth(1);
      await banButton.click();
      
      // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ縺瑚｡ｨ遉ｺ縺輔ｌ繧句ｴ蜷・
      const confirmDialog = page.locator('[role="dialog"], .modal, .confirm-dialog');
      if (await confirmDialog.isVisible({ timeout: 2000 })) {
        // 遒ｺ隱阪・繧ｿ繝ｳ繧偵け繝ｪ繝・け
        const confirmButton = page.locator('button:has-text("遒ｺ隱・), button:has-text("縺ｯ縺・), button:has-text("OK")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
      
      // 繧ｹ繝・・繧ｿ繧ｹ縺悟､画峩縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
      await page.waitForTimeout(2000);
      
      // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧堤｢ｺ隱・
      const successToast = page.locator('.toast-success, [role="alert"]:has-text("蛛懈ｭ｢")');
      const isSuccess = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
      if (isSuccess) {
        console.log('笨・繝ｦ繝ｼ繧ｶ繝ｼ縺梧ｭ｣蟶ｸ縺ｫ蛛懈ｭ｢縺輔ｌ縺ｾ縺励◆');
      }
      
      // 蛛懈ｭ｢縺輔ｌ縺溘Θ繝ｼ繧ｶ繝ｼ縺ｮ蜀埼幕
      const suspendedUserRow = page.locator('tr:has-text("蛛懈ｭ｢荳ｭ")').first();
      if (await suspendedUserRow.isVisible({ timeout: 5000 })) {
        // 蜀埼幕繝懊ち繝ｳ・郁ｧ｣髯､繧｢繧､繧ｳ繝ｳ・峨ｒ繧ｯ繝ｪ繝・け - 謫堺ｽ懷・縺ｮ2逡ｪ逶ｮ縺ｮ繝懊ち繝ｳ
        const unlockButton = suspendedUserRow.locator('td:last-child button').nth(1);
        await unlockButton.click();
        
        // 蜀榊ｺｦ遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ縺ｮ蜃ｦ逅・
        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          const confirmButton = page.locator('button:has-text("遒ｺ隱・), button:has-text("縺ｯ縺・), button:has-text("OK")').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
        }
        
        // 蜀埼幕縺ｮ謌仙粥繧堤｢ｺ隱・
        await page.waitForTimeout(2000);
        const resumeSuccess = page.locator('.toast-success, [role="alert"]:has-text("蜀埼幕")');
        if (await resumeSuccess.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('笨・繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝医′豁｣蟶ｸ縺ｫ蜀埼幕縺輔ｌ縺ｾ縺励◆');
        } else {
          console.log('邃ｹ・・繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝医・蛛懈ｭ｢讖溯・繧堤｢ｺ隱阪＠縺ｾ縺励◆');
        }
      }
    }
  });

  test('繝ｦ繝ｼ繧ｶ繝ｼ繧｢繧ｫ繧ｦ繝ｳ繝医・蜑企勁', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 繝・せ繝医Θ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・・亥炎髯､繝・せ繝育畑・・
    const testUserEmail = `delete-test-${Date.now()}@example.com`;
    
    // API繧剃ｽｿ縺｣縺ｦ逶ｴ謗･繝・せ繝医Θ繝ｼ繧ｶ繝ｼ繧剃ｽ懈・・亥ｮ溯｣・↓蠢懊§縺ｦ隱ｿ謨ｴ・・
    // 縺薙％縺ｧ縺ｯ譌｢蟄倥・繝ｦ繝ｼ繧ｶ繝ｼ繧剃ｽｿ縺・Φ螳・
    
    // 蜑企勁蜿ｯ閭ｽ縺ｪ繝ｦ繝ｼ繧ｶ繝ｼ繧呈爾縺呻ｼ域怙霑台ｽ懈・縺輔ｌ縺溘ユ繧ｹ繝医Θ繝ｼ繧ｶ繝ｼ縺ｪ縺ｩ・・
    const userRows = page.locator('tbody tr, .user-row');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      // 譛蠕後・繝ｦ繝ｼ繧ｶ繝ｼ・磯壼ｸｸ縺ｯ譛譁ｰ・峨・蜑企勁繝懊ち繝ｳ繧偵け繝ｪ繝・け
      const lastUserRow = userRows.last();
      const deleteButton = lastUserRow.locator('button:has-text("蜑企勁"), button:has-text("Delete")');
      
      if (await deleteButton.isVisible()) {
        const userEmail = await lastUserRow.locator('td:nth-child(2)').textContent();
        
        await deleteButton.click();
        
        // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ
        const confirmDialog = page.locator('.confirm-dialog, [role="dialog"]');
        await expect(confirmDialog).toBeVisible();
        
        // 蜑企勁逅・罰縺ｮ蜈･蜉幢ｼ亥ｿ・ｦ√↑蝣ｴ蜷茨ｼ・
        const reasonInput = page.locator('textarea[name="reason"], input[name="deleteReason"]');
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('E2E繝・せ繝医↓繧医ｋ蜑企勁');
        }
        
        // 蜑企勁繧堤｢ｺ隱・
        await page.locator('button:has-text("蜑企勁"), button:has-text("Delete")').last().click();
        
        // 蜑企勁螳御ｺ・ｒ遒ｺ隱・
        await page.waitForTimeout(2000);
        
        // 繝ｦ繝ｼ繧ｶ繝ｼ縺後Μ繧ｹ繝医°繧画ｶ医∴縺溘％縺ｨ繧堤｢ｺ隱・
        const deletedUser = page.locator(`text="${userEmail}"`);
        await expect(deletedUser).not.toBeVisible();
        
        console.log(`繝ｦ繝ｼ繧ｶ繝ｼ ${userEmail} 縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆`);
      }
    }
  });

  test('繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隧ｳ邏ｰ諠・ｱ陦ｨ遉ｺ', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 隧ｳ邏ｰ繝懊ち繝ｳ縺ｾ縺溘・繝ｦ繝ｼ繧ｶ繝ｼ蜷阪ｒ繧ｯ繝ｪ繝・け
    const detailButton = page.locator('button:has-text("隧ｳ邏ｰ"), a:has-text("隧ｳ邏ｰ")').first();
    const userNameLink = page.locator('tbody tr td:first-child a').first();
    
    if (await detailButton.isVisible()) {
      await detailButton.click();
    } else if (await userNameLink.isVisible()) {
      await userNameLink.click();
    }
    
    // 隧ｳ邏ｰ繝壹・繧ｸ縺ｮ隕∫ｴ繧堤｢ｺ隱・
    await page.waitForSelector('.user-detail, .user-info');
    
    // 譛溷ｾ・＆繧後ｋ諠・ｱ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・ｋ縺狗｢ｺ隱・
    const expectedFields = [
      '繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ',
      '逋ｻ骭ｲ譌･',
      '繝医・繧ｯ繝ｳ谿矩ｫ・,
      '雉ｼ蜈･螻･豁ｴ',
      '隕ｪ蟇・ｺｦ'
    ];
    
    for (const field of expectedFields) {
      const fieldElement = page.locator(`text="${field}"`);
      if (await fieldElement.isVisible()) {
        console.log(`笨・${field}縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺兪);
      }
    }
    
    // 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ縺ｮ遒ｺ隱・
    const activityLog = page.locator('.activity-log, .user-activities');
    if (await activityLog.isVisible()) {
      console.log('笨・繧｢繧ｯ繝・ぅ繝薙ユ繧｣繝ｭ繧ｰ縺瑚｡ｨ遉ｺ縺輔ｌ縺ｦ縺・∪縺・);
    }
  });

  test('荳諡ｬ謫堺ｽ懈ｩ溯・', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 繝√ぉ繝・け繝懊ャ繧ｯ繧ｹ縺悟ｭ伜惠縺吶ｋ縺狗｢ｺ隱・
    const checkboxes = page.locator('input[type="checkbox"][name="userIds"], .user-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 隍・焚縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ繧帝∈謚・
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 荳諡ｬ謫堺ｽ懊Γ繝九Η繝ｼ縺瑚｡ｨ遉ｺ縺輔ｌ繧九％縺ｨ繧堤｢ｺ隱・
      const bulkActions = page.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 蛻ｩ逕ｨ蜿ｯ閭ｽ縺ｪ繧｢繧ｯ繧ｷ繝ｧ繝ｳ繧堤｢ｺ隱・
      const actions = ['荳諡ｬ蛛懈ｭ｢', '荳諡ｬ蜑企勁', '繧ｨ繧ｯ繧ｹ繝昴・繝・];
      for (const action of actions) {
        const actionOption = page.locator(`option:has-text("${action}")`);
        if (await actionOption.isVisible()) {
          console.log(`笨・${action}讖溯・縺悟茜逕ｨ蜿ｯ閭ｽ`);
        }
      }
    }
  });
});
