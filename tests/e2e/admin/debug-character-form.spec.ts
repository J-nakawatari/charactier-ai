import { test, expect } from '@playwright/test';

test.describe('キャラクター作成フォームのデバッグ', () => {
  test('フォームの読み込み状態を詳細に確認', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 デバッグテスト開始');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
    } catch (e) {
      console.log('❌ ログイン失敗');
      await page.screenshot({ path: 'login-failed-debug.png' });
      await context.close();
      return;
    }
    
    // Step 2: 十分な待機
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 新しいページで開く
    const newPage = await context.newPage();
    console.log('\n📄 キャラクター作成ページを開く...');
    
    // ネットワークログを有効化
    newPage.on('response', response => {
      if (response.url().includes('/admin/characters/new')) {
        console.log(`📡 Response: ${response.status()} ${response.url()}`);
      }
    });
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Step 4: ページの状態を詳しく確認
    console.log('\n🔍 ページ状態の確認:');
    console.log('- URL:', newPage.url());
    console.log('- タイトル:', await newPage.title());
    
    // HTMLの内容を確認
    const bodyText = await newPage.locator('body').innerText();
    console.log('- ページの最初の100文字:', bodyText.substring(0, 100));
    
    // エラーメッセージを探す
    const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('⚠️ エラーメッセージ:', errorMessages);
    }
    
    // Step 5: フォーム要素を段階的に確認
    console.log('\n📋 フォーム要素の詳細確認:');
    
    // 基本的な要素の存在確認
    const formExists = await newPage.locator('form').count() > 0;
    console.log(`- <form>タグ: ${formExists ? '存在する' : '存在しない'}`);
    
    // より広範なセレクターで確認
    const inputElements = {
      'すべての<input>': await newPage.locator('input').count(),
      'テキスト型<input>': await newPage.locator('input[type="text"]').count(),
      'すべての<select>': await newPage.locator('select').count(),
      'すべての<textarea>': await newPage.locator('textarea').count(),
      'すべての<button>': await newPage.locator('button').count(),
      'type=submitのボタン': await newPage.locator('button[type="submit"]').count()
    };
    
    for (const [name, count] of Object.entries(inputElements)) {
      console.log(`- ${name}: ${count}個`);
    }
    
    // Step 6: 具体的なフィールドを名前で探す
    console.log('\n🔍 具体的なフィールドの検索:');
    
    const fieldSelectors = [
      { name: '名前フィールド', selectors: ['input[name*="name"]', 'input[placeholder*="名前"]', 'input[placeholder*="Name"]'] },
      { name: '説明フィールド', selectors: ['textarea[name*="description"]', 'textarea[placeholder*="説明"]'] },
      { name: '性格選択', selectors: ['select[name*="personality"]', 'select[name*="preset"]'] },
      { name: '保存ボタン', selectors: ['button:has-text("保存")', 'button:has-text("作成")', 'button:has-text("Save")'] }
    ];
    
    for (const field of fieldSelectors) {
      let found = false;
      for (const selector of field.selectors) {
        const count = await newPage.locator(selector).count();
        if (count > 0) {
          console.log(`✅ ${field.name}: "${selector}" で ${count}個見つかりました`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`❌ ${field.name}: 見つかりません`);
      }
    }
    
    // Step 7: ページ全体の構造を確認
    console.log('\n📐 ページ構造の確認:');
    const mainContent = await newPage.locator('main, .main-content, #content, .container').count();
    console.log(`- メインコンテンツエリア: ${mainContent}個`);
    
    const sidebar = await newPage.locator('aside, .sidebar, nav').count();
    console.log(`- サイドバー/ナビゲーション: ${sidebar}個`);
    
    // Step 8: JavaScriptエラーを確認
    const jsErrors: string[] = [];
    newPage.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await newPage.waitForTimeout(2000);
    if (jsErrors.length > 0) {
      console.log('\n❌ JavaScriptエラー:');
      jsErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    // スクリーンショット
    await newPage.screenshot({ path: 'debug-character-form.png', fullPage: true });
    console.log('\n📸 デバッグ用スクリーンショットを debug-character-form.png に保存');
    
    // HTMLを保存
    const html = await newPage.content();
    require('fs').writeFileSync('debug-character-form.html', html);
    console.log('📄 HTMLを debug-character-form.html に保存');
    
    await context.close();
  });
});