import { test, expect } from '@playwright/test';

test.describe('キャラクター作�E - 最小限チE��チE, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('忁E��E頁E��のみで作�Eを試みめE, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 最小限チE��ト開姁E);
    
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
      
      // 新しいペ�Eジでキャラクター作�Eペ�Eジへ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      console.log('\n📝 忁E��E頁E��のみ入劁E');
      const timestamp = Date.now();
      
      // 1. キャラクター名（日本語！E 最初�EチE��スト�E劁E
      const nameJaInput = newPage.locator('input[type="text"]').first();
      await nameJaInput.fill(`最小限チE��チE${timestamp}`);
      console.log('✁E1. キャラクター名（日本語）�E劁E);
      
      // 英語名も�E力してみる（忁E��でなぁE��もしれなぁE���E�E
      const nameEnInput = newPage.locator('input[type="text"]').nth(1);
      await nameEnInput.fill(`Minimal Test ${timestamp}`);
      console.log('✁E英語名も�E力（念のため�E�E);
      
      // 2. 性格プリセチE�� - 2番目のセレクト�EチE��ス
      const selects = await newPage.locator('select').all();
      if (selects.length > 1) {
        // 最初に性別を選択（忁E��でなぁE��もしれなぁE���E�E
        await selects[0].selectOption({ index: 1 });
        console.log('✁E性別選択（念のため�E�E);
        
        // 性格プリセチE��を選抁E
        const personalityOptions = await selects[1].locator('option').all();
        for (let i = 1; i < personalityOptions.length; i++) {
          const value = await personalityOptions[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            const text = await personalityOptions[i].textContent();
            console.log(`✁E2. 性格プリセチE��選抁E ${value} (${text})`);
            break;
          }
        }
      }
      
      // 3. 性格タグ - 最佁EつチェチE��
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      console.log('✁E3. 性格タグ選択！Eつ�E�E);
      
      // スクリーンショチE��
      await newPage.screenshot({ path: 'minimal-test-before-save.png', fullPage: true });
      
      // 保存を試みめE
      console.log('\n💾 保存を試みめE..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // APIレスポンス監要E
      const responsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      await saveButton.click();
      console.log('✁E保存�EタンクリチE��');
      
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
      
      // 結果を征E��
      await newPage.waitForTimeout(5000);
      
      // エラーメチE��ージを収雁E
      const errorMessages = await newPage.locator('.error, .text-red-600, .toast-error').allTextContents();
      if (errorMessages.length > 0) {
        console.log('\n❁EエラーメチE��ージ:', errorMessages);
      }
      
      // 成功判宁E
      const finalUrl = newPage.url();
      const isSuccess = 
        !finalUrl.includes('/new') || 
        await newPage.locator('.toast-success').isVisible().catch(() => false) ||
        finalUrl.includes('/admin/characters/');
      
      console.log('\n📊 結果:');
      console.log(`- URL: ${finalUrl}`);
      console.log(`- 成功: ${isSuccess ? '✁E : '❁E}`);
      
      // 失敗時のスクリーンショチE��
      if (!isSuccess) {
        await newPage.screenshot({ path: 'minimal-test-after-save.png', fullPage: true });
        
        // 全てのチE��ストエリアの冁E��も確誁E
        const textareaCount = await newPage.locator('textarea').count();
        console.log(`\n📝 チE��ストエリア数: ${textareaCount}`);
        
        // もしかしたら説明やプロンプトが忁E��かも！E
        if (textareaCount > 0) {
          console.log('説明フィールドを追加で入力してみめE..');
          
          // 日本語説昁E
          const descJa = newPage.locator('textarea').first();
          await descJa.fill('最小限のチE��トキャラクターです、E);
          
          // 英語説昁E
          if (textareaCount > 1) {
            const descEn = newPage.locator('textarea').nth(1);
            await descEn.fill('This is a minimal test character.');
          }
          
          // 再度保存を試みめE
          console.log('\n💾 説明追加後、�E度保孁E..');
          await saveButton.click();
          await newPage.waitForTimeout(5000);
          
          const retryUrl = newPage.url();
          const retrySuccess = !retryUrl.includes('/new');
          console.log(`- 再試行結果: ${retrySuccess ? '✁E : '❁E}`);
          
          if (!retrySuccess) {
            const retryErrors = await newPage.locator('.error, .text-red-600').allTextContents();
            console.log('- 再試行エラー:', retryErrors);
          }
        }
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      await newPage.screenshot({ path: 'minimal-test-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
