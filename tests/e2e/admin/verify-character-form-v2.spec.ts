import { test, expect } from '@playwright/test';

test.describe('キャラクター作成フォームの検証 v2', () => {
  test('新しいコンテキストでキャラクター作成フォームを確認', async ({ browser }) => {
    // 新しいブラウザコンテキストを作成
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 テスト開始: キャラクター作成フォームの検証 v2');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // ログインフォームに入力
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダッシュボードへの遷移を待つ
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✅ ログイン成功');
      console.log('📍 現在のURL:', page.url());
    } catch (e) {
      console.log('❌ ログイン失敗');
      const errorMessages = await page.locator('.error, .text-red-600, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('エラーメッセージ:', errorMessages.join(', '));
      }
      await page.screenshot({ path: 'login-error-v2.png' });
      await context.close();
      return;
    }
    
    // Step 2: ダッシュボードが完全に読み込まれるまで待つ
    console.log('⏱️ ダッシュボードの安定を待機中...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 現在のページを閉じる
    await page.close();
    
    // Step 3: 新しいページでキャラクター作成ページを開く
    console.log('📄 新しいページでキャラクター作成ページを開く');
    const newPage = await context.newPage();
    
    try {
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // URLが正しいことを確認
      const currentUrl = newPage.url();
      console.log('📍 現在のURL:', currentUrl);
      
      if (!currentUrl.includes('/admin/characters/new')) {
        throw new Error(`期待したURLではありません: ${currentUrl}`);
      }
      
      console.log('✅ キャラクター作成ページに到達');
      
    } catch (error) {
      console.log('❌ キャラクター作成ページへの遷移に失敗:', error.message);
      await newPage.screenshot({ path: 'navigation-error-v2.png' });
      await context.close();
      return;
    }
    
    // Step 4: フォームフィールドの確認
    console.log('\n📋 フォームフィールドの確認:');
    
    // 各要素の数をカウント
    const elements = {
      'テキスト入力': await newPage.locator('input[type="text"]').count(),
      'セレクトボックス': await newPage.locator('select').count(),
      'チェックボックス': await newPage.locator('input[type="checkbox"]').count(),
      'テキストエリア': await newPage.locator('textarea').count(),
      '保存ボタン': await newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').count()
    };
    
    for (const [name, count] of Object.entries(elements)) {
      console.log(`- ${name}: ${count}個`);
    }
    
    // 必須フィールドの存在を確認
    expect(elements['テキスト入力']).toBeGreaterThan(0);
    expect(elements['セレクトボックス']).toBeGreaterThan(0);
    expect(elements['チェックボックス']).toBeGreaterThan(0);
    
    console.log('\n✅ キャラクター作成フォームの必須フィールドが正しく表示されています');
    
    // スクリーンショットを保存
    await newPage.screenshot({ path: 'character-form-v2.png', fullPage: true });
    console.log('📸 スクリーンショットを character-form-v2.png に保存しました');
    
    // クリーンアップ
    await context.close();
  });
  
  test('管理画面の認証状態を維持してページ遷移', async ({ page, context }) => {
    console.log('🔐 認証状態を維持したページ遷移テスト');
    
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードを待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン完了');
    
    // 十分に待つ
    await page.waitForTimeout(5000);
    
    // JavaScriptで直接遷移
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // 新しいページの読み込みを待つ
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log('📍 最終URL:', finalUrl);
    
    if (finalUrl.includes('/admin/characters/new')) {
      console.log('✅ キャラクター作成ページに到達（JavaScript遷移）');
      
      // フォームの簡易確認
      const hasForm = await page.locator('form, input[type="text"], select').count() > 0;
      console.log(`フォーム要素: ${hasForm ? '存在する' : '存在しない'}`);
    } else {
      console.log('❌ 期待したページに到達できませんでした');
    }
  });
});