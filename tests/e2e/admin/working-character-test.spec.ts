import { test, expect } from '@playwright/test';

test.describe('動作確認済みのキャラクターテスト', () => {
  test('debug-character-formと同じアプローチを使用', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 動作確認済みアプローチでテスト開始');
    
    // Step 1: ログイン（debug-character-formと同じ）
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // Step 2: 十分な待機（debug-character-formと同じ）
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 新しいページで開く（debug-character-formと同じ）
    const newPage = await context.newPage();
    console.log('\n📄 新しいページでキャラクター作成ページを開く...');
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Step 4: ページが完全に読み込まれるのを待つ
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000);
    
    console.log('✅ キャラクター作成ページに到達');
    console.log('📍 URL:', newPage.url());
    
    // Step 5: フォーム要素の確認
    const elements = {
      'テキスト入力': await newPage.locator('input[type="text"]').count(),
      'セレクトボックス': await newPage.locator('select').count(),
      'チェックボックス': await newPage.locator('input[type="checkbox"]').count(),
      'テキストエリア': await newPage.locator('textarea').count(),
      '保存ボタン': await newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').count()
    };
    
    console.log('\n📋 フォーム要素:', elements);
    
    // Step 6: 実際にフォームに入力してみる
    if (elements['テキスト入力'] > 0) {
      const nameInput = newPage.locator('input[type="text"]').first();
      await nameInput.fill('テストキャラクター_' + Date.now());
      console.log('✅ 名前を入力');
    }
    
    if (elements['セレクトボックス'] > 0) {
      const select = newPage.locator('select').first();
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
        console.log('✅ 性格プリセットを選択');
      }
    }
    
    if (elements['チェックボックス'] > 0) {
      await newPage.locator('input[type="checkbox"]').first().click();
      console.log('✅ 性格タグを選択');
    }
    
    if (elements['テキストエリア'] > 0) {
      const textarea = newPage.locator('textarea').first();
      await textarea.fill('これはE2Eテストで作成されたキャラクターです。');
      console.log('✅ 説明を入力');
    }
    
    // スクリーンショット
    await newPage.screenshot({ path: 'working-character-form.png', fullPage: true });
    console.log('\n📸 スクリーンショットを working-character-form.png に保存');
    
    // アサーション
    expect(elements['テキスト入力']).toBeGreaterThan(0);
    expect(elements['セレクトボックス']).toBeGreaterThan(0);
    expect(elements['チェックボックス']).toBeGreaterThan(0);
    
    console.log('\n✅ すべてのテストが成功しました！');
    
    await context.close();
  });
  
  test('キャラクター一覧ページの確認', async ({ browser }) => {
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    
    // ログイン
    await loginPage.goto('/admin/login');
    await loginPage.fill('input[type="email"]', 'admin@example.com');
    await loginPage.fill('input[type="password"]', 'admin123');
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await loginPage.waitForTimeout(3000);
    await loginPage.close();
    
    // 新しいページでキャラクター一覧を開く
    const listPage = await context.newPage();
    await listPage.goto('/admin/characters', { waitUntil: 'networkidle' });
    await listPage.waitForTimeout(2000);
    
    console.log('📍 キャラクター一覧ページ:', listPage.url());
    
    // 新規作成ボタンを探す
    const newButton = listPage.locator('a[href="/admin/characters/new"], button:has-text("新規作成")');
    const buttonExists = await newButton.count() > 0;
    console.log(`新規作成ボタン: ${buttonExists ? '✅ 存在する' : '❌ 存在しない'}`);
    
    if (buttonExists) {
      await newButton.first().click();
      await listPage.waitForURL('**/admin/characters/new', { timeout: 10000 });
      console.log('✅ 新規作成ボタンから遷移成功');
    }
    
    await context.close();
  });
});