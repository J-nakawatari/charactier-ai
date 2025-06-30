import { test, expect } from '@playwright/test';

test.describe('キャラクター作�E - 最小限チE��チE, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('最小限の惁E��でキャラクターを作�E', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 最小限のキャラクター作�EチE��ト開姁E);
    
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
      
      // 新しいペ�Eジでキャラクター作�Eペ�Eジへ直接移勁E
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      console.log('📝 フォーム入力開姁E);
      
      // スクリーンショチE���E��E力前�E�E
      await newPage.screenshot({ path: 'minimal-before-input.png', fullPage: true });
      
      // 最初に見つかったテキスト�E力に名前を�E劁E
      const timestamp = Date.now();
      const firstTextInput = newPage.locator('input[type="text"]').first();
      
      if (await firstTextInput.isVisible()) {
        await firstTextInput.fill(`最小テスチE${timestamp}`);
        console.log('✁E名前入力完亁E);
      } else {
        throw new Error('チE��スト�E力フィールドが見つかりません');
      }
      
      // 最初に見つかったテキストエリアに説明を入劁E
      const firstTextarea = newPage.locator('textarea').first();
      if (await firstTextarea.isVisible()) {
        await firstTextarea.fill('最小限のチE��ト説昁E);
        console.log('✁E説明�E力完亁E);
      }
      
      // 最初に見つかったチェチE��ボックスをクリチE��
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click();
        console.log('✁EチェチE��ボックス選択完亁E);
      }
      
      // スクリーンショチE���E��E力後！E
      await newPage.screenshot({ path: 'minimal-after-input.png', fullPage: true });
      
      // 保存�Eタンを探してクリチE��
      const saveButton = newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').first();
      
      if (await saveButton.isVisible()) {
        console.log('💾 保存�EタンをクリチE��');
        await saveButton.click();
        
        // 結果を征E��
        await newPage.waitForTimeout(5000);
        
        // 成功判宁E
        const currentUrl = newPage.url();
        const hasError = await newPage.locator('.error, .text-red-600').isVisible().catch(() => false);
        
        console.log(`📍 現在のURL: ${currentUrl}`);
        console.log(`❁Eエラー表示: ${hasError}`);
        
        if (hasError) {
          const errorText = await newPage.locator('.error, .text-red-600').textContent();
          console.log(`エラー冁E��: ${errorText}`);
          await newPage.screenshot({ path: 'minimal-error.png', fullPage: true });
        }
        
        // 成功の場合�EURLが変わるか、�E功メチE��ージが表示されめE
        const isSuccess = !currentUrl.includes('/new') || 
                         await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false);
        
        expect(isSuccess).toBeTruthy();
      } else {
        throw new Error('保存�Eタンが見つかりません');
      }
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      if (newPage && !newPage.isClosed()) {
        await newPage.screenshot({ path: 'minimal-exception.png', fullPage: true });
      }
      throw error;
    } finally {
      await context.close();
    }
  });
});
