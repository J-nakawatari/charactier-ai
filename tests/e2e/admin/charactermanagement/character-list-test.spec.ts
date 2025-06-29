import { test, expect } from '@playwright/test';

test.describe('キャラクター一覧画面のテスト', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター一覧画面の要素確認', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター一覧画面テスト開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      // キャラクター一覧ページへ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 1. ヘッダー要素の確認
      console.log('\n📋 ヘッダー要素の確認:');
      
      // タイトル
      const title = await page.locator('h1:has-text("キャラクター管理")').isVisible();
      console.log(`- タイトル「キャラクター管理」: ${title ? '✅' : '❌'}`);
      
      // 新規作成ボタン（右上の紫色のボタン）
      const newButton = await page.locator('button:has-text("新規作成")').isVisible();
      console.log(`- 新規作成ボタン: ${newButton ? '✅' : '❌'}`);
      
      // 統計カード
      const statsCards = await page.locator('.grid > div').count();
      console.log(`- 統計カード数: ${statsCards}`);
      
      // 2. 検索・フィルター機能の確認
      console.log('\n🔍 検索・フィルター機能:');
      
      // 検索ボックス
      const searchInput = await page.locator('input[placeholder*="キャラクター検索"]').isVisible();
      console.log(`- 検索ボックス: ${searchInput ? '✅' : '❌'}`);
      
      // フィルターボタン
      const filterButton = await page.locator('button:has-text("フィルター")').isVisible();
      console.log(`- フィルターボタン: ${filterButton ? '✅' : '❌'}`);
      
      // エクスポートボタン
      const exportButton = await page.locator('button:has-text("エクスポート")').isVisible();
      console.log(`- エクスポートボタン: ${exportButton ? '✅' : '❌'}`);
      
      // 3. テーブルの確認
      console.log('\n📊 テーブル構造:');
      
      // テーブルヘッダー
      const headers = await page.locator('thead th').allTextContents();
      console.log('- ヘッダー:', headers);
      
      // キャラクター行数
      const rows = await page.locator('tbody tr').count();
      console.log(`- キャラクター数: ${rows}行`);
      
      // 4. 各行の要素確認（最初の行）
      if (rows > 0) {
        console.log('\n📝 最初のキャラクター行の確認:');
        const firstRow = page.locator('tbody tr').first();
        
        // キャラクター名とID
        const characterInfo = await firstRow.locator('td').first().textContent();
        console.log(`- キャラクター情報: ${characterInfo}`);
        
        // ステータス（公開中）
        const status = await firstRow.locator('span:has-text("公開中")').isVisible();
        console.log(`- ステータス「公開中」: ${status ? '✅' : '❌'}`);
        
        // 操作ボタン（編集と削除）
        const editButton = await firstRow.locator('button[title*="編集"], a[href*="/edit"]').isVisible();
        const deleteButton = await firstRow.locator('button[title*="削除"]').isVisible();
        console.log(`- 編集ボタン: ${editButton ? '✅' : '❌'}`);
        console.log(`- 削除ボタン: ${deleteButton ? '✅' : '❌'}`);
      }
      
      // スクリーンショット
      await page.screenshot({ path: 'character-list-test.png', fullPage: true });
      console.log('\n📸 スクリーンショット保存: character-list-test.png');
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      await page.screenshot({ path: 'character-list-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });

  test('新規作成ボタンのクリック', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      
      // キャラクター一覧ページへ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 新規作成ボタンをクリック
      await page.locator('button:has-text("新規作成")').click();
      
      // ページ遷移を待つ
      await page.waitForLoadState('networkidle');
      
      // URLが変わったことを確認
      const currentUrl = page.url();
      console.log(`遷移先URL: ${currentUrl}`);
      expect(currentUrl).toContain('/characters/new');
      
    } finally {
      await context.close();
    }
  });

  test('編集ボタンのクリック', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      
      // キャラクター一覧ページへ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 最初の行の編集ボタンをクリック
      const firstEditButton = page.locator('tbody tr').first().locator('button[title*="編集"], a[href*="/edit"]');
      
      if (await firstEditButton.isVisible()) {
        await firstEditButton.click();
        await page.waitForLoadState('networkidle');
        
        // URLが編集ページに変わったことを確認
        const currentUrl = page.url();
        console.log(`編集ページURL: ${currentUrl}`);
        expect(currentUrl).toMatch(/\/characters\/[^\/]+\/edit/);
      }
      
    } finally {
      await context.close();
    }
  });
});