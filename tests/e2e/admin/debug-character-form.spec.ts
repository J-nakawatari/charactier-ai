import { test, expect } from '@playwright/test';

test.describe('キャラクター作�EフォームのチE��チE��', () => {
  test('フォームの読み込み状態を詳細に確誁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 チE��チE��チE��ト開姁E);
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドへの遷移を征E��
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
    } catch (e) {
      console.log('❁Eログイン失敁E);
      await page.screenshot({ path: 'login-failed-debug.png' });
      await context.close();
      return;
    }
    
    // Step 2: 十�Eな征E��E
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 新しいペ�Eジで開く
    const newPage = await context.newPage();
    console.log('\n📄 キャラクター作�Eペ�Eジを開ぁE..');
    
    // ネットワークログを有効匁E
    newPage.on('response', response => {
      if (response.url().includes('/admin/characters/new')) {
        console.log(`📡 Response: ${response.status()} ${response.url()}`);
      }
    });
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Step 4: ペ�Eジの状態を詳しく確誁E
    console.log('\n🔍 ペ�Eジ状態�E確誁E');
    console.log('- URL:', newPage.url());
    console.log('- タイトル:', await newPage.title());
    
    // HTMLの冁E��を確誁E
    const bodyText = await newPage.locator('body').innerText();
    console.log('- ペ�Eジの最初�E100斁E��E', bodyText.substring(0, 100));
    
    // エラーメチE��ージを探ぁE
    const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('⚠�E�EエラーメチE��ージ:', errorMessages);
    }
    
    // Step 5: フォーム要素を段階的に確誁E
    console.log('\n📋 フォーム要素の詳細確誁E');
    
    // 基本皁E��要素の存在確誁E
    const formExists = await newPage.locator('form').count() > 0;
    console.log(`- <form>タグ: ${formExists ? '存在する' : '存在しなぁE}`);
    
    // より庁E��E��セレクターで確誁E
    const inputElements = {
      'すべての<input>': await newPage.locator('input').count(),
      'チE��スト型<input>': await newPage.locator('input[type="text"]').count(),
      'すべての<select>': await newPage.locator('select').count(),
      'すべての<textarea>': await newPage.locator('textarea').count(),
      'すべての<button>': await newPage.locator('button').count(),
      'type=submitのボタン': await newPage.locator('button[type="submit"]').count()
    };
    
    for (const [name, count] of Object.entries(inputElements)) {
      console.log(`- ${name}: ${count}個`);
    }
    
    // Step 6: 具体的なフィールドを名前で探ぁE
    console.log('\n🔍 具体的なフィールド�E検索:');
    
    const fieldSelectors = [
      { name: '名前フィールチE, selectors: ['input[name*="name"]', 'input[placeholder*="名前"]', 'input[placeholder*="Name"]'] },
      { name: '説明フィールチE, selectors: ['textarea[name*="description"]', 'textarea[placeholder*="説昁E]'] },
      { name: '性格選抁E, selectors: ['select[name*="personality"]', 'select[name*="preset"]'] },
      { name: '保存�Eタン', selectors: ['button:has-text("保孁E)', 'button:has-text("作�E")', 'button:has-text("Save")'] }
    ];
    
    for (const field of fieldSelectors) {
      let found = false;
      for (const selector of field.selectors) {
        const count = await newPage.locator(selector).count();
        if (count > 0) {
          console.log(`✁E${field.name}: "${selector}" で ${count}個見つかりました`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`❁E${field.name}: 見つかりません`);
      }
    }
    
    // Step 7: ペ�Eジ全体�E構造を確誁E
    console.log('\n📐 ペ�Eジ構造の確誁E');
    const mainContent = await newPage.locator('main, .main-content, #content, .container').count();
    console.log(`- メインコンチE��チE��リア: ${mainContent}個`);
    
    const sidebar = await newPage.locator('aside, .sidebar, nav').count();
    console.log(`- サイドバー/ナビゲーション: ${sidebar}個`);
    
    // Step 8: JavaScriptエラーを確誁E
    const jsErrors: string[] = [];
    newPage.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await newPage.waitForTimeout(2000);
    if (jsErrors.length > 0) {
      console.log('\n❁EJavaScriptエラー:');
      jsErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    // スクリーンショチE��
    await newPage.screenshot({ path: 'debug-character-form.png', fullPage: true });
    console.log('\n📸 チE��チE��用スクリーンショチE��めEdebug-character-form.png に保孁E);
    
    // HTMLを保孁E
    const html = await newPage.content();
    require('fs').writeFileSync('debug-character-form.html', html);
    console.log('📄 HTMLめEdebug-character-form.html に保孁E);
    
    await context.close();
  });
});
