import { test, expect } from '@playwright/test';

test.describe('キャラクター作成 - 動作確認版', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('性格プリセット正しく選択する版', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 テスト開始');
    
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
      
      console.log('📍 現在のURL:', newPage.url());
      
      // フォーム入力
      console.log('\n📝 フォーム入力開始...');
      const timestamp = Date.now();
      
      // 名前入力
      const textInputs = await newPage.locator('input[type="text"]').all();
      if (textInputs.length >= 2) {
        await textInputs[0].fill(`動作確認キャラ_${timestamp}`);
        await textInputs[1].fill(`Working Char ${timestamp}`);
        console.log('✅ 名前入力完了');
      }
      
      // 説明入力
      const textareas = await newPage.locator('textarea').all();
      if (textareas.length > 0) {
        await textareas[0].fill('動作確認用のテストキャラクターです。');
        console.log('✅ 説明入力完了');
      }
      
      // セレクトボックスの詳細確認
      const selects = await newPage.locator('select').all();
      console.log(`\n📋 セレクトボックス数: ${selects.length}`);
      
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const options = await select.locator('option').all();
        console.log(`\nセレクト[${i}] name="${name}"`);
        
        // 各オプションの詳細
        for (let j = 0; j < Math.min(options.length, 5); j++) {
          const value = await options[j].getAttribute('value');
          const text = await options[j].textContent();
          console.log(`  オプション[${j}]: value="${value}", text="${text}"`);
        }
        
        // 性格プリセットの選択（nameまたはオプションの内容で判断）
        if (i === 1 || name === 'personalityPreset' || (options.length > 5 && await options[1].textContent()?.then(t => t?.includes('フレンドリー')))) {
          console.log('⭐ これが性格プリセットセレクトです！');
          
          // 空でない最初の値を選択
          for (let j = 1; j < options.length; j++) {
            const value = await options[j].getAttribute('value');
            if (value && value !== '') {
              await select.selectOption(value);
              console.log(`✅ 性格プリセット選択: ${value}`);
              break;
            }
          }
        } else if (i === 0) {
          // 性別の選択
          const value = await options[1].getAttribute('value');
          if (value) {
            await select.selectOption(value);
            console.log(`✅ 性別選択: ${value}`);
          }
        }
      }
      
      // 性格タグ選択
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('✅ 性格タグ選択完了');
      }
      
      // スクリーンショット
      await newPage.screenshot({ path: 'working-form.png', fullPage: true });
      console.log('\n📸 フォームのスクリーンショット保存');
      
      // 保存ボタンクリック
      const saveButton = newPage.locator('button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        console.log('\n💾 保存処理...');
        
        // APIレスポンス監視
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        await saveButton.click();
        console.log('✅ 保存ボタンクリック');
        
        const response = await responsePromise;
        if (response) {
          console.log(`\n📡 APIレスポンス: ${response.status()}`);
          if (response.status() !== 200 && response.status() !== 201) {
            const body = await response.text();
            console.log('エラー内容:', body);
          }
        }
        
        // 結果を待つ
        await newPage.waitForTimeout(5000);
        
        // 成功判定
        const finalUrl = newPage.url();
        const hasSuccess = 
          !finalUrl.includes('/new') || 
          await newPage.locator('.toast-success').isVisible().catch(() => false);
        
        console.log('\n📊 最終結果:');
        console.log(`- URL: ${finalUrl}`);
        console.log(`- 成功: ${hasSuccess ? '✅' : '❌'}`);
        
        if (!hasSuccess) {
          const errors = await newPage.locator('.error, .text-red-600').allTextContents();
          console.log('- エラー:', errors);
        }
        
        expect(hasSuccess).toBeTruthy();
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});