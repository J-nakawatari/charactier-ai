import { test, expect } from '@playwright/test';

test.describe('キャラクター作成 - 診断テスト', () => {
  test.setTimeout(90000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('フォーム構造を完全に理解する', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔬 診断テスト開始');
    
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
      
      // 新しいページでキャラクター作成ページへ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      // 1. ページのHTMLを保存（デバッグ用）
      const pageContent = await newPage.content();
      console.log('\n📄 ページ構造の診断:');
      
      // 2. 全てのラベルとそれに対応する入力要素を特定
      const formGroups = await newPage.locator('.space-y-6 > div, .form-group, .mb-4').all();
      console.log(`\nフォームグループ数: ${formGroups.length}`);
      
      // 3. 各テキストエリアの詳細を取得
      console.log('\n📝 テキストエリアの詳細:');
      const textareas = await newPage.locator('textarea').all();
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        
        // 近くのラベルを探す
        let label = '';
        try {
          // 親要素から遡ってラベルを探す
          const parentDiv = await textarea.locator('xpath=ancestor::div[contains(@class, "space-y") or contains(@class, "mb")]').first();
          const labelElement = await parentDiv.locator('label').first();
          label = await labelElement.textContent() || '';
        } catch (e) {
          // ラベルが見つからない場合
        }
        
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        
        console.log(`[${i}] ラベル: "${label.trim()}"`);
        console.log(`    name="${name}" placeholder="${placeholder}"`);
        console.log('---');
      }
      
      // 4. 実際にフォームを埋める（診断モード）
      console.log('\n🖊️ フォーム入力診断:');
      const timestamp = Date.now();
      
      // 名前
      await newPage.locator('input[type="text"]').first().fill(`診断_${timestamp}`);
      await newPage.locator('input[type="text"]').nth(1).fill(`Diagnosis ${timestamp}`);
      console.log('✅ 名前入力');
      
      // 説明を探して入力
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const placeholder = await textarea.getAttribute('placeholder') || '';
        
        if (placeholder.includes('説明') || i === 0) {
          await textarea.fill('診断用の日本語説明です。');
          console.log(`✅ textarea[${i}]に日本語説明入力`);
        } else if (placeholder.includes('description') || placeholder.includes('English') || i === 1) {
          await textarea.fill('This is a diagnosis description in English.');
          console.log(`✅ textarea[${i}]に英語説明入力`);
        } else if (placeholder.includes('メッセージ') || placeholder.includes('こんにちは') || i === 2) {
          await textarea.fill('こんにちは！診断テストキャラクターです。');
          console.log(`✅ textarea[${i}]に日本語デフォルトメッセージ入力`);
        } else if (placeholder.includes('Hello') || placeholder.includes('message') || i === 3) {
          await textarea.fill('Hello! I am a diagnosis test character.');
          console.log(`✅ textarea[${i}]に英語デフォルトメッセージ入力`);
        }
      }
      
      // セレクトボックス
      const selects = await newPage.locator('select').all();
      if (selects.length > 0) {
        await selects[0].selectOption({ index: 1 });
        console.log('✅ 性別選択');
      }
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✅ 性格プリセット選択: ${value}`);
            break;
          }
        }
      }
      
      // チェックボックス
      await newPage.locator('input[type="checkbox"]').first().click();
      console.log('✅ 性格タグ選択');
      
      // 5. スクリーンショット（入力後）
      await newPage.screenshot({ path: 'diagnosis-filled.png', fullPage: true });
      console.log('\n📸 入力後のスクリーンショット保存: diagnosis-filled.png');
      
      // 6. 保存を試みる
      console.log('\n💾 保存診断:');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // リクエストボディをキャプチャ
      let requestBody = null;
      newPage.on('request', request => {
        if (request.url().includes('/api/v1/admin/characters') && request.method() === 'POST') {
          requestBody = request.postDataJSON();
        }
      });
      
      await saveButton.click();
      console.log('✅ 保存ボタンクリック');
      
      // リクエストボディを表示
      await newPage.waitForTimeout(2000);
      if (requestBody) {
        console.log('\n📤 送信されたデータ:');
        console.log(JSON.stringify(requestBody, null, 2));
      }
      
      // エラーを待つ
      await newPage.waitForTimeout(3000);
      
      // エラーメッセージ
      const errors = await newPage.locator('.error, .text-red-600, .toast-error').allTextContents();
      if (errors.length > 0) {
        console.log('\n❌ エラーメッセージ:', errors);
      }
      
      // 成功判定
      const finalUrl = newPage.url();
      const isSuccess = !finalUrl.includes('/new');
      console.log(`\n📊 結果: ${isSuccess ? '✅ 成功' : '❌ 失敗'}`);
      console.log(`最終URL: ${finalUrl}`);
      
      // 最終スクリーンショット
      await newPage.screenshot({ path: 'diagnosis-final.png', fullPage: true });
      console.log('📸 最終スクリーンショット保存: diagnosis-final.png');
      
    } catch (error) {
      console.error('❌ 診断エラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});