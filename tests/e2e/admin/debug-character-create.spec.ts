import { test, expect } from '@playwright/test';

test.describe('キャラクター管理デバッグ', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('管理画面へのアクセスと新規作成ボタンの確認', async ({ page }) => {
    // 1. ログイン
    console.log('1. 管理者ログイン開始');
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    // ログイン後の遷移を待つ
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✅ ダッシュボードへ遷移成功');
    } catch (e) {
      console.log('❌ ダッシュボードへ遷移失敗');
      console.log('現在のURL:', page.url());
      await page.screenshot({ path: 'admin-login-failed.png' });
      return;
    }
    
    // 2. キャラクター管理ページへ
    console.log('2. キャラクター管理ページへ移動');
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'admin-characters-page.png' });
    
    // 新規作成ボタンを探す
    const createButtons = [
      'button:has-text("新規作成")',
      'a:has-text("新規作成")',
      'button:has-text("Create")',
      'a:has-text("Create")',
      'button:has-text("追加")',
      'a:has-text("追加")',
      'button[aria-label*="create"]',
      'a[href*="create"]',
      'a[href*="new"]'
    ];
    
    let createButton = null;
    for (const selector of createButtons) {
      const button = page.locator(selector);
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        createButton = button;
        console.log(`✅ 新規作成ボタンが見つかりました: ${selector}`);
        break;
      }
    }
    
    if (!createButton) {
      console.log('❌ 新規作成ボタンが見つかりません');
      // ページ内のボタンとリンクを全て表示
      const allButtons = await page.locator('button').all();
      console.log(`ボタン数: ${allButtons.length}`);
      for (let i = 0; i < Math.min(5, allButtons.length); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  ボタン${i + 1}: ${text}`);
      }
      
      const allLinks = await page.locator('a').all();
      console.log(`リンク数: ${allLinks.length}`);
      for (let i = 0; i < Math.min(5, allLinks.length); i++) {
        const text = await allLinks[i].textContent();
        const href = await allLinks[i].getAttribute('href');
        console.log(`  リンク${i + 1}: ${text} (${href})`);
      }
      return;
    }
    
    // 3. 新規作成ボタンをクリック
    console.log('3. 新規作成ボタンをクリック');
    await createButton.click();
    
    // ページ遷移またはモーダル表示を待つ
    await page.waitForTimeout(2000);
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'admin-character-create-form.png' });
    
    // フォーム要素を探す
    const formFields = [
      'input[name="name.ja"]',
      'input[name="nameJa"]',
      'input[name="name"]',
      'input[placeholder*="名前"]',
      'input[placeholder*="Name"]',
      'input[type="text"]'
    ];
    
    console.log('4. フォームフィールドを探す');
    for (const selector of formFields) {
      const field = page.locator(selector);
      const count = await field.count();
      if (count > 0) {
        console.log(`✅ フィールドが見つかりました: ${selector} (${count}個)`);
        const isVisible = await field.first().isVisible();
        console.log(`   表示状態: ${isVisible}`);
      }
    }
    
    // すべての入力フィールドを表示
    const allInputs = await page.locator('input').all();
    console.log(`入力フィールド数: ${allInputs.length}`);
    for (let i = 0; i < Math.min(10, allInputs.length); i++) {
      const name = await allInputs[i].getAttribute('name');
      const placeholder = await allInputs[i].getAttribute('placeholder');
      const type = await allInputs[i].getAttribute('type');
      console.log(`  入力${i + 1}: name="${name}" placeholder="${placeholder}" type="${type}"`);
    }
  });
});