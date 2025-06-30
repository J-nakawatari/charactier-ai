import { test, expect } from '@playwright/test';

test.describe('動作確認済みのキャラクターチE��チE, () => {
  test('debug-character-formと同じアプローチを使用', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 動作確認済みアプローチでチE��ト開姁E);
    
    // Step 1: ログイン�E�Eebug-character-formと同じ�E�E
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドへの遷移を征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン成功');
    
    // Step 2: 十�Eな征E��！Eebug-character-formと同じ�E�E
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 新しいペ�Eジで開く�E�Eebug-character-formと同じ�E�E
    const newPage = await context.newPage();
    console.log('\n📄 新しいペ�Eジでキャラクター作�Eペ�Eジを開ぁE..');
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Step 4: ペ�Eジが完�Eに読み込まれるのを征E��
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000);
    
    console.log('✁Eキャラクター作�Eペ�Eジに到遁E);
    console.log('📍 URL:', newPage.url());
    
    // Step 5: フォーム要素の確誁E
    const elements = {
      'チE��スト�E劁E: await newPage.locator('input[type="text"]').count(),
      'セレクト�EチE��ス': await newPage.locator('select').count(),
      'チェチE��ボックス': await newPage.locator('input[type="checkbox"]').count(),
      'チE��ストエリア': await newPage.locator('textarea').count(),
      '保存�Eタン': await newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').count()
    };
    
    console.log('\n📋 フォーム要素:', elements);
    
    // Step 6: 実際にフォームに入力してみめE
    if (elements['チE��スト�E劁E] > 0) {
      const nameInput = newPage.locator('input[type="text"]').first();
      await nameInput.fill('チE��トキャラクター_' + Date.now());
      console.log('✁E名前を�E劁E);
    }
    
    if (elements['セレクト�EチE��ス'] > 0) {
      const select = newPage.locator('select').first();
      const options = await select.locator('option').count();
      if (options > 1) {
        await select.selectOption({ index: 1 });
        console.log('✁E性格プリセチE��を選抁E);
      }
    }
    
    if (elements['チェチE��ボックス'] > 0) {
      await newPage.locator('input[type="checkbox"]').first().click();
      console.log('✁E性格タグを選抁E);
    }
    
    if (elements['チE��ストエリア'] > 0) {
      const textarea = newPage.locator('textarea').first();
      await textarea.fill('これはE2EチE��トで作�Eされたキャラクターです、E);
      console.log('✁E説明を入劁E);
    }
    
    // スクリーンショチE��
    await newPage.screenshot({ path: 'working-character-form.png', fullPage: true });
    console.log('\n📸 スクリーンショチE��めEworking-character-form.png に保孁E);
    
    // アサーション
    expect(elements['チE��スト�E劁E]).toBeGreaterThan(0);
    expect(elements['セレクト�EチE��ス']).toBeGreaterThan(0);
    expect(elements['チェチE��ボックス']).toBeGreaterThan(0);
    
    console.log('\n✁EすべてのチE��トが成功しました�E�E);
    
    await context.close();
  });
  
  test('キャラクター一覧ペ�Eジの確誁E, async ({ browser }) => {
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
    
    // 新しいペ�Eジでキャラクター一覧を開ぁE
    const listPage = await context.newPage();
    await listPage.goto('/admin/characters', { waitUntil: 'networkidle' });
    await listPage.waitForTimeout(2000);
    
    console.log('📍 キャラクター一覧ペ�Eジ:', listPage.url());
    
    // 新規作�Eボタンを探ぁE
    const newButton = listPage.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")');
    const buttonExists = await newButton.count() > 0;
    console.log(`新規作�Eボタン: ${buttonExists ? '✁E存在する' : '❁E存在しなぁE}`);
    
    if (buttonExists) {
      await newButton.first().click();
      await listPage.waitForURL('**/admin/characters/new', { timeout: 10000 });
      console.log('✁E新規作�Eボタンから遷移成功');
    }
    
    await context.close();
  });
});
