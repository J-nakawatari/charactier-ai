import { test, expect } from '@playwright/test';

test.describe('キャラクター管琁E��バッグ', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('管琁E��面へのアクセスと新規作�Eボタンの確誁E, async ({ page }) => {
    // 1. ログイン
    console.log('1. 管琁E��E��グイン開姁E);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    
    // ログイン後�E遷移を征E��
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✁EダチE��ュボ�Eドへ遷移成功');
    } catch (e) {
      console.log('❁EダチE��ュボ�Eドへ遷移失敁E);
      console.log('現在のURL:', page.url());
      await page.screenshot({ path: 'admin-login-failed.png' });
      return;
    }
    
    // 2. キャラクター管琁E�Eージへ
    console.log('2. キャラクター管琁E�Eージへ移勁E);
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'admin-characters-page.png' });
    
    // 新規作�Eボタンを探ぁE
    const createButtons = [
      'button:has-text("新規作�E")',
      'a:has-text("新規作�E")',
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
        console.log(`✁E新規作�Eボタンが見つかりました: ${selector}`);
        break;
      }
    }
    
    if (!createButton) {
      console.log('❁E新規作�Eボタンが見つかりません');
      // ペ�Eジ冁E�Eボタンとリンクを�Eて表示
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
    
    // 3. 新規作�EボタンをクリチE��
    console.log('3. 新規作�EボタンをクリチE��');
    await createButton.click();
    
    // ペ�Eジ遷移また�Eモーダル表示を征E��
    await page.waitForTimeout(2000);
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'admin-character-create-form.png' });
    
    // フォーム要素を探ぁE
    const formFields = [
      'input[name="name.ja"]',
      'input[name="nameJa"]',
      'input[name="name"]',
      'input[placeholder*="名前"]',
      'input[placeholder*="Name"]',
      'input[type="text"]'
    ];
    
    console.log('4. フォームフィールドを探ぁE);
    for (const selector of formFields) {
      const field = page.locator(selector);
      const count = await field.count();
      if (count > 0) {
        console.log(`✁Eフィールドが見つかりました: ${selector} (${count}倁E`);
        const isVisible = await field.first().isVisible();
        console.log(`   表示状慁E ${isVisible}`);
      }
    }
    
    // すべての入力フィールドを表示
    const allInputs = await page.locator('input').all();
    console.log(`入力フィールド数: ${allInputs.length}`);
    for (let i = 0; i < Math.min(10, allInputs.length); i++) {
      const name = await allInputs[i].getAttribute('name');
      const placeholder = await allInputs[i].getAttribute('placeholder');
      const type = await allInputs[i].getAttribute('type');
      console.log(`  入劁E{i + 1}: name="${name}" placeholder="${placeholder}" type="${type}"`);
    }
  });
});
