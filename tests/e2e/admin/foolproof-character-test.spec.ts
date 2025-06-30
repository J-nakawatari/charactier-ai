import { test, expect } from '@playwright/test';

test.describe('確実版�E�キャラクター作�EフォームチE��チE, () => {
  test('セチE��ョンCookieを使用してキャラクター作�Eペ�Eジに直接アクセス', async ({ browser }) => {
    console.log('🚀 確実版チE��ト開姁E);
    
    // Step 1: 新しいコンチE��ストでログイン
    const context = await browser.newContext();
    const loginPage = await context.newPage();
    
    await loginPage.goto('/admin/login');
    await loginPage.fill('input[type="email"]', 'admin@example.com');
    await loginPage.fill('input[type="password"]', 'admin123');
    await loginPage.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドへの遷移を征E��
    await loginPage.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン成功');
    
    // Cookieを取征E
    const cookies = await context.cookies();
    console.log(`🍪 ${cookies.length}個�ECookieを取得`);
    
    // ログインペ�Eジを閉じる
    await loginPage.close();
    
    // Step 2: 十�Eな征E��時閁E
    console.log('⏱�E�E5秒征E��中...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 3: 同じコンチE��ストで新しいペ�Eジを開ぁE
    const characterPage = await context.newPage();
    
    // 直接キャラクター作�Eペ�Eジにアクセス
    await characterPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✁Eキャラクター作�Eペ�Eジに到遁E);
    console.log('📍 URL:', characterPage.url());
    
    // Step 4: ペ�Eジが正しく読み込まれたか確誁E
    const isCharacterNewPage = characterPage.url().includes('/admin/characters/new');
    if (!isCharacterNewPage) {
      console.log('❁E期征E��たURLではありません:', characterPage.url());
      await characterPage.screenshot({ path: 'unexpected-page.png' });
      throw new Error('キャラクター作�Eペ�Eジに到達できませんでした');
    }
    
    // Step 5: フォームフィールド�E検証
    console.log('\n📋 フォームフィールド�E検証:');
    
    // 吁E��ィールド�E存在を確誁E
    const fields = {
      'チE��スト�E劁E: await characterPage.locator('input[type="text"]').count(),
      'セレクト�EチE��ス': await characterPage.locator('select').count(),
      'チェチE��ボックス': await characterPage.locator('input[type="checkbox"]').count(),
      'チE��ストエリア': await characterPage.locator('textarea').count(),
      '保存�Eタン': await characterPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').count()
    };
    
    for (const [name, count] of Object.entries(fields)) {
      console.log(`- ${name}: ${count}個`);
    }
    
    // Step 6: 基本皁E��入力テスチE
    if (fields['チE��スト�E劁E] > 0) {
      await characterPage.locator('input[type="text"]').first().fill('チE��トキャラクター吁E);
      console.log('✁Eキャラクター名を入劁E);
    }
    
    if (fields['セレクト�EチE��ス'] > 0) {
      const select = characterPage.locator('select').first();
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
        console.log('✁E性格プリセチE��を選抁E);
      }
    }
    
    if (fields['チェチE��ボックス'] > 0) {
      await characterPage.locator('input[type="checkbox"]').first().click();
      console.log('✁E性格タグを選抁E);
    }
    
    // スクリーンショチE��
    await characterPage.screenshot({ path: 'foolproof-test-result.png', fullPage: true });
    console.log('\n📸 スクリーンショチE��めEfoolproof-test-result.png に保孁E);
    
    // アサーション
    expect(fields['チE��スト�E劁E]).toBeGreaterThan(0);
    expect(fields['セレクト�EチE��ス']).toBeGreaterThan(0);
    expect(fields['チェチE��ボックス']).toBeGreaterThan(0);
    
    // クリーンアチE�E
    await context.close();
    console.log('\n✁EチE��ト完亁E);
  });
  
  test('管琁E��面の基本皁E��動作確誁E, async ({ page }) => {
    console.log('🔍 管琁E��面の基本動作を確誁E);
    
    // ログインペ�Eジの確誁E
    await page.goto('/admin/login');
    const hasEmailInput = await page.locator('input[type="email"]').isVisible();
    const hasPasswordInput = await page.locator('input[type="password"]').isVisible();
    const hasSubmitButton = await page.locator('button[type="submit"]').isVisible();
    
    console.log('ログインフォーム要素:');
    console.log(`- Email入劁E ${hasEmailInput ? '✁E : '❁E}`);
    console.log(`- Password入劁E ${hasPasswordInput ? '✁E : '❁E}`);
    console.log(`- 送信ボタン: ${hasSubmitButton ? '✁E : '❁E}`);
    
    expect(hasEmailInput).toBeTruthy();
    expect(hasPasswordInput).toBeTruthy();
    expect(hasSubmitButton).toBeTruthy();
  });
});
