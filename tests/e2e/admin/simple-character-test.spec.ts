import { test, expect } from '@playwright/test';

test.describe('シンプルなキャラクター作成テスト', () => {
  test('管理画面でキャラクターを作成', async ({ page }) => {
    // 1. 管理者ログイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    console.log('✅ ログイン成功');
    
    // 2. キャラクター管理ページへ
    await page.goto('/admin/characters');
    await page.waitForLoadState('networkidle');
    console.log('✅ キャラクター一覧ページ');
    
    // 3. 新規作成ボタンを探してクリック
    // いくつかのパターンを試す
    const createButtonSelectors = [
      'a[href="/admin/characters/new"]',
      'button:has-text("新規作成")',
      'a:has-text("新規作成")',
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
          console.log(`✅ ボタンをクリック: ${selector}`);
          break;
        }
      } catch (e) {
        // 次のセレクターを試す
      }
    }
    
    if (!clicked) {
      throw new Error('新規作成ボタンが見つかりません');
    }
    
    // 4. フォームページの読み込みを待つ
    await page.waitForTimeout(2000);
    console.log('現在のURL:', page.url());
    
    // 5. フォームに入力（最もシンプルな方法）
    // すべてのテキスト入力フィールドを取得
    const textInputs = await page.locator('input[type="text"]').all();
    console.log(`テキスト入力フィールド数: ${textInputs.length}`);
    
    if (textInputs.length >= 2) {
      // 最初の2つに名前を入力
      await textInputs[0].fill('テストキャラクター');
      await textInputs[1].fill('Test Character');
      console.log('✅ 名前を入力');
    }
    
    // すべてのtextareaを取得
    const textareas = await page.locator('textarea').all();
    console.log(`テキストエリア数: ${textareas.length}`);
    
    if (textareas.length >= 2) {
      // 最初の2つに説明を入力
      await textareas[0].fill('テスト用の説明');
      await textareas[1].fill('Test description');
      console.log('✅ 説明を入力');
    }
    
    // 性格プリセットを選択（必須）
    const selects = await page.locator('select').all();
    console.log(`セレクトボックス数: ${selects.length}`);
    if (selects.length > 0) {
      // 最初のセレクトボックス（性格プリセット）
      const options = await selects[0].locator('option').all();
      if (options.length > 1) {
        const value = await options[1].getAttribute('value');
        if (value) {
          await selects[0].selectOption(value);
          console.log('✅ 性格プリセットを選択');
        }
      }
    }
    
    // 性格タグを選択（必須）- 最初のチェックボックスをクリック
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`チェックボックス数: ${checkboxes.length}`);
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('✅ 性格タグを選択');
    }
    
    // 6. 保存ボタンを探してクリック
    const saveButtonSelectors = [
      'button:has-text("保存")',
      'button:has-text("作成")',
      'button:has-text("Save")',
      'button[type="submit"]'
    ];
    
    for (const selector of saveButtonSelectors) {
      try {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          console.log(`✅ 保存ボタンをクリック: ${selector}`);
          break;
        }
      } catch (e) {
        // 次のセレクターを試す
      }
    }
    
    // 7. 結果を確認
    await page.waitForTimeout(3000);
    
    // 成功メッセージまたはリダイレクトを確認
    const successIndicators = [
      '.toast-success',
      '.success-message',
      '[role="alert"]',
      'text=成功',
      'text=作成しました'
    ];
    
    let success = false;
    for (const selector of successIndicators) {
      if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        success = true;
        console.log(`✅ 成功メッセージ: ${selector}`);
        break;
      }
    }
    
    // URLの変化も成功の指標
    if (page.url().includes('/admin/characters') && !page.url().includes('/new')) {
      success = true;
      console.log('✅ キャラクター一覧に戻りました');
    }
    
    expect(success).toBe(true);
  });
});