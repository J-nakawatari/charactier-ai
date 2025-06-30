import { test, expect } from '@playwright/test';

test.describe('キャラクター一覧画面のチE��チE, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター一覧画面の要素確誁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター一覧画面チE��ト開姁E);
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
      
      // キャラクター一覧ペ�Eジへ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 1. ヘッダー要素の確誁E
      console.log('\n📋 ヘッダー要素の確誁E');
      
      // タイトル
      const title = await page.locator('h1:has-text("キャラクター管琁E)').isVisible();
      console.log(`- タイトル「キャラクター管琁E��E ${title ? '✁E : '❁E}`);
      
      // 新規作�Eボタン�E�右上�E紫色のボタン�E�E
      const newButton = await page.locator('button:has-text("新規作�E")').isVisible();
      console.log(`- 新規作�Eボタン: ${newButton ? '✁E : '❁E}`);
      
      // 統計カーチE
      const statsCards = await page.locator('.grid > div').count();
      console.log(`- 統計カード数: ${statsCards}`);
      
      // 2. 検索・フィルター機�Eの確誁E
      console.log('\n🔍 検索・フィルター機�E:');
      
      // 検索ボックス
      const searchInput = await page.locator('input[placeholder*="キャラクター検索"]').isVisible();
      console.log(`- 検索ボックス: ${searchInput ? '✁E : '❁E}`);
      
      // フィルターボタン
      const filterButton = await page.locator('button:has-text("フィルター")').isVisible();
      console.log(`- フィルターボタン: ${filterButton ? '✁E : '❁E}`);
      
      // エクスポ�Eト�Eタン
      const exportButton = await page.locator('button:has-text("エクスポ�EチE)').isVisible();
      console.log(`- エクスポ�Eト�Eタン: ${exportButton ? '✁E : '❁E}`);
      
      // 3. チE�Eブルの確誁E
      console.log('\n📊 チE�Eブル構造:');
      
      // チE�Eブルヘッダー
      const headers = await page.locator('thead th').allTextContents();
      console.log('- ヘッダー:', headers);
      
      // キャラクター行数
      const rows = await page.locator('tbody tr').count();
      console.log(`- キャラクター数: ${rows}行`);
      
      // 4. 吁E���E要素確認（最初�E行！E
      if (rows > 0) {
        console.log('\n📝 最初�Eキャラクター行�E確誁E');
        const firstRow = page.locator('tbody tr').first();
        
        // キャラクター名とID
        const characterInfo = await firstRow.locator('td').first().textContent();
        console.log(`- キャラクター惁E��: ${characterInfo}`);
        
        // スチE�Eタス�E��E開中�E�E
        const status = await firstRow.locator('span:has-text("公開中")').isVisible();
        console.log(`- スチE�Eタス「�E開中、E ${status ? '✁E : '❁E}`);
        
        // 操作�Eタン�E�編雁E��削除�E�E
        const editButton = await firstRow.locator('button[title*="編雁E], a[href*="/edit"]').isVisible();
        const deleteButton = await firstRow.locator('button[title*="削除"]').isVisible();
        console.log(`- 編雁E�Eタン: ${editButton ? '✁E : '❁E}`);
        console.log(`- 削除ボタン: ${deleteButton ? '✁E : '❁E}`);
      }
      
      // スクリーンショチE��
      await page.screenshot({ path: 'character-list-test.png', fullPage: true });
      console.log('\n📸 スクリーンショチE��保孁E character-list-test.png');
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      await page.screenshot({ path: 'character-list-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });

  test('新規作�EボタンのクリチE��', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      
      // キャラクター一覧ペ�Eジへ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 新規作�EボタンをクリチE��
      await page.locator('button:has-text("新規作�E")').click();
      
      // ペ�Eジ遷移を征E��
      await page.waitForLoadState('networkidle');
      
      // URLが変わったことを確誁E
      const currentUrl = page.url();
      console.log(`遷移允ERL: ${currentUrl}`);
      expect(currentUrl).toContain('/characters/new');
      
    } finally {
      await context.close();
    }
  });

  test('編雁E�EタンのクリチE��', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      
      // キャラクター一覧ペ�Eジへ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 最初�E行�E編雁E�EタンをクリチE��
      const firstEditButton = page.locator('tbody tr').first().locator('button[title*="編雁E], a[href*="/edit"]');
      
      if (await firstEditButton.isVisible()) {
        await firstEditButton.click();
        await page.waitForLoadState('networkidle');
        
        // URLが編雁E�Eージに変わったことを確誁E
        const currentUrl = page.url();
        console.log(`編雁E�EージURL: ${currentUrl}`);
        expect(currentUrl).toMatch(/\/characters\/[^\/]+\/edit/);
      }
      
    } finally {
      await context.close();
    }
  });
});
