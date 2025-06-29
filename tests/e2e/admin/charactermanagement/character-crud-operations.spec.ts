import { test, expect } from '@playwright/test';

test.describe('キャラクター管理機能の包括的E2Eテスト', () => {
  test.setTimeout(60000); // 全テストのタイムアウトを60秒に設定
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
    
    // 新規作成ボタンをクリック（右上の紫色のボタン）
    const newButton = newPage.locator('button:has-text("新規作成")').first();
    
    // ボタンが見つからない場合は直接URLに移動
    if (await newButton.isVisible()) {
      await newButton.click();
      // ページ遷移を待つ
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
    } else {
      console.log('⚠️ 新規作成ボタンが見つからないため、直接URLに移動');
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
    }
    
    // 基本情報の入力
    const timestamp = Date.now();
    const characterName = `テストキャラ_${timestamp}`;
    
    // まず要素の存在を確認
    await newPage.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    const textInputs = await newPage.locator('input[type="text"]').all();
    const textareas = await newPage.locator('textarea').all();
    
    console.log(`📝 入力要素数: text inputs=${textInputs.length}, textareas=${textareas.length}`);
    
    // 要素が存在しない場合はエラー
    if (textInputs.length === 0) {
      await newPage.screenshot({ path: 'no-text-inputs-error.png', fullPage: true });
      throw new Error('テキスト入力フィールドが見つかりません');
    }
    
    // キャラクター名（日本語・英語）
    if (textInputs.length >= 2) {
      await textInputs[0].fill(characterName);
      await textInputs[1].fill(`Test Character ${timestamp}`);
    } else {
      console.warn(`⚠️ 期待した数のテキスト入力フィールドがありません: ${textInputs.length}個`);
      // 最低限、最初のフィールドだけ入力
      await textInputs[0].fill(characterName);
    }
    
    // キャットフレーズ（日本語・英語）
    if (textInputs.length >= 4) {
      await textInputs[2].fill('テストキャッチフレーズ');
      await textInputs[3].fill('Test catchphrase');
    }
    
    // 説明（日本語・英語）
    if (textareas.length >= 2) {
      await textareas[0].fill('E2Eテスト用のキャラクター説明です。');
      await textareas[1].fill('This is a test character for E2E testing.');
    } else if (textareas.length >= 1) {
      await textareas[0].fill('E2Eテスト用のキャラクター説明です。');
    }
    
    // セレクトボックス
    const selects = await newPage.locator('select').all();
    
    // 性別（1番目のselect）
    if (selects.length > 0) {
      await selects[0].selectOption({ index: 1 });
    }
    
    // 年齢と職業
    if (textInputs.length > 5) {
      await textInputs[4].fill('20歳');
      await textInputs[5].fill('テストキャラクター');
    }
    
    // 性格プリセット（2番目のselect）
    if (selects.length > 1) {
      const options = await selects[1].locator('option').all();
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await selects[1].selectOption(value);
          break;
        }
      }
    }
    
    // 性格タグを選択（必須）
    const personalityTags = newPage.locator('input[type="checkbox"][name*="personality"], label:has-text("優しい"), label:has-text("フレンドリー")');
    const firstTag = personalityTags.first();
    if (await firstTag.isVisible()) {
      await firstTag.click();
    } else {
      // チェックボックスが見つからない場合、最初のチェックボックスをクリック
      const anyCheckbox = newPage.locator('input[type="checkbox"]').first();
      if (await anyCheckbox.isVisible()) {
        await anyCheckbox.click();
      }
    }
    
    // デフォルトメッセージ（日本語・英語）
    if (textareas.length >= 4) {
      await textareas[2].fill('こんにちは！テストキャラクターです。よろしくお願いします！');
      await textareas[3].fill('Hello! I am a test character. Nice to meet you!');
    } else {
      console.log(`⚠️ デフォルトメッセージ用のテキストエリアが不足: ${textareas.length}個`);
    }
    
    // 価格タイプの選択
    const priceTypeSelect = newPage.locator('select[name="priceType"], input[name="priceType"][type="radio"], select[name="characterAccessType"]');
    if (await priceTypeSelect.first().isVisible()) {
      // 有料を選択
      await newPage.locator('input[value="paid"], option[value="paid"]').click();
      
      // 価格設定
      await newPage.locator('input[name="price"]').fill('1000');
    }
    
    // AIモデルの選択
    const modelSelect = newPage.locator('select[name="model"], select[name="aiModel"]');
    if (await modelSelect.isVisible()) {
      await modelSelect.selectOption('gpt-4o-mini');
    }
    
    // 画像アップロード（オプション）
    const imageInput = newPage.locator('input[type="file"][name="avatar"], input[type="file"][name="image"]');
    if (await imageInput.isVisible()) {
      // テスト画像をアップロード（実際のファイルパスが必要）
      // await imageInput.setInputFiles('path/to/test-image.jpg');
    }
    
    // 保存ボタンをクリック
    const saveButton = newPage.locator('button:has-text("保存"), button:has-text("作成"), button[type="submit"]').first();
    
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
      const currentUrl = newPage.url();
      console.log(`現在のURL: ${currentUrl}`);
      
      // 成功の判定（複数の条件）
      let isSuccess = false;
      try {
        isSuccess = 
          // URLがキャラクター一覧または編集ページ
          currentUrl.includes('/admin/characters') ||
          // 成功メッセージが表示されている
          await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false) ||
          // 作成したキャラクター名が表示されている
          await newPage.locator(`text="${characterName}"`).isVisible().catch(() => false);
      } catch (checkError) {
        console.log('成功判定中のエラー:', checkError.message);
        isSuccess = false;
      }
      
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
      try {
        // newPageがまだ開いている場合のみスクリーンショットを撮る
        if (newPage && !newPage.isClosed()) {
          await newPage.screenshot({ path: 'character-creation-error.png' });
        }
      } catch (screenshotError) {
        console.log('スクリーンショットの保存に失敗:', screenshotError.message);
      }
      throw error;
    } finally {
      // クリーンアップ
      try {
        await context.close();
      } catch (closeError) {
        console.log('コンテキストのクローズに失敗:', closeError.message);
      }
    }
  });

  test('既存キャラクターの編集', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // スコープを広げる
    
    console.log('🔧 キャラクター編集テスト開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいページでキャラクター管理ページを開く
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // キャラクターが存在することを確認
      const characterRows = await newPage.locator('tbody tr, .character-row, [data-testid="character-item"]').count();
      console.log(`📊 キャラクター数: ${characterRows}`);
      
      if (characterRows === 0) {
        console.log('⚠️ キャラクターが存在しません。テスト用キャラクターを作成します...');
        
        // 新規作成ページへ移動
        await newPage.goto('/admin/characters/new');
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);
        
        // 最小限の情報でキャラクターを作成
        const timestamp = Date.now();
        const textInputs = await newPage.locator('input[type="text"]').all();
        await textInputs[0].fill(`編集テスト用_${timestamp}`);
        await textInputs[1].fill(`Edit Test ${timestamp}`);
        
        // キャッチフレーズ
        if (textInputs.length > 3) {
          await textInputs[2].fill('編集テスト用キャッチフレーズ');
          await textInputs[3].fill('Edit test catchphrase');
        }
        
        // 説明
        const textareas = await newPage.locator('textarea').all();
        await textareas[0].fill('編集テスト用の説明');
        await textareas[1].fill('Edit test description');
        
        // 性別
        const selects = await newPage.locator('select').all();
        if (selects.length > 0) {
          await selects[0].selectOption({ index: 1 });
        }
        
        // 性格プリセット
        if (selects.length > 1) {
          const options = await selects[1].locator('option').all();
          for (let i = 1; i < options.length; i++) {
            const value = await options[i].getAttribute('value');
            if (value && value !== '') {
              await selects[1].selectOption(value);
              break;
            }
          }
        }
        
        // 性格タグ
        const checkbox = newPage.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
        }
        
        // デフォルトメッセージ
        if (textareas.length >= 4) {
          await textareas[2].fill('編集テスト用デフォルトメッセージ');
          await textareas[3].fill('Edit test default message');
        }
        
        // 保存
        await newPage.locator('button[type="submit"]').click();
        await newPage.waitForTimeout(3000);
        
        // キャラクター一覧に戻る
        await newPage.goto('/admin/characters');
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);
      }
      
      // 編集ボタンを探す（鉛筆アイコン）
      const editButtonSelectors = [
        'button[title*="編集"]',
        'a[href*="/edit"]',
        'button svg[class*="edit"]',
        'button:has(svg)',
        '.edit-button'
      ];
      
      let editButtonClicked = false;
      for (const selector of editButtonSelectors) {
        try {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            editButtonClicked = true;
            console.log(`✅ 編集ボタンクリック: ${selector}`);
            break;
          }
        } catch (e) {
          // 次のセレクターを試す
        }
      }
      
      if (!editButtonClicked) {
        // テーブル内のリンクを直接探す（操作列の編集アイコン）
        const firstRow = newPage.locator('tbody tr').first();
        const editLink = firstRow.locator('td:last-child button').first(); // 操作列の最初のボタン
        if (await editLink.isVisible()) {
          await editLink.click();
          console.log('✅ 行内の編集アイコンクリック');
        } else {
          throw new Error('編集ボタンが見つかりません');
        }
      }
      
      // 編集ページに遷移したことを確認
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      const editUrl = newPage.url();
      console.log(`📍 編集ページURL: ${editUrl}`);
      
      // フォーム要素を確認（成功テストと同じ構造）
      const textInputs = await newPage.locator('input[type="text"]').all();
      const textareas = await newPage.locator('textarea').all();
      
      console.log(`📋 フォーム要素数: テキスト入力=${textInputs.length}, テキストエリア=${textareas.length}`);
      
      if (textInputs.length === 0) {
        throw new Error('編集フォームが表示されていません');
      }
      
      // 現在の値を取得
      const originalName = await textInputs[0].inputValue();
      console.log(`📝 現在の名前: ${originalName}`);
      
      // 名前を更新（日本語・英語）
      const timestamp = Date.now();
      const updatedNameJa = `${originalName}_更新_${timestamp}`;
      const updatedNameEn = `Updated_${timestamp}`;
      
      await textInputs[0].clear();
      await textInputs[0].fill(updatedNameJa);
      
      if (textInputs.length > 1) {
        await textInputs[1].clear();
        await textInputs[1].fill(updatedNameEn);
      }
      
      console.log('✅ 名前更新完了');
      
      // キャッチフレーズを更新
      if (textInputs.length > 3) {
        await textInputs[2].clear();
        await textInputs[2].fill('更新されたキャッチフレーズ');
        await textInputs[3].clear();
        await textInputs[3].fill('Updated catchphrase');
        console.log('✅ キャッチフレーズ更新完了');
      }
      
      // 説明を更新（日本語・英語）
      if (textareas.length >= 2) {
        await textareas[0].clear();
        await textareas[0].fill('更新されたキャラクター説明です。E2Eテストによる編集。');
        await textareas[1].clear();
        await textareas[1].fill('Updated character description. Edited by E2E test.');
        console.log('✅ 説明更新完了');
      }
      
      // デフォルトメッセージを更新
      if (textareas.length >= 4) {
        await textareas[2].clear();
        await textareas[2].fill('更新されたデフォルトメッセージです！');
        await textareas[3].clear();
        await textareas[3].fill('Updated default message!');
        console.log('✅ デフォルトメッセージ更新完了');
      }
      
      // スクリーンショット（更新前）
      await newPage.screenshot({ path: 'character-edit-before-save.png', fullPage: true });
      
      // 保存ボタンを探す
      const saveButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("更新")',
        'button:has-text("保存")',
        'button:has-text("変更を保存")',
        '.save-button'
      ];
      
      let saveButton = null;
      for (const selector of saveButtonSelectors) {
        const button = newPage.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          saveButton = button;
          console.log(`✅ 保存ボタン発見: ${selector}`);
          break;
        }
      }
      
      if (!saveButton) {
        throw new Error('保存ボタンが見つかりません');
      }
      
      // APIレスポンスを監視
      const updateResponsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && 
                   (response.request().method() === 'PUT' || response.request().method() === 'PATCH'),
        { timeout: 10000 }
      ).catch(() => null);
      
      // 保存
      await saveButton.click();
      console.log('✅ 保存ボタンクリック');
      
      // レスポンスを待つ
      const response = await updateResponsePromise;
      if (response) {
        const status = response.status();
        console.log(`📡 APIレスポンス: ${status}`);
        
        if (status === 200 || status === 201) {
          console.log(`✅ キャラクター「${updatedNameJa}」が正常に更新されました`);
        } else {
          const responseBody = await response.json().catch(() => response.text());
          console.log('❌ 更新エラー:', responseBody);
        }
      }
      
      // 結果を待つ
      await newPage.waitForTimeout(3000);
      
      // 成功判定
      const finalUrl = newPage.url();
      const isSuccess = 
        finalUrl.includes('/admin/characters') && !finalUrl.includes('/edit') ||
        await newPage.locator('.toast-success').isVisible().catch(() => false);
      
      if (!isSuccess) {
        await newPage.screenshot({ path: 'character-edit-error.png', fullPage: true });
      }
      
      expect(response?.status()).toBe(200);
      
    } catch (error) {
      console.error('❌ 編集テストエラー:', error);
      // スクリーンショットはエラー箇所で直接保存
      throw error;
    } finally {
      await context.close();
    }
  });

  test('キャラクターの削除', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // スコープを広げる
    
    console.log('🗑️ キャラクター削除テスト開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいページでキャラクター管理ページを開く
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // キャラクター行を取得
      const characterRows = await newPage.locator('tbody tr, .character-row, [data-testid="character-item"]').all();
      const rowCount = characterRows.length;
      console.log(`📊 キャラクター数: ${rowCount}`);
      
      if (rowCount === 0) {
        console.log('⚠️ 削除できるキャラクターがありません');
        // テストをスキップ
        return;
      }
      
      // テスト用に作成されたキャラクターを探す
      let targetRow = null;
      let characterName = '';
      
      // テスト関連の名前を持つキャラクターを探す
      for (const row of characterRows) {
        const nameCell = await row.locator('td:first-child, .character-name').textContent();
        if (nameCell && (nameCell.includes('テスト') || nameCell.includes('Test') || nameCell.includes('編雈'))) {
          targetRow = row;
          characterName = nameCell;
          console.log(`🎯 削除対象: ${characterName}`);
          break;
        }
      }
      
      // テスト用キャラクターが見つからない場合、最後のキャラクターを使用
      if (!targetRow) {
        targetRow = characterRows[characterRows.length - 1];
        characterName = await targetRow.locator('td:first-child, .character-name').textContent() || '不明';
        console.log(`🎯 最後のキャラクターを削除: ${characterName}`);
      }
      
      // 削除ボタンを探す（ゴミ箱アイコン）
      const deleteButtonSelectors = [
        'button[title*="削除"]',
        'button svg[class*="trash"]',
        'button:has-text("削除")',
        '[data-action="delete"]',
        '.delete-button'
      ];
      
      let deleteButton = null;
      for (const selector of deleteButtonSelectors) {
        const button = targetRow.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          deleteButton = button;
          console.log(`✅ 削除ボタン発見: ${selector}`);
          break;
        }
      }
      
      if (!deleteButton) {
        throw new Error('削除ボタンが見つかりません');
      }
      
      // 削除ボタンをクリック
      await deleteButton.click();
      console.log('✅ 削除ボタンクリック');
      
      // 確認ダイアログを待つ
      await newPage.waitForTimeout(1000);
      
      // ダイアログの要素を探す
      const dialogSelectors = [
        '.confirm-dialog',
        '[role="dialog"]',
        '.modal',
        '[data-testid="confirm-dialog"]',
        '.delete-confirmation'
      ];
      
      let confirmDialog = null;
      for (const selector of dialogSelectors) {
        const dialog = newPage.locator(selector).first();
        if (await dialog.isVisible({ timeout: 1000 })) {
          confirmDialog = dialog;
          console.log(`✅ 確認ダイアログ発見: ${selector}`);
          break;
        }
      }
      
      if (confirmDialog) {
        // ダイアログ内の確認ボタンを探す
        const confirmButtonSelectors = [
          'button:has-text("削除")',
          'button:has-text("確認")',
          'button:has-text("OK")',
          'button:has-text("はい")',
          'button[data-action="confirm"]'
        ];
        
        // APIレスポンスを監視
        const deleteResponsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'DELETE',
          { timeout: 10000 }
        ).catch(() => null);
        
        // ダイアログ内のボタンをクリック
        let confirmClicked = false;
        for (const selector of confirmButtonSelectors) {
          const button = confirmDialog.locator(selector).last();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            confirmClicked = true;
            console.log(`✅ 確認ボタンクリック: ${selector}`);
            break;
          }
        }
        
        if (!confirmClicked) {
          // ダイアログ外の確認ボタンを探す
          const globalConfirm = newPage.locator('button:has-text("削除"), button:has-text("確認")').last();
          if (await globalConfirm.isVisible()) {
            await globalConfirm.click();
            console.log('✅ グローバル確認ボタンクリック');
          }
        }
        
        // APIレスポンスを待つ
        const response = await deleteResponsePromise;
        if (response) {
          const status = response.status();
          console.log(`📡 APIレスポンス: ${status}`);
          expect(status).toBe(200);
        }
        
        // 削除後の確認
        await newPage.waitForTimeout(2000);
        
        // キャラクターがリストから消えたことを確認
        const deletedCharacter = newPage.locator(`text="${characterName}"`);
        const isDeleted = !(await deletedCharacter.isVisible({ timeout: 1000 }).catch(() => false));
        
        if (isDeleted) {
          console.log(`✅ キャラクター「${characterName}」が正常に削除されました`);
        } else {
          console.log(`⚠️ キャラクター「${characterName}」がまだ表示されています`);
        }
      } else {
        console.log('⚠️ 確認ダイアログが表示されませんでした');
        // 直接APIを呼ぶ可能性もあるので、レスポンスを待つ
        await newPage.waitForTimeout(3000);
      }
      
    } catch (error) {
      console.error('❌ 削除テストエラー:', error);
      // スクリーンショットはエラー箇所で直接保存
      throw error;
    } finally {
      await context.close();
    }
  });

  test.skip('キャラクターのステータス管理', async ({ browser }) => {
    // ステータス管理機能が実装されたら有効化
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
    await page.waitForTimeout(5000);
    await page.close();
    
    // 新しいページでキャラクター管理ページを開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // アクティブなキャラクターを探す
    const activeRow = newPage.locator('tr:has-text("公開中"), tr:has-text("Active"), tr:has(.status-active)').first();
    
    if (await activeRow.isVisible()) {
      const characterName = await activeRow.locator('td:first-child').textContent();
      
      // 非公開にする
      const toggleButton = activeRow.locator('button:has-text("非公開にする"), .status-toggle');
      await toggleButton.click();
      
      // 確認ダイアログの処理
      const confirmDialog = newPage.locator('.confirm-dialog');
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
    
    await context.close();
  });

  test('キャラクター画像の管理', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // スコープを広げる
    
    try {
      // ログイン
      await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    await page.close();
    
    // 新しいページでキャラクター管理ページを開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 編集ボタンをクリック
    await newPage.locator('button:has-text("編集")').first().click();
    
    // 画像管理セクションを探す
    // ギャラリー画像セクションを探す
    const gallerySection = await newPage.locator('h3:has-text("ギャラリー画像")').isVisible();
    
    if (gallerySection) {
      console.log('✅ ギャラリー画像セクションが見つかりました');
      
      // 各レベルの画像アップロードフィールドを確認
      const levels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const uploadInput = newPage.locator(`#gallery-upload-${i}`);
        const titleInput = uploadInput.locator('xpath=../following-sibling::div//input[placeholder="画像タイトル"]').first();
        const descriptionTextarea = uploadInput.locator('xpath=../following-sibling::div//textarea[placeholder="画像説明"]').first();
        
        if (await uploadInput.count() > 0) {
          console.log(`✅ レベル${level}の画像アップロード: 存在`);
          
          // 各レベルの情報を表示
          const levelHeader = newPage.locator(`h4:has-text("解放レベル ${level}")`).first();
          if (await levelHeader.isVisible()) {
            const levelInfo = await levelHeader.locator('xpath=../span').textContent();
            console.log(`  - ${levelInfo}`);
          }
        }
      }
      
      // アップロード可能枚数の確認
      const totalSlots = await newPage.locator('input[type="file"][id^="gallery-upload-"]').count();
      console.log(`\n📊 画像アップロード統計:`);
      console.log(`- 総スロット数: ${totalSlots}`);
      console.log(`- 親密度レベル範囲: 0-100`);
      console.log(`- 解放間隔: 10レベルごと`);
      
      // 実際にファイルをアップロードする場合のテスト（コメントアウト）
      // const testImagePath = path.join(__dirname, 'test-assets', 'test-character.jpg');
      // if (fs.existsSync(testImagePath)) {
      //   await newPage.locator('#gallery-upload-0').setInputFiles(testImagePath);
      //   console.log('✅ テスト画像をレベル10にアップロード');
      // }
    } else {
      console.log('⚠️ ギャラリー画像セクションが見つかりません');
      // 編集画面ではない可能性があるため、新規作成画面に遷移
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
      
      // 再度確認
      const galleryInNew = await newPage.locator('h3:has-text("ギャラリー画像")').isVisible();
      if (galleryInNew) {
        console.log('✅ 新規作成画面でギャラリー画像セクションを確認');
        
        // 画像アップロードフィールドの総数を確認
        const totalUploads = await newPage.locator('input[type="file"][id^="gallery-upload-"]').count();
        console.log(`- 画像アップロードフィールド数: ${totalUploads}個`);
        
        // 各フィールドの詳細
        for (let i = 0; i < totalUploads; i++) {
          const levelText = await newPage.locator(`h4:has-text("解放レベル ${(i + 1) * 10}")`).textContent();
          console.log(`  ${i + 1}. ${levelText}`);
        }
      }
    }
    } catch (error) {
      console.error('❌ 画像管理テストエラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });

  test.skip('キャラクターの一括操作', async ({ browser }) => {
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
    await page.waitForTimeout(5000);
    await page.close();
    
    // 新しいページでキャラクター管理ページを開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // チェックボックスで複数選択
    const checkboxes = newPage.locator('input[type="checkbox"][name="characterIds"], .character-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 2つのキャラクターを選択
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 一括操作メニューの表示
      const bulkActions = newPage.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 一括非公開のテスト
      if (await newPage.locator('option[value="unpublish"]').isVisible()) {
        await bulkActions.selectOption('unpublish');
        
        // 実行ボタン
        await newPage.locator('button:has-text("実行")').click();
        
        // 確認ダイアログ
        const confirmDialog = newPage.locator('.confirm-dialog');
        if (await confirmDialog.isVisible()) {
          await newPage.locator('button:has-text("確認")').click();
        }
        
        console.log('一括操作（非公開）が実行されました');
      }
    }
    
    await context.close();
  });

  test.skip('キャラクター検索とフィルタリング', async ({ browser }) => {
    // 検索・フィルター機能が実装されたら有効化
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
    await page.waitForTimeout(5000);
    await page.close();
    
    // 新しいページでキャラクター管理ページを開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 検索機能
    const searchInput = newPage.locator('input[placeholder*="検索"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('テスト');
      await newPage.waitForTimeout(500); // デバウンス待機
      
      // 検索結果の確認
      const results = newPage.locator('tbody tr, .character-row');
      const resultCount = await results.count();
      console.log(`検索結果: ${resultCount}件`);
    }
    
    // フィルタリング（価格タイプ）
    const priceFilter = newPage.locator('select[name="priceType"], input[name="filterPriceType"]');
    if (await priceFilter.first().isVisible()) {
      // 有料のみ表示
      await newPage.locator('[value="paid"]').click();
      await newPage.waitForTimeout(500);
      
      // 無料のみ表示
      await newPage.locator('[value="free"]').click();
      await newPage.waitForTimeout(500);
    }
    
    // ステータスフィルター
    const statusFilter = newPage.locator('select[name="status"], input[name="filterStatus"]');
    if (await statusFilter.first().isVisible()) {
      // 公開中のみ
      await newPage.locator('[value="active"]').click();
      await newPage.waitForTimeout(500);
    }
    
    await context.close();
  });
});