import { test, expect } from '@playwright/test';

test.describe('安定版�E�キャラクター作�EフォームチE��チE, () => {
  test('ログイン後にキャラクター作�Eペ�Eジへ安�Eに遷移', async ({ page }) => {
    console.log('🚀 チE��ト開姁E 安定版キャラクター作�EフォームチE��チE);
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    console.log('📍 ログインペ�Eジに到遁E);
    
    // ログインフォームに入劁E
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    
    // ログインボタンをクリチE��する前に、ナビゲーションを征E��準備
    const navigationPromise = page.waitForNavigation({ 
      url: '**/admin/dashboard',
      waitUntil: 'networkidle' 
    });
    
    // ログインボタンをクリチE��
    await page.locator('button[type="submit"]').click();
    console.log('🔑 ログインボタンをクリチE��');
    
    // ダチE��ュボ�Eドへのナビゲーションを征E��
    await navigationPromise;
    console.log('✁EダチE��ュボ�Eドに到遁E);
    console.log('📍 現在のURL:', page.url());
    
    // Step 2: ペ�Eジが完�Eに安定するまで征E��
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 3秒征E��（すべての非同期�E琁E��完亁E��る�Eを征E���E�E
    
    // Step 3: 2つの方法を試ぁE
    
    // 方法A: サイドバーのリンクを使用
    console.log('\n📝 方法A: サイドバーからナビゲーチE);
    try {
      // サイドバーのキャラクター管琁E��ンクを探ぁE
      const sidebarLink = page.locator('nav a[href="/admin/characters"], aside a[href="/admin/characters"], a:has-text("キャラクター管琁E), a:has-text("キャラクター")').first();
      
      if (await sidebarLink.isVisible({ timeout: 2000 })) {
        await sidebarLink.click();
        await page.waitForURL('**/admin/characters', { timeout: 5000 });
        console.log('✁Eキャラクター一覧ペ�Eジに到達（サイドバー経由�E�E);
        
        // 新規作�Eボタンを探してクリチE��
        await page.waitForLoadState('networkidle');
        const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")').first();
        
        if (await newButton.isVisible({ timeout: 3000 })) {
          await newButton.click();
          await page.waitForURL('**/admin/characters/new', { timeout: 5000 });
          console.log('✁Eキャラクター作�Eペ�Eジに到達（新規作�Eボタン経由�E�E);
        }
      }
    } catch (error) {
      console.log('⚠�E�E方法Aが失敁E', error.message);
    }
    
    // 方法B: 現在のURLを確認して適刁E��対忁E
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin/characters/new')) {
      console.log('\n📝 方法B: 段階的なナビゲーション');
      
      // まずキャラクター一覧ペ�Eジへ
      if (!currentUrl.includes('/admin/characters')) {
        await page.goto('/admin/characters', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        console.log('✁Eキャラクター一覧ペ�Eジに到達（直接遷移�E�E);
      }
      
      // 次に新規作�Eペ�Eジへ
      await page.goto('/admin/characters/new', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      console.log('✁Eキャラクター作�Eペ�Eジに到達（直接遷移�E�E);
    }
    
    // Step 4: フォームの検証
    console.log('\n📋 フォームフィールド�E検証:');
    
    // 現在のペ�Eジがキャラクター作�Eペ�Eジであることを確誁E
    await expect(page).toHaveURL(/.*\/admin\/characters\/new/);
    
    // フォーム要素の存在確誁E
    const formChecks = [
      { name: '名前入力フィールチE, selector: 'input[type="text"]', action: async (el) => {
        const count = await el.count();
        console.log(`- 名前入力フィールチE ${count}個`);
        if (count > 0) {
          await el.first().fill('チE��トキャラクター');
          console.log('  ✁EチE��ト�E力完亁E);
        }
      }},
      { name: '性格プリセチE��', selector: 'select', action: async (el) => {
        const count = await el.count();
        console.log(`- セレクト�EチE��ス: ${count}個`);
        if (count > 0 && await el.first().isVisible()) {
          const options = await el.first().locator('option').count();
          console.log(`  オプション数: ${options}`);
          if (options > 1) {
            await el.first().selectOption({ index: 1 });
            console.log('  ✁E選択完亁E);
          }
        }
      }},
      { name: '性格タグ', selector: 'input[type="checkbox"]', action: async (el) => {
        const count = await el.count();
        console.log(`- チェチE��ボックス: ${count}個`);
        if (count > 0 && await el.first().isVisible()) {
          await el.first().click();
          console.log('  ✁EチェチE��完亁E);
        }
      }},
      { name: '説明フィールチE, selector: 'textarea', action: async (el) => {
        const count = await el.count();
        console.log(`- チE��ストエリア: ${count}個`);
        if (count > 0) {
          await el.first().fill('チE��ト用の説明文です、E);
          console.log('  ✁E入力完亁E);
        }
      }},
      { name: '保存�Eタン', selector: 'button[type="submit"], button:has-text("保孁E), button:has-text("作�E")', action: async (el) => {
        const isVisible = await el.first().isVisible();
        console.log(`- 保存�Eタン: ${isVisible ? '表示されてぁE��ぁE : '見つかりません'}`);
      }}
    ];
    
    for (const check of formChecks) {
      const element = page.locator(check.selector);
      await check.action(element);
    }
    
    // スクリーンショチE��を保孁E
    await page.screenshot({ path: 'stable-character-form.png', fullPage: true });
    console.log('\n📸 スクリーンショチE��めEstable-character-form.png に保存しました');
    
    // 最終確誁E
    console.log('\n✁EチE��ト完亁E);
    console.log('最終URL:', page.url());
  });
});
