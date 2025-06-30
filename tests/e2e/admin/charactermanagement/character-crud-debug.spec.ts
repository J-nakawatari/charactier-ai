import { test, expect } from '@playwright/test';

test.describe('キャラクター作�EチE��チE��チE��チE, () => {
  test.setTimeout(90000); // 90秒�EタイムアウチE
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター作�E - 詳細チE��チE��牁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 チE��チE��チE��ト開姁E);
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいペ�Eジでキャラクター作�Eペ�Eジへ直接遷移
      const newPage = await context.newPage();
      console.log('\n📄 キャラクター作�Eペ�Eジへ直接遷移...');
      
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      const currentUrl = newPage.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      
      // ペ�Eジの冁E��を確誁E
      const pageTitle = await newPage.title();
      console.log(`📄 ペ�Eジタイトル: ${pageTitle}`);
      
      // フォーム要素の詳細確誁E
      console.log('\n🔍 フォーム要素の詳細確誁E');
      
      // 全ての入力要素を確誁E
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
      
      // 全てのselect要素を確誁E
      const allSelects = await newPage.locator('select').all();
      console.log(`\nセレクト要素総数: ${allSelects.length}`);
      
      for (let i = 0; i < allSelects.length; i++) {
        const select = allSelects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const optionCount = await select.locator('option').count();
        console.log(`  [${i}] name="${name}" required="${required}" options=${optionCount}`);
      }
      
      // 全てのtextarea要素を確誁E
      const allTextareas = await newPage.locator('textarea').all();
      console.log(`\nチE��ストエリア総数: ${allTextareas.length}`);
      
      for (let i = 0; i < allTextareas.length; i++) {
        const textarea = allTextareas[i];
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        const required = await textarea.getAttribute('required');
        console.log(`  [${i}] name="${name}" placeholder="${placeholder}" required="${required}"`);
      }
      
      // フォーム入力（最小限の忁E��頁E��のみ�E�E
      console.log('\n📝 最小限の忁E��頁E��を�E劁E..');
      const timestamp = Date.now();
      
      // 名前フィールドを特定して入劁E
      const nameFields = await newPage.locator('input[type="text"]').all();
      if (nameFields.length >= 2) {
        console.log('  名前フィールドに入劁E..');
        await nameFields[0].fill(`チE��チE��キャラ_${timestamp}`);
        await nameFields[1].fill(`Debug Char ${timestamp}`);
      }
      
      // 性格プリセチE��を選択（忁E���E可能性�E�E
      const personalitySelect = await newPage.locator('select').first();
      if (await personalitySelect.isVisible()) {
        console.log('  性格プリセチE��を選抁E..');
        const options = await personalitySelect.locator('option').all();
        console.log(`  オプション数: ${options.length}`);
        
        for (let i = 0; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          const text = await options[i].textContent();
          console.log(`    [${i}] value="${value}", text="${text}"`);
        }
        
        // 空でなぁE��初�E値を選抁E
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            console.log(`  選抁E ${value}`);
            await personalitySelect.selectOption(value);
            break;
          }
        }
      }
      
      // チェチE��ボックスめEつ選択（忁E���E可能性�E�E
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        console.log('  チェチE��ボックスを選抁E..');
        await checkboxes[0].click();
      }
      
      // 保存前のスクリーンショチE��
      await newPage.screenshot({ path: 'debug-before-save.png', fullPage: true });
      
      // 保存�Eタンを探ぁE
      console.log('\n🔍 保存�Eタンを探索...');
      const saveButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("保孁E)',
        'button:has-text("作�E")',
        'button:has-text("登録")',
        'button:has-text("追加")'
      ];
      
      let saveButton = null;
      for (const selector of saveButtonSelectors) {
        const button = newPage.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          saveButton = button;
          console.log(`✁E保存�Eタン発要E ${selector}`);
          const buttonText = await button.textContent();
          console.log(`  ボタンチE��スチE "${buttonText}"`);
          break;
        }
      }
      
      if (saveButton) {
        // ボタンの状態を確誁E
        const isEnabled = await saveButton.isEnabled();
        console.log(`  ボタン有効: ${isEnabled}`);
        
        if (!isEnabled) {
          console.log('⚠�E�Eボタンが無効です。忁E��頁E��を確認しまぁE..');
          
          // エラーメチE��ージを探ぁE
          const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
          if (errorMessages.length > 0) {
            console.log('エラーメチE��ージ:', errorMessages);
          }
        }
        
        // ネットワークリクエストを監要E
        console.log('\n📡 ネットワーク監視を開姁E..');
        
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        // 保存�EタンをクリチE��
        await saveButton.click();
        console.log('✁E保存�EタンクリチE��');
        
        // レスポンスを征E��
        const response = await responsePromise;
        if (response) {
          console.log(`\n📡 APIレスポンス:`)
          console.log(`  URL: ${response.url()}`);
          console.log(`  Status: ${response.status()}`);
          
          if (response.status() !== 200 && response.status() !== 201) {
            const responseBody = await response.text();
            console.log(`  エラー冁E��: ${responseBody}`);
          }
        }
        
        // 結果を征E��
        await newPage.waitForTimeout(5000);
        
        // 現在のURLとペ�Eジ状態を確誁E
        const finalUrl = newPage.url();
        console.log(`\n📊 最終状慁E`);
        console.log(`  URL: ${finalUrl}`);
        
        // 成功/エラーメチE��ージを探ぁE
        const successMessages = await newPage.locator('.toast-success, .success-message, .alert-success').allTextContents();
        const errorMessages = await newPage.locator('.toast-error, .error-message, .alert-error, .text-red-600').allTextContents();
        
        if (successMessages.length > 0) {
          console.log('  ✁E成功メチE��ージ:', successMessages);
        }
        
        if (errorMessages.length > 0) {
          console.log('  ❁EエラーメチE��ージ:', errorMessages);
        }
        
        // フォームの検証エラーを確誁E
        const validationErrors = await newPage.locator('.field-error, .invalid-feedback, [aria-invalid="true"]').allTextContents();
        if (validationErrors.length > 0) {
          console.log('  ⚠�E�E検証エラー:', validationErrors);
        }
        
        // 最終スクリーンショチE��
        await newPage.screenshot({ path: 'debug-after-save.png', fullPage: true });
        
      } else {
        console.error('❁E保存�Eタンが見つかりません');
        
        // ペ�Eジ全体�EHTMLを�E力（デバッグ用�E�E
        const bodyHtml = await newPage.locator('body').innerHTML();
        console.log('\n📄 ペ�EジのHTML�E�最初�E500斁E��！E');
        console.log(bodyHtml.substring(0, 500));
      }
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      await newPage.screenshot({ path: 'debug-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
