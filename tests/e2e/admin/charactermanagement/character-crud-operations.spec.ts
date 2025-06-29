import { test, expect } from '@playwright/test';

test.describe('キャラクター管理機能の包括的E2Eテスト', () => {
  const adminEmail = 'admin-test@example.com';
  const adminPassword = 'Test123!';
  
  test.beforeEach(async ({ page }) => {
    // 管理者ログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  });

  test('新規キャラクターの作成', async ({ page }) => {
    // キャラクター管理ページへ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 新規作成ボタンをクリック
    await page.locator('button:has-text("新規作成"), a:has-text("新規作成")').click();
    
    // 基本情報の入力
    const timestamp = Date.now();
    const characterName = `テストキャラ_${timestamp}`;
    
    // 名前（日本語）
    await page.locator('input[name="name.ja"], input[name="nameJa"]').fill(characterName);
    
    // 名前（英語）
    await page.locator('input[name="name.en"], input[name="nameEn"]').fill(`Test Character ${timestamp}`);
    
    // 説明
    await page.locator('textarea[name="description.ja"], textarea[name="descriptionJa"]').fill('E2Eテスト用のキャラクター説明です。');
    await page.locator('textarea[name="description.en"], textarea[name="descriptionEn"]').fill('This is a test character for E2E testing.');
    
    // プロンプト設定
    await page.locator('textarea[name="characterPrompt"], textarea[name="prompt"]').fill('あなたは親切で優しいAIアシスタントです。');
    
    // 価格タイプの選択
    const priceTypeSelect = page.locator('select[name="priceType"], input[name="priceType"][type="radio"]');
    if (await priceTypeSelect.first().isVisible()) {
      // 有料を選択
      await page.locator('input[value="paid"], option[value="paid"]').click();
      
      // 価格設定
      await page.locator('input[name="price"]').fill('1000');
    }
    
    // AIモデルの選択
    const modelSelect = page.locator('select[name="model"], select[name="aiModel"]');
    if (await modelSelect.isVisible()) {
      await modelSelect.selectOption('gpt-4o-mini');
    }
    
    // 画像アップロード（オプション）
    const imageInput = page.locator('input[type="file"][name="avatar"], input[type="file"][name="image"]');
    if (await imageInput.isVisible()) {
      // テスト画像をアップロード（実際のファイルパスが必要）
      // await imageInput.setInputFiles('path/to/test-image.jpg');
    }
    
    // 保存ボタンをクリック
    const saveResponse = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST'
    );
    
    await page.locator('button:has-text("保存"), button[type="submit"]').click();
    
    const response = await saveResponse;
    expect(response.status()).toBe(201);
    
    // 成功メッセージを確認
    const successMessage = page.locator('.toast-success, .success-message');
    await expect(successMessage).toBeVisible();
    
    console.log(`キャラクター「${characterName}」が正常に作成されました`);
  });

  test('既存キャラクターの編集', async ({ page }) => {
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 最初のキャラクターの編集ボタンをクリック
    const firstEditButton = page.locator('button:has-text("編集"), a:has-text("編集")').first();
    await firstEditButton.click();
    
    // 編集フォームが表示されることを確認
    await page.waitForSelector('input[name="name.ja"], input[name="nameJa"]');
    
    // 現在の値を取得
    const nameInput = page.locator('input[name="name.ja"], input[name="nameJa"]');
    const originalName = await nameInput.inputValue();
    
    // 名前を更新
    const updatedName = `${originalName}_更新_${Date.now()}`;
    await nameInput.clear();
    await nameInput.fill(updatedName);
    
    // 説明を更新
    const descriptionInput = page.locator('textarea[name="description.ja"], textarea[name="descriptionJa"]');
    await descriptionInput.clear();
    await descriptionInput.fill('更新されたキャラクター説明です。E2Eテストによる編集。');
    
    // プロンプトを更新
    const promptInput = page.locator('textarea[name="characterPrompt"], textarea[name="prompt"]');
    const currentPrompt = await promptInput.inputValue();
    await promptInput.clear();
    await promptInput.fill(`${currentPrompt}\n更新時刻: ${new Date().toISOString()}`);
    
    // 価格タイプの変更テスト
    const currentPriceType = await page.locator('input[name="priceType"]:checked').getAttribute('value');
    if (currentPriceType === 'free') {
      await page.locator('input[value="paid"]').click();
      await page.locator('input[name="price"]').fill('500');
    }
    
    // 保存
    const updateResponse = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'PUT'
    );
    
    await page.locator('button:has-text("更新"), button:has-text("保存")').click();
    
    const response = await updateResponse;
    expect(response.status()).toBe(200);
    
    console.log(`キャラクター「${updatedName}」が正常に更新されました`);
  });

  test('キャラクターの削除', async ({ page }) => {
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // テスト用キャラクターを探す（最後のキャラクター）
    const characterRows = page.locator('tbody tr, .character-row');
    const rowCount = await characterRows.count();
    
    if (rowCount > 0) {
      const lastRow = characterRows.last();
      const characterName = await lastRow.locator('td:first-child').textContent();
      
      // 削除ボタンをクリック
      const deleteButton = lastRow.locator('button:has-text("削除"), button:has-text("Delete")');
      await deleteButton.click();
      
      // 確認ダイアログ
      const confirmDialog = page.locator('.confirm-dialog, [role="dialog"]');
      await expect(confirmDialog).toBeVisible();
      
      // ダイアログ内のメッセージを確認
      const dialogMessage = confirmDialog.locator('.dialog-message, .confirm-message');
      await expect(dialogMessage).toContainText(characterName || '');
      
      // 削除を確認
      const deleteResponse = page.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'DELETE'
      );
      
      await page.locator('button:has-text("削除"), button:has-text("確認")').last().click();
      
      const response = await deleteResponse;
      expect(response.status()).toBe(200);
      
      // キャラクターがリストから消えたことを確認
      await page.waitForTimeout(1000);
      const deletedCharacter = page.locator(`text="${characterName}"`);
      await expect(deletedCharacter).not.toBeVisible();
      
      console.log(`キャラクター「${characterName}」が正常に削除されました`);
    }
  });

  test('キャラクターのステータス管理', async ({ page }) => {
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // アクティブなキャラクターを探す
    const activeRow = page.locator('tr:has-text("公開中"), tr:has-text("Active"), tr:has(.status-active)').first();
    
    if (await activeRow.isVisible()) {
      const characterName = await activeRow.locator('td:first-child').textContent();
      
      // 非公開にする
      const toggleButton = activeRow.locator('button:has-text("非公開にする"), .status-toggle');
      await toggleButton.click();
      
      // 確認ダイアログの処理
      const confirmDialog = page.locator('.confirm-dialog');
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await page.locator('button:has-text("確認")').click();
      }
      
      // ステータスが変更されたことを確認
      await page.waitForTimeout(1000);
      await expect(activeRow).toContainText('非公開');
      
      // 再度公開する
      const publishButton = activeRow.locator('button:has-text("公開する"), .status-toggle');
      await publishButton.click();
      
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await page.locator('button:has-text("確認")').click();
      }
      
      console.log(`キャラクター「${characterName}」のステータス切り替えが正常に動作しました`);
    }
  });

  test('キャラクター画像の管理', async ({ page }) => {
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 編集ボタンをクリック
    await page.locator('button:has-text("編集")').first().click();
    
    // 画像管理セクションを探す
    const imageSection = page.locator('.image-management, .character-images');
    
    if (await imageSection.isVisible()) {
      // レベル画像の設定
      const levelImageInputs = page.locator('input[type="file"][name*="levelImage"]');
      const inputCount = await levelImageInputs.count();
      
      console.log(`${inputCount}個のレベル画像スロットが見つかりました`);
      
      // レベル10の画像設定を確認
      const level10Section = page.locator('.level-10-image, [data-level="10"]');
      if (await level10Section.isVisible()) {
        console.log('レベル10画像の設定セクションが存在します');
        
        // アンロック条件の確認
        const unlockInfo = page.locator('.unlock-info, .level-requirement');
        if (await unlockInfo.isVisible()) {
          const unlockText = await unlockInfo.textContent();
          console.log(`アンロック条件: ${unlockText}`);
        }
      }
    }
  });

  test('キャラクターの一括操作', async ({ page }) => {
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // チェックボックスで複数選択
    const checkboxes = page.locator('input[type="checkbox"][name="characterIds"], .character-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 2つのキャラクターを選択
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 一括操作メニューの表示
      const bulkActions = page.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 一括非公開のテスト
      if (await page.locator('option[value="unpublish"]').isVisible()) {
        await bulkActions.selectOption('unpublish');
        
        // 実行ボタン
        await page.locator('button:has-text("実行")').click();
        
        // 確認ダイアログ
        const confirmDialog = page.locator('.confirm-dialog');
        if (await confirmDialog.isVisible()) {
          await page.locator('button:has-text("確認")').click();
        }
        
        console.log('一括操作（非公開）が実行されました');
      }
    }
  });

  test('キャラクター検索とフィルタリング', async ({ page }) => {
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // 検索機能
    const searchInput = page.locator('input[placeholder*="検索"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('テスト');
      await page.waitForTimeout(500); // デバウンス待機
      
      // 検索結果の確認
      const results = page.locator('tbody tr, .character-row');
      const resultCount = await results.count();
      console.log(`検索結果: ${resultCount}件`);
    }
    
    // フィルタリング（価格タイプ）
    const priceFilter = page.locator('select[name="priceType"], input[name="filterPriceType"]');
    if (await priceFilter.first().isVisible()) {
      // 有料のみ表示
      await page.locator('[value="paid"]').click();
      await page.waitForTimeout(500);
      
      // 無料のみ表示
      await page.locator('[value="free"]').click();
      await page.waitForTimeout(500);
    }
    
    // ステータスフィルター
    const statusFilter = page.locator('select[name="status"], input[name="filterStatus"]');
    if (await statusFilter.first().isVisible()) {
      // 公開中のみ
      await page.locator('[value="active"]').click();
      await page.waitForTimeout(500);
    }
  });
});