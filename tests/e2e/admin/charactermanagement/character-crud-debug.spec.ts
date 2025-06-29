import { test, expect } from '@playwright/test';

test.describe('キャラクター作成デバッグテスト', () => {
  test.setTimeout(90000); // 90秒のタイムアウト
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター作成 - 詳細デバッグ版', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 デバッグテスト開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいページでキャラクター作成ページへ直接遷移
      const newPage = await context.newPage();
      console.log('\n📄 キャラクター作成ページへ直接遷移...');
      
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      const currentUrl = newPage.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      
      // ページの内容を確認
      const pageTitle = await newPage.title();
      console.log(`📄 ページタイトル: ${pageTitle}`);
      
      // フォーム要素の詳細確認
      console.log('\n🔍 フォーム要素の詳細確認:');
      
      // 全ての入力要素を確認
      const allInputs = await newPage.locator('input').all();
      console.log(`\n入力要素総数: ${allInputs.length}`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const required = await input.getAttribute('required');
        console.log(`  [${i}] type="${type}" name="${name}" placeholder="${placeholder}" required="${required}"`);
      }
      
      // 全てのselect要素を確認
      const allSelects = await newPage.locator('select').all();
      console.log(`\nセレクト要素総数: ${allSelects.length}`);
      
      for (let i = 0; i < allSelects.length; i++) {
        const select = allSelects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const optionCount = await select.locator('option').count();
        console.log(`  [${i}] name="${name}" required="${required}" options=${optionCount}`);
      }
      
      // 全てのtextarea要素を確認
      const allTextareas = await newPage.locator('textarea').all();
      console.log(`\nテキストエリア総数: ${allTextareas.length}`);
      
      for (let i = 0; i < allTextareas.length; i++) {
        const textarea = allTextareas[i];
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        const required = await textarea.getAttribute('required');
        console.log(`  [${i}] name="${name}" placeholder="${placeholder}" required="${required}"`);
      }
      
      // フォーム入力（最小限の必須項目のみ）
      console.log('\n📝 最小限の必須項目を入力...');
      const timestamp = Date.now();
      
      // 名前フィールドを特定して入力
      const nameFields = await newPage.locator('input[type="text"]').all();
      if (nameFields.length >= 2) {
        console.log('  名前フィールドに入力...');
        await nameFields[0].fill(`デバッグキャラ_${timestamp}`);
        await nameFields[1].fill(`Debug Char ${timestamp}`);
      }
      
      // 性格プリセットを選択（必須の可能性）
      const personalitySelect = await newPage.locator('select').first();
      if (await personalitySelect.isVisible()) {
        console.log('  性格プリセットを選択...');
        const options = await personalitySelect.locator('option').all();
        console.log(`  オプション数: ${options.length}`);
        
        for (let i = 0; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          const text = await options[i].textContent();
          console.log(`    [${i}] value="${value}", text="${text}"`);
        }
        
        // 空でない最初の値を選択
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            console.log(`  選択: ${value}`);
            await personalitySelect.selectOption(value);
            break;
          }
        }
      }
      
      // チェックボックスを1つ選択（必須の可能性）
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        console.log('  チェックボックスを選択...');
        await checkboxes[0].click();
      }
      
      // 保存前のスクリーンショット
      await newPage.screenshot({ path: 'debug-before-save.png', fullPage: true });
      
      // 保存ボタンを探す
      console.log('\n🔍 保存ボタンを探索...');
      const saveButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("保存")',
        'button:has-text("作成")',
        'button:has-text("登録")',
        'button:has-text("追加")'
      ];
      
      let saveButton = null;
      for (const selector of saveButtonSelectors) {
        const button = newPage.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          saveButton = button;
          console.log(`✅ 保存ボタン発見: ${selector}`);
          const buttonText = await button.textContent();
          console.log(`  ボタンテキスト: "${buttonText}"`);
          break;
        }
      }
      
      if (saveButton) {
        // ボタンの状態を確認
        const isEnabled = await saveButton.isEnabled();
        console.log(`  ボタン有効: ${isEnabled}`);
        
        if (!isEnabled) {
          console.log('⚠️ ボタンが無効です。必須項目を確認します...');
          
          // エラーメッセージを探す
          const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
          if (errorMessages.length > 0) {
            console.log('エラーメッセージ:', errorMessages);
          }
        }
        
        // ネットワークリクエストを監視
        console.log('\n📡 ネットワーク監視を開始...');
        
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        // 保存ボタンをクリック
        await saveButton.click();
        console.log('✅ 保存ボタンクリック');
        
        // レスポンスを待つ
        const response = await responsePromise;
        if (response) {
          console.log(`\n📡 APIレスポンス:`)
          console.log(`  URL: ${response.url()}`);
          console.log(`  Status: ${response.status()}`);
          
          if (response.status() !== 200 && response.status() !== 201) {
            const responseBody = await response.text();
            console.log(`  エラー内容: ${responseBody}`);
          }
        }
        
        // 結果を待つ
        await newPage.waitForTimeout(5000);
        
        // 現在のURLとページ状態を確認
        const finalUrl = newPage.url();
        console.log(`\n📊 最終状態:`);
        console.log(`  URL: ${finalUrl}`);
        
        // 成功/エラーメッセージを探す
        const successMessages = await newPage.locator('.toast-success, .success-message, .alert-success').allTextContents();
        const errorMessages = await newPage.locator('.toast-error, .error-message, .alert-error, .text-red-600').allTextContents();
        
        if (successMessages.length > 0) {
          console.log('  ✅ 成功メッセージ:', successMessages);
        }
        
        if (errorMessages.length > 0) {
          console.log('  ❌ エラーメッセージ:', errorMessages);
        }
        
        // フォームの検証エラーを確認
        const validationErrors = await newPage.locator('.field-error, .invalid-feedback, [aria-invalid="true"]').allTextContents();
        if (validationErrors.length > 0) {
          console.log('  ⚠️ 検証エラー:', validationErrors);
        }
        
        // 最終スクリーンショット
        await newPage.screenshot({ path: 'debug-after-save.png', fullPage: true });
        
      } else {
        console.error('❌ 保存ボタンが見つかりません');
        
        // ページ全体のHTMLを出力（デバッグ用）
        const bodyHtml = await newPage.locator('body').innerHTML();
        console.log('\n📄 ページのHTML（最初の500文字）:');
        console.log(bodyHtml.substring(0, 500));
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      await newPage.screenshot({ path: 'debug-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});