import { test, expect } from '@playwright/test';

test.describe('キャラクター管琁E- シンプルチE��チE, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('管琁E��E��グインとキャラクター一覧表示', async ({ page }) => {
    console.log('🚀 シンプルチE��ト開姁E);
    
    // ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // ログインフォームの存在確誁E
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // ログイン惁E��入劁E
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    
    // ログインボタンクリチE��
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドへの遷移を征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    console.log('✁Eログイン成功');
    
    // キャラクター管琁E�Eージへ移勁E
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    // ペ�Eジタイトルまた�Eヘッダーの確誁E
    const pageTitle = await page.title();
    console.log(`📄 ペ�Eジタイトル: ${pageTitle}`);
    
    // 新規作�Eボタンの確誁E
    const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")').first();
    const hasNewButton = await newButton.isVisible().catch(() => false);
    console.log(`🔘 新規作�Eボタン: ${hasNewButton ? '✁E : '❁E}`);
    
    // チE�Eブルまた�Eリスト�E確誁E
    const hasTable = await page.locator('table, .character-list').isVisible().catch(() => false);
    console.log(`📊 キャラクター一覧: ${hasTable ? '✁E : '❁E}`);
    
    expect(hasNewButton || hasTable).toBeTruthy();
  });

  test('新規キャラクター作�E画面の表示', async ({ page }) => {
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    
    // キャラクター作�Eペ�Eジへ直接遷移
    await page.goto('/admin/characters/new');
    await page.waitForLoadState('networkidle');
    
    // フォーム要素の確誁E
    const formChecks = {
      名前入劁E await page.locator('input[type="text"]').first().isVisible(),
      説明�E劁E await page.locator('textarea').first().isVisible(),
      性別選抁E await page.locator('select').first().isVisible(),
      保存�Eタン: await page.locator('button[type="submit"]').isVisible(),
    };
    
    console.log('📝 フォーム要素チェチE��:');
    Object.entries(formChecks).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value ? '✁E : '❁E}`);
    });
    
    // 基本皁E��フォーム要素が存在することを確誁E
    expect(formChecks.名前入劁E.toBeTruthy();
    expect(formChecks.保存�Eタン).toBeTruthy();
  });
});
