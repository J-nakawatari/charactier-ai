import { test, expect } from '@playwright/test';

test.describe('キャラクター作成 - 最小限テスト', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('必須3項目のみで作成を試みる', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 最小限テスト開始');
    
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
      
      console.log('\n📝 必須3項目のみ入力:');
      const timestamp = Date.now();
      
      // 1. キャラクター名（日本語）- 最初のテキスト入力
      const nameJaInput = newPage.locator('input[type="text"]').first();
      await nameJaInput.fill(`最小限テスト_${timestamp}`);
      console.log('✅ 1. キャラクター名（日本語）入力');
      
      // 英語名も入力してみる（必須でないかもしれないが）
      const nameEnInput = newPage.locator('input[type="text"]').nth(1);
      await nameEnInput.fill(`Minimal Test ${timestamp}`);
      console.log('✅ 英語名も入力（念のため）');
      
      // 2. 性格プリセット - 2番目のセレクトボックス
      const selects = await newPage.locator('select').all();
      if (selects.length > 1) {
        // 最初に性別を選択（必須でないかもしれないが）
        await selects[0].selectOption({ index: 1 });
        console.log('✅ 性別選択（念のため）');
        
        // 性格プリセットを選択
        const personalityOptions = await selects[1].locator('option').all();
        for (let i = 1; i < personalityOptions.length; i++) {
          const value = await personalityOptions[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            const text = await personalityOptions[i].textContent();
            console.log(`✅ 2. 性格プリセット選択: ${value} (${text})`);
            break;
          }
        }
      }
      
      // 3. 性格タグ - 最低1つチェック
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      console.log('✅ 3. 性格タグ選択（1つ）');
      
      // スクリーンショット
      await newPage.screenshot({ path: 'minimal-test-before-save.png', fullPage: true });
      
      // 保存を試みる
      console.log('\n💾 保存を試みる...');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // APIレスポンス監視
      const responsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      await saveButton.click();
      console.log('✅ 保存ボタンクリック');
      
      const response = await responsePromise;
      if (response) {
        const status = response.status();
        console.log(`\n📡 APIレスポンス: ${status}`);
        
        if (status !== 200 && status !== 201) {
          const responseBody = await response.json().catch(() => response.text());
          console.log('エラー詳細:');
          console.log(JSON.stringify(responseBody, null, 2));
        }
      }
      
      // 結果を待つ
      await newPage.waitForTimeout(5000);
      
      // エラーメッセージを収集
      const errorMessages = await newPage.locator('.error, .text-red-600, .toast-error').allTextContents();
      if (errorMessages.length > 0) {
        console.log('\n❌ エラーメッセージ:', errorMessages);
      }
      
      // 成功判定
      const finalUrl = newPage.url();
      const isSuccess = 
        !finalUrl.includes('/new') || 
        await newPage.locator('.toast-success').isVisible().catch(() => false) ||
        finalUrl.includes('/admin/characters/');
      
      console.log('\n📊 結果:');
      console.log(`- URL: ${finalUrl}`);
      console.log(`- 成功: ${isSuccess ? '✅' : '❌'}`);
      
      // 失敗時のスクリーンショット
      if (!isSuccess) {
        await newPage.screenshot({ path: 'minimal-test-after-save.png', fullPage: true });
        
        // 全てのテキストエリアの内容も確認
        const textareaCount = await newPage.locator('textarea').count();
        console.log(`\n📝 テキストエリア数: ${textareaCount}`);
        
        // もしかしたら説明やプロンプトが必須かも？
        if (textareaCount > 0) {
          console.log('説明フィールドを追加で入力してみる...');
          
          // 日本語説明
          const descJa = newPage.locator('textarea').first();
          await descJa.fill('最小限のテストキャラクターです。');
          
          // 英語説明
          if (textareaCount > 1) {
            const descEn = newPage.locator('textarea').nth(1);
            await descEn.fill('This is a minimal test character.');
          }
          
          // 再度保存を試みる
          console.log('\n💾 説明追加後、再度保存...');
          await saveButton.click();
          await newPage.waitForTimeout(5000);
          
          const retryUrl = newPage.url();
          const retrySuccess = !retryUrl.includes('/new');
          console.log(`- 再試行結果: ${retrySuccess ? '✅' : '❌'}`);
          
          if (!retrySuccess) {
            const retryErrors = await newPage.locator('.error, .text-red-600').allTextContents();
            console.log('- 再試行エラー:', retryErrors);
          }
        }
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      await newPage.screenshot({ path: 'minimal-test-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});