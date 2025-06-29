import { test, expect } from '@playwright/test';

test.describe('最小限のキャラクター作成テスト', () => {
  test('セッション維持でキャラクター作成ページにアクセス', async ({ page, context }) => {
    console.log('🚀 最小限のテスト開始');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードに到達するまで待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✅ ログイン成功');
    
    // Step 2: 十分な待機時間を確保
    await page.waitForTimeout(5000);
    console.log('⏱️ 5秒待機完了');
    
    // Step 3: 新しいページインスタンスでキャラクター作成ページを開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters/new');
    await newPage.waitForLoadState('networkidle');
    
    console.log('✅ 新しいタブでキャラクター作成ページを開きました');
    console.log('📍 URL:', newPage.url());
    
    // Step 4: フォームの基本確認
    const hasTextInput = await newPage.locator('input[type="text"]').count() > 0;
    const hasSelect = await newPage.locator('select').count() > 0;
    const hasCheckbox = await newPage.locator('input[type="checkbox"]').count() > 0;
    const hasTextarea = await newPage.locator('textarea').count() > 0;
    const hasSubmitButton = await newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').count() > 0;
    
    console.log('\n📋 フォーム要素の確認:');
    console.log(`- テキスト入力: ${hasTextInput ? '✅' : '❌'}`);
    console.log(`- セレクトボックス: ${hasSelect ? '✅' : '❌'}`);
    console.log(`- チェックボックス: ${hasCheckbox ? '✅' : '❌'}`);
    console.log(`- テキストエリア: ${hasTextarea ? '✅' : '❌'}`);
    console.log(`- 送信ボタン: ${hasSubmitButton ? '✅' : '❌'}`);
    
    // スクリーンショット
    await newPage.screenshot({ path: 'minimal-test-result.png' });
    console.log('\n📸 スクリーンショットを minimal-test-result.png に保存');
    
    // 必須フィールドがすべて存在することを確認
    expect(hasTextInput).toBeTruthy();
    expect(hasSelect).toBeTruthy();
    expect(hasCheckbox).toBeTruthy();
    
    await newPage.close();
  });
});