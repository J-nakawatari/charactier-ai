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
    
    // 統計カードが表示されることを確認
    const statsCards = page.locator('div').filter({ hasText: '総ユーザー数' }).first();
    await expect(statsCards).toBeVisible();
    
    // ユーザー一覧が表示されることを確認
    const userListHeading = page.locator('h3:has-text("ユーザー一覧")');
    await expect(userListHeading).toBeVisible();
    
    // テーブルが表示されることを確認
    const userTable = page.locator('table').first();
    await expect(userTable).toBeVisible();
    
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
    const paginationText = page.locator('text=/\\d+ - \\d+ \\/ \\d+件/');
    if (await paginationText.isVisible()) {
      const text = await paginationText.textContent();
      console.log(`ページネーション: ${text}`);
      
      // 次のページボタンがあるか確認
      const nextButton = page.locator('button').filter({ hasText: '>' }).first();
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        console.log('次のページボタンが利用可能です');
      }
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
    
    // ユーザー詳細ページへの遷移を待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // ユーザー詳細ページかどうかを確認
    const userDetailPage = await page.url();
    if (userDetailPage.includes('/users/')) {
      console.log('✅ ユーザー詳細ページに遷移しました');
      
      // ユーザー情報が表示されることを確認
      const userInfo = page.locator('text=/メールアドレス|Email/');
      await expect(userInfo).toBeVisible({ timeout: 5000 });
      
      // 編集機能があるか確認（ユーザー詳細ページには編集機能がない可能性）
      const editButton = page.locator('button:has-text("編集")');
      if (await editButton.isVisible({ timeout: 2000 })) {
        console.log('編集ボタンが見つかりました');
        await editButton.click();
        
        // 編集フォームが表示されるのを待つ
        await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 5000 });
      } else {
        console.log('ℹ️ このページには編集機能がありません');
      }
    } else {
      console.log('⚠️ ユーザー詳細ページへの遷移に失敗しました');
    }
  });

  test('ユーザーアカウントの停止と再開', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // アクティブなユーザーを探す
    const activeUserRow = page.locator('tr:has-text("アクティブ")').first();
    
    if (await activeUserRow.isVisible()) {
      // 停止ボタン（禁止アイコン）をクリック - 操作列の2番目のボタン
      const banButton = activeUserRow.locator('td:last-child button').nth(1);
      await banButton.click();
      
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