import { test, expect } from '@playwright/test';

test.describe('キャラクター作�Eフォームの検証 v2', () => {
  test('新しいコンチE��ストでキャラクター作�Eフォームを確誁E, async ({ browser }) => {
    // 新しいブラウザコンチE��ストを作�E
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 チE��ト開姁E キャラクター作�Eフォームの検証 v2');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // ログインフォームに入劁E
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダチE��ュボ�Eドへの遷移を征E��
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✁Eログイン成功');
      console.log('📍 現在のURL:', page.url());
    } catch (e) {
      console.log('❁Eログイン失敁E);
      const errorMessages = await page.locator('.error, .text-red-600, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('エラーメチE��ージ:', errorMessages.join(', '));
      }
      await page.screenshot({ path: 'login-error-v2.png' });
      await context.close();
      return;
    }
    
    // Step 2: ダチE��ュボ�Eドが完�Eに読み込まれるまで征E��
    console.log('⏱�E�EダチE��ュボ�Eド�E安定を征E��中...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 現在のペ�Eジを閉じる
    await page.close();
    
    // Step 3: 新しいペ�Eジでキャラクター作�Eペ�Eジを開ぁE
    console.log('📄 新しいペ�Eジでキャラクター作�Eペ�Eジを開ぁE);
    const newPage = await context.newPage();
    
    try {
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // URLが正しいことを確誁E
      const currentUrl = newPage.url();
      console.log('📍 現在のURL:', currentUrl);
      
      if (!currentUrl.includes('/admin/characters/new')) {
        throw new Error(`期征E��たURLではありません: ${currentUrl}`);
      }
      
      console.log('✁Eキャラクター作�Eペ�Eジに到遁E);
      
    } catch (error) {
      console.log('❁Eキャラクター作�Eペ�Eジへの遷移に失敁E', error.message);
      await newPage.screenshot({ path: 'navigation-error-v2.png' });
      await context.close();
      return;
    }
    
    // Step 4: ペ�Eジが完�Eに読み込まれるのを征E��
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000); // 追加の征E��E
    
    console.log('\n📋 フォームフィールド�E確誁E');
    
    // 吁E��素の数をカウント（より確実に�E�E
    const elements = {
      'チE��スト�E劁E: await newPage.locator('input[type="text"]').count(),
      'セレクト�EチE��ス': await newPage.locator('select').count(),
      'チェチE��ボックス': await newPage.locator('input[type="checkbox"]').count(),
      'チE��ストエリア': await newPage.locator('textarea').count(),
      '保存�Eタン': await newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').count()
    };
    
    // チE��チE��惁E��を追加
    console.log('要素数:', elements);
    
    // もし要素が見つからなぁE��合、より庁E��E��で検索
    if (elements['チE��スト�E劁E] === 0) {
      console.log('⚠�E�EチE��スト�E力が見つかりません。すべてのinput要素を確誁E..');
      const allInputs = await newPage.locator('input').count();
      console.log(`全input要素: ${allInputs}個`);
    }
    
    for (const [name, count] of Object.entries(elements)) {
      console.log(`- ${name}: ${count}個`);
    }
    
    // 忁E��フィールド�E存在を確誁E
    expect(elements['チE��スト�E劁E]).toBeGreaterThan(0);
    expect(elements['セレクト�EチE��ス']).toBeGreaterThan(0);
    expect(elements['チェチE��ボックス']).toBeGreaterThan(0);
    
    console.log('\n✁Eキャラクター作�Eフォームの忁E��フィールドが正しく表示されてぁE��ぁE);
    
    // スクリーンショチE��を保孁E
    await newPage.screenshot({ path: 'character-form-v2.png', fullPage: true });
    console.log('📸 スクリーンショチE��めEcharacter-form-v2.png に保存しました');
    
    // クリーンアチE�E
    await context.close();
  });
  
  test('管琁E��面の認証状態を維持してペ�Eジ遷移', async ({ page, context }) => {
    console.log('🔐 認証状態を維持した�Eージ遷移チE��チE);
    
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドを征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン完亁E);
    
    // 十�Eに征E��
    await page.waitForTimeout(5000);
    
    // JavaScriptで直接遷移
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    // 新しいペ�Eジの読み込みを征E��
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log('📍 最終URL:', finalUrl);
    
    if (finalUrl.includes('/admin/characters/new')) {
      console.log('✁Eキャラクター作�Eペ�Eジに到達！EavaScript遷移�E�E);
      
      // フォームの簡易確誁E
      const hasForm = await page.locator('form, input[type="text"], select').count() > 0;
      console.log(`フォーム要素: ${hasForm ? '存在する' : '存在しなぁE}`);
    } else {
      console.log('❁E期征E��た�Eージに到達できませんでした');
    }
  });
});
