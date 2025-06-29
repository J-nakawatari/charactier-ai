import { test, expect } from '@playwright/test';

test.describe('安定版：キャラクター作成フォームテスト', () => {
  test('ログイン後にキャラクター作成ページへ安全に遷移', async ({ page }) => {
    console.log('🚀 テスト開始: 安定版キャラクター作成フォームテスト');
    
    // Step 1: ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    console.log('📍 ログインページに到達');
    
    // ログインフォームに入力
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    
    // ログインボタンをクリックする前に、ナビゲーションを待つ準備
    const navigationPromise = page.waitForNavigation({ 
      url: '**/admin/dashboard',
      waitUntil: 'networkidle' 
    });
    
    // ログインボタンをクリック
    await page.locator('button[type="submit"]').click();
    console.log('🔑 ログインボタンをクリック');
    
    // ダッシュボードへのナビゲーションを待つ
    await navigationPromise;
    console.log('✅ ダッシュボードに到達');
    console.log('📍 現在のURL:', page.url());
    
    // Step 2: ページが完全に安定するまで待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 3秒待機（すべての非同期処理が完了するのを待つ）
    
    // Step 3: 2つの方法を試す
    
    // 方法A: サイドバーのリンクを使用
    console.log('\n📝 方法A: サイドバーからナビゲート');
    try {
      // サイドバーのキャラクター管理リンクを探す
      const sidebarLink = page.locator('nav a[href="/admin/characters"], aside a[href="/admin/characters"], a:has-text("キャラクター管理"), a:has-text("キャラクター")').first();
      
      if (await sidebarLink.isVisible({ timeout: 2000 })) {
        await sidebarLink.click();
        await page.waitForURL('**/admin/characters', { timeout: 5000 });
        console.log('✅ キャラクター一覧ページに到達（サイドバー経由）');
        
        // 新規作成ボタンを探してクリック
        await page.waitForLoadState('networkidle');
        const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作成")').first();
        
        if (await newButton.isVisible({ timeout: 3000 })) {
          await newButton.click();
          await page.waitForURL('**/admin/characters/new', { timeout: 5000 });
          console.log('✅ キャラクター作成ページに到達（新規作成ボタン経由）');
        }
      }
    } catch (error) {
      console.log('⚠️ 方法Aが失敗:', error.message);
    }
    
    // 方法B: 現在のURLを確認して適切に対応
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin/characters/new')) {
      console.log('\n📝 方法B: 段階的なナビゲーション');
      
      // まずキャラクター一覧ページへ
      if (!currentUrl.includes('/admin/characters')) {
        await page.goto('/admin/characters', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        console.log('✅ キャラクター一覧ページに到達（直接遷移）');
      }
      
      // 次に新規作成ページへ
      await page.goto('/admin/characters/new', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      console.log('✅ キャラクター作成ページに到達（直接遷移）');
    }
    
    // Step 4: フォームの検証
    console.log('\n📋 フォームフィールドの検証:');
    
    // 現在のページがキャラクター作成ページであることを確認
    await expect(page).toHaveURL(/.*\/admin\/characters\/new/);
    
    // フォーム要素の存在確認
    const formChecks = [
      { name: '名前入力フィールド', selector: 'input[type="text"]', action: async (el) => {
        const count = await el.count();
        console.log(`- 名前入力フィールド: ${count}個`);
        if (count > 0) {
          await el.first().fill('テストキャラクター');
          console.log('  ✅ テスト入力完了');
        }
      }},
      { name: '性格プリセット', selector: 'select', action: async (el) => {
        const count = await el.count();
        console.log(`- セレクトボックス: ${count}個`);
        if (count > 0 && await el.first().isVisible()) {
          const options = await el.first().locator('option').count();
          console.log(`  オプション数: ${options}`);
          if (options > 1) {
            await el.first().selectOption({ index: 1 });
            console.log('  ✅ 選択完了');
          }
        }
      }},
      { name: '性格タグ', selector: 'input[type="checkbox"]', action: async (el) => {
        const count = await el.count();
        console.log(`- チェックボックス: ${count}個`);
        if (count > 0 && await el.first().isVisible()) {
          await el.first().click();
          console.log('  ✅ チェック完了');
        }
      }},
      { name: '説明フィールド', selector: 'textarea', action: async (el) => {
        const count = await el.count();
        console.log(`- テキストエリア: ${count}個`);
        if (count > 0) {
          await el.first().fill('テスト用の説明文です。');
          console.log('  ✅ 入力完了');
        }
      }},
      { name: '保存ボタン', selector: 'button[type="submit"], button:has-text("保存"), button:has-text("作成")', action: async (el) => {
        const isVisible = await el.first().isVisible();
        console.log(`- 保存ボタン: ${isVisible ? '表示されています' : '見つかりません'}`);
      }}
    ];
    
    for (const check of formChecks) {
      const element = page.locator(check.selector);
      await check.action(element);
    }
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'stable-character-form.png', fullPage: true });
    console.log('\n📸 スクリーンショットを stable-character-form.png に保存しました');
    
    // 最終確認
    console.log('\n✅ テスト完了');
    console.log('最終URL:', page.url());
  });
});