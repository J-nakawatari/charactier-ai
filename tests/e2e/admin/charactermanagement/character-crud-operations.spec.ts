import { test, expect } from '@playwright/test';

test.describe('キャラクター管理機能の包括的E2Eテスト', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  // beforeEachの代わりに、各テストで新しいコンテキストを使用

  test('新規キャラクターの作成', async ({ browser }) => {
    // 新しいコンテキストでより安定した動作を実現
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000); // 十分な待機（重要）
    
    // ページを閉じる（debug-character-formと同じアプローチ）
    await page.close();
    
    // 新しいページでキャラクター管理ページを開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(2000);
    
    // 新規作成ボタンをクリック
    await newPage.locator('button:has-text("新規作成"), a:has-text("新規作成")').click();
    
    // 基本情報の入力
    const timestamp = Date.now();
    const characterName = `テストキャラ_${timestamp}`;
    
    // より柔軟なセレクターで名前フィールドを探す
    const nameJaSelectors = [
      'input[name="name.ja"]',
      'input[name="nameJa"]',
      'input[id="name-ja"]',
      'input[placeholder*="日本語"]',
      'label:has-text("名前") + input',
      'label:has-text("日本語") + input'
    ];
    
    let nameJaInput = null;
    for (const selector of nameJaSelectors) {
      try {
        const input = newPage.locator(selector).first();
        if (await input.isVisible({ timeout: 1000 })) {
          nameJaInput = input;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!nameJaInput) {
      // 最後の手段：最初のテキスト入力フィールドを使用
      nameJaInput = newPage.locator('input[type="text"]').first();
    }
    
    await nameJaInput.fill(characterName);
    
    // 英語名も同様に
    const nameEnInput = page.locator('input[type="text"]').nth(1);
    await nameEnInput.fill(`Test Character ${timestamp}`);
    
    // 説明（textareaを探す）
    const descriptionJaInput = page.locator('textarea').first();
    await descriptionJaInput.fill('E2Eテスト用のキャラクター説明です。');
    
    const descriptionEnInput = page.locator('textarea').nth(1);
    await descriptionEnInput.fill('This is a test character for E2E testing.');
    
    // 性格プリセットを選択（必須）
    const personalityPresetSelect = page.locator('select[name="personalityPreset"], select').first();
    if (await personalityPresetSelect.isVisible()) {
      // 最初のオプション以外を選択（通常最初は空白）
      const options = await personalityPresetSelect.locator('option').all();
      if (options.length > 1) {
        const value = await options[1].getAttribute('value');
        if (value) {
          await personalityPresetSelect.selectOption(value);
        }
      }
    }
    
    // 性格タグを選択（必須）
    const personalityTags = page.locator('input[type="checkbox"][name*="personality"], label:has-text("優しい"), label:has-text("フレンドリー")');
    const firstTag = personalityTags.first();
    if (await firstTag.isVisible()) {
      await firstTag.click();
    } else {
      // チェックボックスが見つからない場合、最初のチェックボックスをクリック
      const anyCheckbox = page.locator('input[type="checkbox"]').first();
      if (await anyCheckbox.isVisible()) {
        await anyCheckbox.click();
      }
    }
    
    // プロンプト設定（通常3番目のtextarea）
    const promptInput = page.locator('textarea').nth(2);
    if (await promptInput.isVisible()) {
      await promptInput.fill('あなたは親切で優しいAIアシスタントです。');
    }
    
    // 価格タイプの選択
    const priceTypeSelect = page.locator('select[name="priceType"], input[name="priceType"][type="radio"], select[name="characterAccessType"]');
    if (await priceTypeSelect.first().isVisible()) {
      // 有料を選択
      await newPage.locator('input[value="paid"], option[value="paid"]').click();
      
      // 価格設定
      await newPage.locator('input[name="price"]').fill('1000');
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
    const saveButton = page.locator('button:has-text("保存"), button:has-text("作成"), button[type="submit"]').first();
    
    // ボタンが有効になるまで待つ
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // クリック前にネットワークアイドルを待つ
    await newPage.waitForLoadState('networkidle');
    
    // 保存ボタンをクリック
    await saveButton.click();
    
    // 成功の指標を待つ（より柔軟に）
    try {
      // まず少し待つ
      await newPage.waitForTimeout(2000);
      
      // 現在のURLを確認
      const currentUrl = page.url();
      console.log(`現在のURL: ${currentUrl}`);
      
      // 成功の判定（複数の条件）
      const isSuccess = 
        // URLがキャラクター一覧または編集ページ
        currentUrl.includes('/admin/characters') ||
        // 成功メッセージが表示されている
        await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false) ||
        // 作成したキャラクター名が表示されている
        await newPage.locator(`text="${characterName}"`).isVisible().catch(() => false);
      
      if (isSuccess) {
        console.log(`キャラクター「${characterName}」が正常に作成されました`);
      } else {
        // エラーメッセージを探す
        const errorMessage = await newPage.locator('.error-message, .toast-error, [role="alert"]:has-text("エラー")').textContent().catch(() => null);
        if (errorMessage) {
          throw new Error(`キャラクター作成エラー: ${errorMessage}`);
        }
        throw new Error('キャラクター作成の成功が確認できませんでした');
      }
    } catch (error) {
      console.error('キャラクター作成テストエラー:', error);
      await newPage.screenshot({ path: 'character-creation-error.png' });
      throw error;
    } finally {
      // クリーンアップ
      await context.close();
    }
  });

  test('既存キャラクターの編集', async ({ page }) => {
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 最初のキャラクターの編集ボタンをクリック
    const firstEditButton = page.locator('button:has-text("編集"), a:has-text("編集")').first();
    await firstEditButton.click();
    
    // 編集フォームが表示されることを確認
    await newPage.waitForSelector('input[name="name.ja"], input[name="nameJa"]');
    
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
    const currentPriceType = await newPage.locator('input[name="priceType"]:checked').getAttribute('value');
    if (currentPriceType === 'free') {
      await newPage.locator('input[value="paid"]').click();
      await newPage.locator('input[name="price"]').fill('500');
    }
    
    // 保存
    const updateResponse = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'PUT'
    );
    
    await newPage.locator('button:has-text("更新"), button:has-text("保存")').click();
    
    const response = await updateResponse;
    expect(response.status()).toBe(200);
    
    console.log(`キャラクター「${updatedName}」が正常に更新されました`);
  });

  test('キャラクターの削除', async ({ page }) => {
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
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
      
      await newPage.locator('button:has-text("削除"), button:has-text("確認")').last().click();
      
      const response = await deleteResponse;
      expect(response.status()).toBe(200);
      
      // キャラクターがリストから消えたことを確認
      await newPage.waitForTimeout(1000);
      const deletedCharacter = page.locator(`text="${characterName}"`);
      await expect(deletedCharacter).not.toBeVisible();
      
      console.log(`キャラクター「${characterName}」が正常に削除されました`);
    }
  });

  test('キャラクターのステータス管理', async ({ page }) => {
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
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
        await newPage.locator('button:has-text("確認")').click();
      }
      
      // ステータスが変更されたことを確認
      await newPage.waitForTimeout(1000);
      await expect(activeRow).toContainText('非公開');
      
      // 再度公開する
      const publishButton = activeRow.locator('button:has-text("公開する"), .status-toggle');
      await publishButton.click();
      
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await newPage.locator('button:has-text("確認")').click();
      }
      
      console.log(`キャラクター「${characterName}」のステータス切り替えが正常に動作しました`);
    }
  });

  test('キャラクター画像の管理', async ({ page }) => {
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 編集ボタンをクリック
    await newPage.locator('button:has-text("編集")').first().click();
    
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
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
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
      if (await newPage.locator('option[value="unpublish"]').isVisible()) {
        await bulkActions.selectOption('unpublish');
        
        // 実行ボタン
        await newPage.locator('button:has-text("実行")').click();
        
        // 確認ダイアログ
        const confirmDialog = page.locator('.confirm-dialog');
        if (await confirmDialog.isVisible()) {
          await newPage.locator('button:has-text("確認")').click();
        }
        
        console.log('一括操作（非公開）が実行されました');
      }
    }
  });

  test('キャラクター検索とフィルタリング', async ({ page }) => {
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 検索機能
    const searchInput = page.locator('input[placeholder*="検索"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('テスト');
      await newPage.waitForTimeout(500); // デバウンス待機
      
      // 検索結果の確認
      const results = page.locator('tbody tr, .character-row');
      const resultCount = await results.count();
      console.log(`検索結果: ${resultCount}件`);
    }
    
    // フィルタリング（価格タイプ）
    const priceFilter = page.locator('select[name="priceType"], input[name="filterPriceType"]');
    if (await priceFilter.first().isVisible()) {
      // 有料のみ表示
      await newPage.locator('[value="paid"]').click();
      await newPage.waitForTimeout(500);
      
      // 無料のみ表示
      await newPage.locator('[value="free"]').click();
      await newPage.waitForTimeout(500);
    }
    
    // ステータスフィルター
    const statusFilter = page.locator('select[name="status"], input[name="filterStatus"]');
    if (await statusFilter.first().isVisible()) {
      // 公開中のみ
      await newPage.locator('[value="active"]').click();
      await newPage.waitForTimeout(500);
    }
  });
});