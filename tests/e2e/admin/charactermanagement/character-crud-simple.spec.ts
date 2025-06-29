import { test, expect } from '@playwright/test';

test.describe('キャラクター管理 - シンプルテスト', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('管理者ログインとキャラクター一覧表示', async ({ page }) => {
    console.log('🚀 シンプルテスト開始');
    
    // ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // ログインフォームの存在確認
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // ログイン情報入力
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    console.log('✅ ログイン成功');
    
    // キャラクター管理ページへ移動
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // ページタイトルまたはヘッダーの確認
    const pageTitle = await page.title();
    console.log(`📄 ページタイトル: ${pageTitle}`);
    
    // 新規作成ボタンの確認
    const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作成")').first();
    const hasNewButton = await newButton.isVisible().catch(() => false);
    console.log(`🔘 新規作成ボタン: ${hasNewButton ? '✅' : '❌'}`);
    
    // テーブルまたはリストの確認
    const hasTable = await page.locator('table, .character-list').isVisible().catch(() => false);
    console.log(`📊 キャラクター一覧: ${hasTable ? '✅' : '❌'}`);
    
    expect(hasNewButton || hasTable).toBeTruthy();
  });

  test('新規キャラクター作成画面の表示', async ({ page }) => {
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    
    // キャラクター作成ページへ直接遷移
    await page.goto('/admin/characters/new');
    await page.waitForLoadState('networkidle');
    
    // フォーム要素の確認
    const formChecks = {
      名前入力: await page.locator('input[type="text"]').first().isVisible(),
      説明入力: await page.locator('textarea').first().isVisible(),
      性別選択: await page.locator('select').first().isVisible(),
      保存ボタン: await page.locator('button[type="submit"]').isVisible(),
    };
    
    console.log('📝 フォーム要素チェック:');
    Object.entries(formChecks).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value ? '✅' : '❌'}`);
    });
    
    // 基本的なフォーム要素が存在することを確認
    expect(formChecks.名前入力).toBeTruthy();
    expect(formChecks.保存ボタン).toBeTruthy();
  });
});