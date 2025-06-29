import { test, expect } from '@playwright/test';

test.describe('キャラクター作成フォーム直接アクセス', () => {
  test('直接URLでキャラクター作成ページにアクセス', async ({ page }) => {
    console.log('🚀 テスト開始: キャラクター作成フォーム直接アクセス');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ログイン後のリダイレクトを待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('✅ ログイン成功');
    
    // Step 2: ダッシュボードが完全に読み込まれるまで待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 追加の安全な待機
    
    // Step 3: 新しいタブで開くのと同じように、完全に新しいナビゲーションとして処理
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // ページの読み込みを待つ
    await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ キャラクター作成ページに到達');
    console.log('📍 現在のURL:', page.url());
    
    // Step 4: フォームフィールドの確認
    console.log('\n📝 フォームフィールドの確認:');
    
    // 基本的なフォーム要素の存在を確認
    const formElements = {
      'テキスト入力': 'input[type="text"]',
      'セレクトボックス': 'select',
      'チェックボックス': 'input[type="checkbox"]',
      'テキストエリア': 'textarea',
      '保存ボタン': 'button[type="submit"], button:has-text("保存"), button:has-text("作成")'
    };
    
    for (const [name, selector] of Object.entries(formElements)) {
      const count = await page.locator(selector).count();
      console.log(`- ${name}: ${count}個`);
    }
    
    // Step 5: 必須フィールドのテスト入力
    try {
      // 名前フィールドに入力
      const nameInput = page.locator('input[type="text"]').first();
      await nameInput.fill('テストキャラクター');
      console.log('✅ 名前フィールドに入力');
      
      // 性格プリセットを選択
      const selectBox = page.locator('select').first();
      if (await selectBox.isVisible()) {
        const options = await selectBox.locator('option').allTextContents();
        console.log('性格プリセットのオプション:', options.slice(0, 5)); // 最初の5個を表示
        
        if (options.length > 1) {
          await selectBox.selectOption({ index: 1 });
          console.log('✅ 性格プリセットを選択');
        }
      }
      
      // 性格タグを選択
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
        console.log('✅ 性格タグを選択');
      }
      
    } catch (error) {
      console.log('⚠️ フォームフィールドの操作中にエラー:', error);
    }
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'character-form-direct.png', fullPage: true });
    console.log('\n📸 スクリーンショットを character-form-direct.png に保存しました');
  });
});