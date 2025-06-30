import { test, expect } from '@playwright/test';

test.describe('シンプルなキャラクター作�EチE��チE, () => {
  test('最小限の入力でキャラクターを作�E', async ({ page }) => {
    // 直接ログインペ�Eジから開姁E
    await page.goto('/admin/login');
    
    // ログイン
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドを征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('✁Eログイン完亁E);
    
    // 5秒征E��（重要E��E
    await page.waitForTimeout(5000);
    
    // キャラクター一覧ペ�Eジ経由で遷移�E�より確実！E
    console.log('📄 キャラクター一覧ペ�Eジへ遷移...');
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 新規作�Eボタンを探してクリチE��
    console.log('🔍 新規作�Eボタンを探してぁE��ぁE..');
    const newButtonSelectors = [
      'a[href="/admin/characters/new"]',
      'button:has-text("新規作�E")',
      'a:has-text("新規作�E")',
      'button:has-text("追加")',
      'a:has-text("キャラクターを追加")'
    ];
    
    let clicked = false;
    for (const selector of newButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          clicked = true;
          console.log(`✁EボタンをクリチE��: ${selector}`);
          break;
        }
      } catch (e) {
        // 次のセレクターを試ぁE
      }
    }
    
    if (!clicked) {
      console.log('⚠�E�E新規作�Eボタンが見つかりません。直接URLで遷移を試みまぁE..');
      await page.goto('/admin/characters/new');
    }
    
    // ペ�Eジの読み込みを征E��
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 現在のURL:', currentUrl);
    
    // URLが正しいことを確認（より柔軟に�E�E
    if (!currentUrl.includes('/characters/new') && !currentUrl.includes('/characters/create')) {
      console.error('❁E期征E��たURLではありません:', currentUrl);
      await page.screenshot({ path: 'navigation-error.png' });
      
      // ペ�Eジの冁E��を確誁E
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      console.log('ペ�Eジタイトル:', pageTitle);
      console.log('ペ�Eジの最初�E200斁E��E', bodyText.substring(0, 200));
      
      throw new Error(`キャラクター作�Eペ�Eジに到達できませんでした。現在のURL: ${currentUrl}`);
    }
    
    // フォーム要素の存在確誁E
    const formElements = {
      'input[type="text"]': await page.locator('input[type="text"]').count(),
      'select': await page.locator('select').count(),
      'checkbox': await page.locator('input[type="checkbox"]').count(),
      'textarea': await page.locator('textarea').count(),
      'submit': await page.locator('button[type="submit"]').count()
    };
    
    console.log('📋 フォーム要素:', formElements);
    
    // 忁E��頁E��のみ入劁E
    if (formElements['input[type="text"]'] > 0) {
      // 名前
      await page.locator('input[type="text"]').first().fill('シンプルチE��トキャラ');
      await page.locator('input[type="text"]').nth(1).fill('Simple Test Character');
      console.log('✁E名前入力完亁E);
    }
    
    if (formElements['select'] > 0) {
      // 性格プリセチE��
      const select = page.locator('select').first();
      const options = await select.locator('option').all();
      
      // 空でなぁE��初�E値を選抁E
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await select.selectOption(value);
          console.log(`✁E性格プリセチE��選択完亁E ${value}`);
          break;
        }
      }
    }
    
    if (formElements['checkbox'] > 0) {
      // 性格タグ
      await page.locator('input[type="checkbox"]').first().click();
      console.log('✁E性格タグ選択完亁E);
    }
    
    // スクリーンショチE��
    await page.screenshot({ path: 'simple-create-form.png' });
    
    // 保存�Eタンの存在確誁E
    const saveButton = page.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').first();
    const buttonExists = await saveButton.isVisible();
    
    console.log(`保存�Eタン: ${buttonExists ? '✁E存在' : '❁E不在'}`);
    
    if (buttonExists) {
      // ボタンが有効になるまで征E��
      await expect(saveButton).toBeEnabled({ timeout: 5000 });
      
      // 保存をクリチE��
      await saveButton.click();
      console.log('⏳ 保存中...');
      
      // 結果を征E��
      await page.waitForTimeout(5000);
      
      // 成功の確誁E
      const finalUrl = page.url();
      const success = !finalUrl.includes('/new') || 
                     await page.locator('.toast-success').isVisible().catch(() => false);
      
      console.log(`結果: ${success ? '✁E成功' : '❁E失敁E}`);
      console.log('最終URL:', finalUrl);
      
      if (!success) {
        const errors = await page.locator('.error, .text-red-600').allTextContents();
        console.log('エラー:', errors);
      }
    }
  });
});
