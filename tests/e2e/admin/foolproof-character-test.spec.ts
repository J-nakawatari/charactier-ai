import { test, expect } from '@playwright/test';

test.describe('確実版：キャラクター作成フォームテスト', () => {
  test('セッションCookieを使用してキャラクター作成ページに直接アクセス', async ({ browser }) => {
    console.log('🚀 確実版テスト開始');
    
    // Step 1: 新しいコンテキストでログイン
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    
    await loginPage.goto('/admin/login');
    await loginPage.fill('input[type="email"]', 'admin@example.com');
    await loginPage.fill('input[type="password"]', 'admin123');
    await loginPage.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await loginPage.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // Cookieを取得
    const cookies = await context.cookies();
    console.log(`🍪 ${cookies.length}個のCookieを取得`);
    
    // ログインページを閉じる
    await loginPage.close();
    
    // Step 2: 十分な待機時間
    console.log('⏱️ 5秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: 同じコンテキストで新しいページを開く
    const characterPage = await context.newPage();
    
    // 直接キャラクター作成ページにアクセス
    await characterPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ キャラクター作成ページに到達');
    console.log('📍 URL:', characterPage.url());
    
    // Step 4: ページが正しく読み込まれたか確認
    const isCharacterNewPage = characterPage.url().includes('/admin/characters/new');
    if (!isCharacterNewPage) {
      console.log('❌ 期待したURLではありません:', characterPage.url());
      await characterPage.screenshot({ path: 'unexpected-page.png' });
      throw new Error('キャラクター作成ページに到達できませんでした');
    }
    
    // Step 5: フォームフィールドの検証
    console.log('\n📋 フォームフィールドの検証:');
    
    // 各フィールドの存在を確認
    const fields = {
      'テキスト入力': await characterPage.locator('input[type="text"]').count(),
      'セレクトボックス': await characterPage.locator('select').count(),
      'チェックボックス': await characterPage.locator('input[type="checkbox"]').count(),
      'テキストエリア': await characterPage.locator('textarea').count(),
      '保存ボタン': await characterPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').count()
    };
    
    for (const [name, count] of Object.entries(fields)) {
      console.log(`- ${name}: ${count}個`);
    }
    
    // Step 6: 基本的な入力テスト
    if (fields['テキスト入力'] > 0) {
      await characterPage.locator('input[type="text"]').first().fill('テストキャラクター名');
      console.log('✅ キャラクター名を入力');
    }
    
    if (fields['セレクトボックス'] > 0) {
      const select = characterPage.locator('select').first();
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
        console.log('✅ 性格プリセットを選択');
      }
    }
    
    if (fields['チェックボックス'] > 0) {
      await characterPage.locator('input[type="checkbox"]').first().click();
      console.log('✅ 性格タグを選択');
    }
    
    // スクリーンショット
    await characterPage.screenshot({ path: 'foolproof-test-result.png', fullPage: true });
    console.log('\n📸 スクリーンショットを foolproof-test-result.png に保存');
    
    // アサーション
    expect(fields['テキスト入力']).toBeGreaterThan(0);
    expect(fields['セレクトボックス']).toBeGreaterThan(0);
    expect(fields['チェックボックス']).toBeGreaterThan(0);
    
    // クリーンアップ
    await context.close();
    console.log('\n✅ テスト完了');
  });
  
  test('管理画面の基本的な動作確認', async ({ page }) => {
    console.log('🔍 管理画面の基本動作を確認');
    
    // ログインページの確認
    await page.goto('/admin/login');
    const hasEmailInput = await page.locator('input[type="email"]').isVisible();
    const hasPasswordInput = await page.locator('input[type="password"]').isVisible();
    const hasSubmitButton = await page.locator('button[type="submit"]').isVisible();
    
    console.log('ログインフォーム要素:');
    console.log(`- Email入力: ${hasEmailInput ? '✅' : '❌'}`);
    console.log(`- Password入力: ${hasPasswordInput ? '✅' : '❌'}`);
    console.log(`- 送信ボタン: ${hasSubmitButton ? '✅' : '❌'}`);
    
    expect(hasEmailInput).toBeTruthy();
    expect(hasPasswordInput).toBeTruthy();
    expect(hasSubmitButton).toBeTruthy();
  });
});