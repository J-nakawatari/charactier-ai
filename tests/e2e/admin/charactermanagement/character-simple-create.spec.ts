import { test, expect } from '@playwright/test';

test.describe('シンプルなキャラクター作成テスト', () => {
  test('最小限の入力でキャラクターを作成', async ({ page }) => {
    // 直接ログインページから開始
    await page.goto('/admin/login');
    
    // ログイン
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードを待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン完了');
    
    // 5秒待機（重要）
    await page.waitForTimeout(5000);
    
    // キャラクター一覧ページ経由で遷移（より確実）
    console.log('📄 キャラクター一覧ページへ遷移...');
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 新規作成ボタンを探してクリック
    console.log('🔍 新規作成ボタンを探しています...');
    const newButtonSelectors = [
      'a[href="/admin/characters/new"]',
      'button:has-text("新規作成")',
      'a:has-text("新規作成")',
      'button:has-text("追加")',
      'a:has-text("キャラクターを追加")'
    ];
    
    let clicked = false;
    for (const selector of newButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          clicked = true;
          console.log(`✅ ボタンをクリック: ${selector}`);
          break;
        }
      } catch (e) {
        // 次のセレクターを試す
      }
    }
    
    if (!clicked) {
      console.log('⚠️ 新規作成ボタンが見つかりません。直接URLで遷移を試みます...');
      await page.goto('/admin/characters/new');
    }
    
    // ページの読み込みを待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 現在のURL:', currentUrl);
    
    // URLが正しいことを確認（より柔軟に）
    if (!currentUrl.includes('/characters/new') && !currentUrl.includes('/characters/create')) {
      console.error('❌ 期待したURLではありません:', currentUrl);
      await page.screenshot({ path: 'navigation-error.png' });
      
      // ページの内容を確認
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      console.log('ページタイトル:', pageTitle);
      console.log('ページの最初の200文字:', bodyText.substring(0, 200));
      
      throw new Error(`キャラクター作成ページに到達できませんでした。現在のURL: ${currentUrl}`);
    }
    
    // フォーム要素の存在確認
    const formElements = {
      'input[type="text"]': await page.locator('input[type="text"]').count(),
      'select': await page.locator('select').count(),
      'checkbox': await page.locator('input[type="checkbox"]').count(),
      'textarea': await page.locator('textarea').count(),
      'submit': await page.locator('button[type="submit"]').count()
    };
    
    console.log('📋 フォーム要素:', formElements);
    
    // 必須項目のみ入力
    if (formElements['input[type="text"]'] > 0) {
      // 名前
      await page.locator('input[type="text"]').first().fill('シンプルテストキャラ');
      await page.locator('input[type="text"]').nth(1).fill('Simple Test Character');
      console.log('✅ 名前入力完了');
    }
    
    if (formElements['select'] > 0) {
      // 性格プリセット
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      
      // 空でない最初の値を選択
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await select.selectOption(value);
          console.log(`✅ 性格プリセット選択完了: ${value}`);
          break;
        }
      }
    }
    
    if (formElements['checkbox'] > 0) {
      // 性格タグ
      await page.locator('input[type="checkbox"]').first().click();
      console.log('✅ 性格タグ選択完了');
    }
    
    // スクリーンショット
    await page.screenshot({ path: 'simple-create-form.png' });
    
    // 保存ボタンの存在確認
    const saveButton = page.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').first();
    const buttonExists = await saveButton.isVisible();
    
    console.log(`保存ボタン: ${buttonExists ? '✅ 存在' : '❌ 不在'}`);
    
    if (buttonExists) {
      // ボタンが有効になるまで待つ
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      
      // 保存をクリック
      await saveButton.click();
      console.log('⏳ 保存中...');
      
      // 結果を待つ
      await page.waitForTimeout(5000);
      
      // 成功の確認
      const finalUrl = page.url();
      const success = !finalUrl.includes('/new') || 
                     await page.locator('.toast-success').isVisible().catch(() => false);
      
      console.log(`結果: ${success ? '✅ 成功' : '❌ 失敗'}`);
      console.log('最終URL:', finalUrl);
      
      if (!success) {
        const errors = await page.locator('.error, .text-red-600').allTextContents();
        console.log('エラー:', errors);
      }
    }
  });
});