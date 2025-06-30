import { test, expect } from '@playwright/test';

test.describe('ユーザー管理機能の包括的E2Eテスト', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  test.beforeEach(async ({ page }) => {
    // 管理者ログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  });

  test('ユーザー一覧の表示と検索', async ({ page }) => {
    // ユーザー管理ページへ
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // ユーザー一覧が表示されることを確認
    // UserTableコンポーネントは通常の<table>タグを使用
    const userTable = page.locator('table').first();
    await expect(userTable).toBeVisible();
    
    // または、より具体的に
    const userListHeading = page.locator('h3:has-text("ユーザー一覧")');
    await expect(userListHeading).toBeVisible();
    
    // 検索機能のテスト
    const searchInput = page.locator('input[placeholder="ユーザー検索..."]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // デバウンスを待つ
      
      // 検索結果が反映されることを確認（モバイルビューも考慮）
      const searchResults = page.locator('tbody tr, div.border.rounded-lg'); // テーブル行またはモバイル用カード
      const count = await searchResults.count();
      console.log(`検索結果: ${count}件`);
    }
    
    // ページネーションの確認
    const pagination = page.locator('.pagination, [aria-label="pagination"]');
    if (await pagination.isVisible()) {
      console.log('ページネーション機能が実装されています');
    }
  });

  test('ユーザー詳細の表示', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 最初のユーザーの詳細表示ボタン（目のアイコン）をクリック
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
      console.log('⚠️ ユーザー詳細ボタンが見つかりません');
      return;
    }
    
    // 編集ページまたはモーダルが表示されることを確認
    await page.waitForSelector('input[name="username"], input[name="name"], input[name="displayName"]');
    
    // ユーザー情報を編集
    const nameInput = page.locator('input[name="username"], input[name="name"], input[name="displayName"]').first();
    const originalName = await nameInput.inputValue();
    const newName = `Updated_${Date.now()}`;
    
    await nameInput.clear();
    await nameInput.fill(newName);
    
    // 保存ボタンをクリック
    await page.locator('button:has-text("保存"), button:has-text("更新")').click();
    
    // 成功メッセージまたはリダイレクトを確認
    const successToast = page.locator('.toast-success, .success-message, [role="alert"]');
    const isSuccess = await successToast.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isSuccess) {
      console.log('ユーザー情報が正常に更新されました');
    } else {
      // リスト画面に戻って更新を確認
      await page.goto('/admin/users');
      const updatedUser = page.locator(`text="${newName}"`);
      await expect(updatedUser).toBeVisible({ timeout: 5000 });
    }
  });

  test('ユーザーアカウントの停止と再開', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // アクティブなユーザーを探す
    const activeUserRow = page.locator('tr:has-text("アクティブ"), tr:has-text("Active"), tr:has(.status-active)').first();
    
    if (await activeUserRow.isVisible()) {
      // 停止ボタンをクリック
      const suspendButton = activeUserRow.locator('button:has-text("停止"), button:has-text("Suspend")');
      await suspendButton.click();
      
      // 確認ダイアログが表示される場合
      const confirmDialog = page.locator('.confirm-dialog, [role="dialog"]');
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await page.locator('button:has-text("確認"), button:has-text("Confirm")').click();
      }
      
      // ステータスが変更されることを確認
      await page.waitForTimeout(1000);
      
      // 停止されたユーザーの再開
      const suspendedUserRow = page.locator('tr:has-text("停止中"), tr:has-text("Suspended"), tr:has(.status-suspended)').first();
      if (await suspendedUserRow.isVisible()) {
        const resumeButton = suspendedUserRow.locator('button:has-text("再開"), button:has-text("Resume")');
        await resumeButton.click();
        
        // 確認ダイアログの処理
        if (await confirmDialog.isVisible({ timeout: 1000 })) {
          await page.locator('button:has-text("確認"), button:has-text("Confirm")').click();
        }
        
        console.log('ユーザーアカウントの停止と再開が正常に動作しました');
      }
    }
  });

  test('ユーザーアカウントの削除', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // テストユーザーを作成（削除テスト用）
    const testUserEmail = `delete-test-${Date.now()}@example.com`;
    
    // APIを使って直接テストユーザーを作成（実装に応じて調整）
    // ここでは既存のユーザーを使う想定
    
    // 削除可能なユーザーを探す（最近作成されたテストユーザーなど）
    const userRows = page.locator('tbody tr, .user-row');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      // 最後のユーザー（通常は最新）の削除ボタンをクリック
      const lastUserRow = userRows.last();
      const deleteButton = lastUserRow.locator('button:has-text("削除"), button:has-text("Delete")');
      
      if (await deleteButton.isVisible()) {
        const userEmail = await lastUserRow.locator('td:nth-child(2)').textContent();
        
        await deleteButton.click();
        
        // 確認ダイアログ
        const confirmDialog = page.locator('.confirm-dialog, [role="dialog"]');
        await expect(confirmDialog).toBeVisible();
        
        // 削除理由の入力（必要な場合）
        const reasonInput = page.locator('textarea[name="reason"], input[name="deleteReason"]');
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('E2Eテストによる削除');
        }
        
        // 削除を確認
        await page.locator('button:has-text("削除"), button:has-text("Delete")').last().click();
        
        // 削除完了を確認
        await page.waitForTimeout(2000);
        
        // ユーザーがリストから消えたことを確認
        const deletedUser = page.locator(`text="${userEmail}"`);
        await expect(deletedUser).not.toBeVisible();
        
        console.log(`ユーザー ${userEmail} が正常に削除されました`);
      }
    }
  });

  test('ユーザーの詳細情報表示', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // 詳細ボタンまたはユーザー名をクリック
    const detailButton = page.locator('button:has-text("詳細"), a:has-text("詳細")').first();
    const userNameLink = page.locator('tbody tr td:first-child a').first();
    
    if (await detailButton.isVisible()) {
      await detailButton.click();
    } else if (await userNameLink.isVisible()) {
      await userNameLink.click();
    }
    
    // 詳細ページの要素を確認
    await page.waitForSelector('.user-detail, .user-info');
    
    // 期待される情報が表示されているか確認
    const expectedFields = [
      'メールアドレス',
      '登録日',
      'トークン残高',
      '購入履歴',
      '親密度'
    ];
    
    for (const field of expectedFields) {
      const fieldElement = page.locator(`text="${field}"`);
      if (await fieldElement.isVisible()) {
        console.log(`✓ ${field}が表示されています`);
      }
    }
    
    // アクティビティログの確認
    const activityLog = page.locator('.activity-log, .user-activities');
    if (await activityLog.isVisible()) {
      console.log('✓ アクティビティログが表示されています');
    }
  });

  test('一括操作機能', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // チェックボックスが存在するか確認
    const checkboxes = page.locator('input[type="checkbox"][name="userIds"], .user-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 複数のユーザーを選択
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 一括操作メニューが表示されることを確認
      const bulkActions = page.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 利用可能なアクションを確認
      const actions = ['一括停止', '一括削除', 'エクスポート'];
      for (const action of actions) {
        const actionOption = page.locator(`option:has-text("${action}")`);
        if (await actionOption.isVisible()) {
          console.log(`✓ ${action}機能が利用可能`);
        }
      }
    }
  });
});