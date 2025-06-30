import { test, expect } from '@playwright/test';

test.describe('最小限のキャラクター作�EチE��チE, () => {
  test('セチE��ョン維持でキャラクター作�Eペ�Eジにアクセス', async ({ page, context }) => {
    console.log('🚀 最小限のチE��ト開姁E);
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドに到達するまで征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン成功');
    
    // Step 2: 十�Eな征E��時間を確俁E
    await page.waitForTimeout(5000);
    console.log('⏱�E�E5秒征E��完亁E);
    
    // Step 3: 新しいペ�Eジインスタンスでキャラクター作�Eペ�Eジを開ぁE
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters/new');
    await newPage.waitForLoadState('networkidle');
    
    console.log('✁E新しいタブでキャラクター作�Eペ�Eジを開きました');
    console.log('📍 URL:', newPage.url());
    
    // Step 4: フォームの基本確誁E
    const hasTextInput = await newPage.locator('input[type="text"]').count() > 0;
    const hasSelect = await newPage.locator('select').count() > 0;
    const hasCheckbox = await newPage.locator('input[type="checkbox"]').count() > 0;
    const hasTextarea = await newPage.locator('textarea').count() > 0;
    const hasSubmitButton = await newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').count() > 0;
    
    console.log('\n📋 フォーム要素の確誁E');
    console.log(`- チE��スト�E劁E ${hasTextInput ? '✁E : '❁E}`);
    console.log(`- セレクト�EチE��ス: ${hasSelect ? '✁E : '❁E}`);
    console.log(`- チェチE��ボックス: ${hasCheckbox ? '✁E : '❁E}`);
    console.log(`- チE��ストエリア: ${hasTextarea ? '✁E : '❁E}`);
    console.log(`- 送信ボタン: ${hasSubmitButton ? '✁E : '❁E}`);
    
    // スクリーンショチE��
    await newPage.screenshot({ path: 'minimal-test-result.png' });
    console.log('\n📸 スクリーンショチE��めEminimal-test-result.png に保孁E);
    
    // 忁E��フィールドがすべて存在することを確誁E
    expect(hasTextInput).toBeTruthy();
    expect(hasSelect).toBeTruthy();
    expect(hasCheckbox).toBeTruthy();
    
    await newPage.close();
  });
});
