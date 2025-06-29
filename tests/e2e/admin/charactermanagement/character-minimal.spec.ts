import { test, expect } from '@playwright/test';

test.describe('キャラクター作成 - 最小限テスト', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('最小限の情報でキャラクターを作成', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 最小限のキャラクター作成テスト開始');
    
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
      
      // 新しいページでキャラクター作成ページへ直接移動
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      console.log('📝 フォーム入力開始');
      
      // スクリーンショット（入力前）
      await newPage.screenshot({ path: 'minimal-before-input.png', fullPage: true });
      
      // 最初に見つかったテキスト入力に名前を入力
      const timestamp = Date.now();
      const firstTextInput = newPage.locator('input[type="text"]').first();
      
      if (await firstTextInput.isVisible()) {
        await firstTextInput.fill(`最小テスト_${timestamp}`);
        console.log('✅ 名前入力完了');
      } else {
        throw new Error('テキスト入力フィールドが見つかりません');
      }
      
      // 最初に見つかったテキストエリアに説明を入力
      const firstTextarea = newPage.locator('textarea').first();
      if (await firstTextarea.isVisible()) {
        await firstTextarea.fill('最小限のテスト説明');
        console.log('✅ 説明入力完了');
      }
      
      // 最初に見つかったチェックボックスをクリック
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
        console.log('✅ チェックボックス選択完了');
      }
      
      // スクリーンショット（入力後）
      await newPage.screenshot({ path: 'minimal-after-input.png', fullPage: true });
      
      // 保存ボタンを探してクリック
      const saveButton = newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').first();
      
      if (await saveButton.isVisible()) {
        console.log('💾 保存ボタンをクリック');
        await saveButton.click();
        
        // 結果を待つ
        await newPage.waitForTimeout(5000);
        
        // 成功判定
        const currentUrl = newPage.url();
        const hasError = await newPage.locator('.error, .text-red-600').isVisible().catch(() => false);
        
        console.log(`📍 現在のURL: ${currentUrl}`);
        console.log(`❌ エラー表示: ${hasError}`);
        
        if (hasError) {
          const errorText = await newPage.locator('.error, .text-red-600').textContent();
          console.log(`エラー内容: ${errorText}`);
          await newPage.screenshot({ path: 'minimal-error.png', fullPage: true });
        }
        
        // 成功の場合はURLが変わるか、成功メッセージが表示される
        const isSuccess = !currentUrl.includes('/new') || 
                         await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false);
        
        expect(isSuccess).toBeTruthy();
      } else {
        throw new Error('保存ボタンが見つかりません');
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      if (newPage && !newPage.isClosed()) {
        await newPage.screenshot({ path: 'minimal-exception.png', fullPage: true });
      }
      throw error;
    } finally {
      await context.close();
    }
  });
});