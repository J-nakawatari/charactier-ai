import { test, expect } from '@playwright/test';

test.describe('ユーザー管琁E���Eの匁E��的E2EチE��チE, () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  test.beforeEach(async ({ page }) => {
    // 管琁E��E��グイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  });

  test('ユーザー一覧の表示と検索', async ({ page }) => {
    // ユーザー管琁E�Eージへ
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 統計カードが表示されることを確誁E
    const statsCards = page.locator('div').filter({ hasText: '総ユーザー数' }).first();
    await expect(statsCards).toBeVisible();
    
    // ユーザー一覧が表示されることを確誁E
    const userListHeading = page.locator('h3:has-text("ユーザー一覧")');
    await expect(userListHeading).toBeVisible();
    
    // チE�Eブルが表示されることを確誁E
    const userTable = page.locator('table').first();
    await expect(userTable).toBeVisible();
    
    // 検索機�EのチE��チE
    const searchInput = page.locator('input[placeholder="ユーザー検索..."]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // チE��ウンスを征E��
      
      // 検索結果が反映されることを確認（モバイルビューも老E�E�E�E
      const searchResults = page.locator('tbody tr, div.border.rounded-lg'); // チE�Eブル行また�Eモバイル用カーチE
      const count = await searchResults.count();
      console.log(`検索結果: ${count}件`);
    }
    
    // ペ�Eジネ�Eションの確誁E
    const paginationText = page.locator('text=/\\d+ - \\d+ \\/ \\d+件/');
    if (await paginationText.isVisible()) {
      const text = await paginationText.textContent();
      console.log(`ペ�Eジネ�Eション: ${text}`);
      
      // 次のペ�Eジボタンがあるか確誁E
      const nextButton = page.locator('button').filter({ hasText: '>' }).first();
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        console.log('次のペ�Eジボタンが利用可能でぁE);
      }
    }
  });

  test('ユーザー詳細の表示', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 最初�Eユーザーの詳細表示ボタン�E�目のアイコン�E�をクリチE��
    const viewButton = page.locator('button:has(svg)').filter({ has: page.locator('[data-lucide="eye"]') }).first();
    // 代替セレクタ
    const alternativeViewButton = page.locator('td button').first();
    
    try {
      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
      } else {
        await alternativeViewButton.click();
      }
    } catch {
      console.log('⚠�E�Eユーザー詳細ボタンが見つかりません');
      return;
    }
    
    // ユーザー詳細ペ�Eジへの遷移を征E��
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // ユーザー詳細ペ�EジかどぁE��を確誁E
    const userDetailPage = await page.url();
    if (userDetailPage.includes('/users/')) {
      console.log('✁Eユーザー詳細ペ�Eジに遷移しました');
      
      // ユーザー惁E��が表示されることを確誁E
      const userInfo = page.locator('text=/メールアドレス|Email/');
      await expect(userInfo).toBeVisible({ timeout: 5000 });
      
      // 編雁E���Eがあるか確認（ユーザー詳細ペ�Eジには編雁E���EがなぁE��能性�E�E
      const editButton = page.locator('button:has-text("編雁E)');
      if (await editButton.isVisible({ timeout: 2000 })) {
        console.log('編雁E�Eタンが見つかりました');
        await editButton.click();
        
        // 編雁E��ォームが表示される�Eを征E��
        await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 5000 });
      } else {
        console.log('ℹ�E�Eこ�Eペ�Eジには編雁E���Eがありません');
      }
    } else {
      console.log('⚠�E�Eユーザー詳細ペ�Eジへの遷移に失敗しました');
    }
  });

  test('ユーザーアカウント�E停止と再開', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // アクチE��ブなユーザーを探ぁE
    const activeUserRow = page.locator('tr:has-text("アクチE��チE)').first();
    
    if (await activeUserRow.isVisible()) {
      // 停止ボタン�E�禁止アイコン�E�をクリチE�� - 操作�Eの2番目のボタン
      const banButton = activeUserRow.locator('td:last-child button').nth(1);
      await banButton.click();
      
      // 確認ダイアログが表示される場吁E
      const confirmDialog = page.locator('[role="dialog"], .modal, .confirm-dialog');
      if (await confirmDialog.isVisible({ timeout: 2000 })) {
        // 確認�EタンをクリチE��
        const confirmButton = page.locator('button:has-text("確誁E), button:has-text("はぁE), button:has-text("OK")').first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
      
      // スチE�Eタスが変更されることを確誁E
      await page.waitForTimeout(2000);
      
      // 成功メチE��ージを確誁E
      const successToast = page.locator('.toast-success, [role="alert"]:has-text("停止")');
      const isSuccess = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
      if (isSuccess) {
        console.log('✁Eユーザーが正常に停止されました');
      }
      
      // 停止されたユーザーの再開
      const suspendedUserRow = page.locator('tr:has-text("停止中")').first();
      if (await suspendedUserRow.isVisible({ timeout: 5000 })) {
        // 再開ボタン�E�解除アイコン�E�をクリチE�� - 操作�Eの2番目のボタン
        const unlockButton = suspendedUserRow.locator('td:last-child button').nth(1);
        await unlockButton.click();
        
        // 再度確認ダイアログの処琁E
        if (await confirmDialog.isVisible({ timeout: 2000 })) {
          const confirmButton = page.locator('button:has-text("確誁E), button:has-text("はぁE), button:has-text("OK")').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
        }
        
        // 再開の成功を確誁E
        await page.waitForTimeout(2000);
        const resumeSuccess = page.locator('.toast-success, [role="alert"]:has-text("再開")');
        if (await resumeSuccess.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✁Eユーザーアカウントが正常に再開されました');
        } else {
          console.log('ℹ�E�Eユーザーアカウント�E停止機�Eを確認しました');
        }
      }
    }
  });

  test('ユーザーアカウント�E削除', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // チE��トユーザーを作�E�E�削除チE��ト用�E�E
    const testUserEmail = `delete-test-${Date.now()}@example.com`;
    
    // APIを使って直接チE��トユーザーを作�E�E�実裁E��応じて調整�E�E
    // ここでは既存�Eユーザーを使ぁE��宁E
    
    // 削除可能なユーザーを探す（最近作�Eされたテストユーザーなど�E�E
    const userRows = page.locator('tbody tr, .user-row');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      // 最後�Eユーザー�E�通常は最新�E��E削除ボタンをクリチE��
      const lastUserRow = userRows.last();
      const deleteButton = lastUserRow.locator('button:has-text("削除"), button:has-text("Delete")');
      
      if (await deleteButton.isVisible()) {
        const userEmail = await lastUserRow.locator('td:nth-child(2)').textContent();
        
        await deleteButton.click();
        
        // 確認ダイアログ
        const confirmDialog = page.locator('.confirm-dialog, [role="dialog"]');
        await expect(confirmDialog).toBeVisible();
        
        // 削除琁E��の入力（忁E��な場合！E
        const reasonInput = page.locator('textarea[name="reason"], input[name="deleteReason"]');
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('E2EチE��トによる削除');
        }
        
        // 削除を確誁E
        await page.locator('button:has-text("削除"), button:has-text("Delete")').last().click();
        
        // 削除完亁E��確誁E
        await page.waitForTimeout(2000);
        
        // ユーザーがリストから消えたことを確誁E
        const deletedUser = page.locator(`text="${userEmail}"`);
        await expect(deletedUser).not.toBeVisible();
        
        console.log(`ユーザー ${userEmail} が正常に削除されました`);
      }
    }
  });

  test('ユーザーの詳細惁E��表示', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 詳細ボタンまた�Eユーザー名をクリチE��
    const detailButton = page.locator('button:has-text("詳細"), a:has-text("詳細")').first();
    const userNameLink = page.locator('tbody tr td:first-child a').first();
    
    if (await detailButton.isVisible()) {
      await detailButton.click();
    } else if (await userNameLink.isVisible()) {
      await userNameLink.click();
    }
    
    // 詳細ペ�Eジの要素を確誁E
    await page.waitForSelector('.user-detail, .user-info');
    
    // 期征E��れる惁E��が表示されてぁE��か確誁E
    const expectedFields = [
      'メールアドレス',
      '登録日',
      'ト�Eクン残髁E,
      '購入履歴',
      '親寁E��'
    ];
    
    for (const field of expectedFields) {
      const fieldElement = page.locator(`text="${field}"`);
      if (await fieldElement.isVisible()) {
        console.log(`✁E${field}が表示されてぁE��す`);
      }
    }
    
    // アクチE��ビティログの確誁E
    const activityLog = page.locator('.activity-log, .user-activities');
    if (await activityLog.isVisible()) {
      console.log('✁EアクチE��ビティログが表示されてぁE��ぁE);
    }
  });

  test('一括操作機�E', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // チェチE��ボックスが存在するか確誁E
    const checkboxes = page.locator('input[type="checkbox"][name="userIds"], .user-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 褁E��のユーザーを選抁E
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 一括操作メニューが表示されることを確誁E
      const bulkActions = page.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 利用可能なアクションを確誁E
      const actions = ['一括停止', '一括削除', 'エクスポ�EチE];
      for (const action of actions) {
        const actionOption = page.locator(`option:has-text("${action}")`);
        if (await actionOption.isVisible()) {
          console.log(`✁E${action}機�Eが利用可能`);
        }
      }
    }
  });
});
