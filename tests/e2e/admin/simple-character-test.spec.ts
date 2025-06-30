import { test, expect } from '@playwright/test';

test.describe('シンプルなキャラクター作�EチE��チE, () => {
  test('管琁E��面でキャラクターを作�E', async ({ page }) => {
    // 1. 管琁E��E��グイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダチE��ュボ�Eドへの遷移を征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('✁Eログイン成功');
    
    // 2. キャラクター管琁E�Eージへ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    console.log('✁Eキャラクター一覧ペ�Eジ');
    
    // 3. 新規作�Eボタンを探してクリチE��
    // ぁE��つか�Eパターンを試ぁE
    const createButtonSelectors = [
      'a[href="/admin/characters/new"]',
      'button:has-text("新規作�E")',
      'a:has-text("新規作�E")',
      'button:has-text("追加")',
      'a:has-text("追加")'
    ];
    
    let clicked = false;
    for (const selector of createButtonSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
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
      throw new Error('新規作�Eボタンが見つかりません');
    }
    
    // 4. フォームペ�Eジの読み込みを征E��
    await page.waitForTimeout(2000);
    console.log('現在のURL:', page.url());
    
    // 5. フォームに入力（最もシンプルな方法！E
    // すべてのチE��スト�E力フィールドを取征E
    const textInputs = await page.locator('input[type="text"]').all();
    console.log(`チE��スト�E力フィールド数: ${textInputs.length}`);
    
    if (textInputs.length >= 2) {
      // 最初�E2つに名前を�E劁E
      await textInputs[0].fill('チE��トキャラクター');
      await textInputs[1].fill('Test Character');
      console.log('✁E名前を�E劁E);
    }
    
    // すべてのtextareaを取征E
    const textareas = await page.locator('textarea').all();
    console.log(`チE��ストエリア数: ${textareas.length}`);
    
    if (textareas.length >= 2) {
      // 最初�E2つに説明を入劁E
      await textareas[0].fill('チE��ト用の説昁E);
      await textareas[1].fill('Test description');
      console.log('✁E説明を入劁E);
    }
    
    // 性格プリセチE��を選択（忁E��！E
    const selects = await page.locator('select').all();
    console.log(`セレクト�EチE��ス数: ${selects.length}`);
    if (selects.length > 0) {
      // 最初�Eセレクト�EチE��ス�E�性格プリセチE���E�E
      const options = await selects[0].locator('option').all();
      if (options.length > 1) {
        const value = await options[1].getAttribute('value');
        if (value) {
          await selects[0].selectOption(value);
          console.log('✁E性格プリセチE��を選抁E);
        }
      }
    }
    
    // 性格タグを選択（忁E��！E 最初�EチェチE��ボックスをクリチE��
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`チェチE��ボックス数: ${checkboxes.length}`);
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('✁E性格タグを選抁E);
    }
    
    // 6. 保存�Eタンを探してクリチE��
    const saveButtonSelectors = [
      'button:has-text("保孁E)',
      'button:has-text("作�E")',
      'button:has-text("Save")',
      'button[type="submit"]'
    ];
    
    for (const selector of saveButtonSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log(`✁E保存�EタンをクリチE��: ${selector}`);
          break;
        }
      } catch (e) {
        // 次のセレクターを試ぁE
      }
    }
    
    // 7. 結果を確誁E
    await page.waitForTimeout(3000);
    
    // 成功メチE��ージまた�Eリダイレクトを確誁E
    const successIndicators = [
      '.toast-success',
      '.success-message',
      '[role="alert"]',
      'text=成功',
      'text=作�Eしました'
    ];
    
    let success = false;
    for (const selector of successIndicators) {
      if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        success = true;
        console.log(`✁E成功メチE��ージ: ${selector}`);
        break;
      }
    }
    
    // URLの変化も�E功�E持E��E
    if (page.url().includes('/admin/characters') && !page.url().includes('/new')) {
      success = true;
      console.log('✁Eキャラクター一覧に戻りました');
    }
    
    expect(success).toBe(true);
  });
});
