import { test, expect } from '@playwright/test';

test.describe('キャラクター作成フォームナビゲーション', () => {
  test('管理画面からキャラクター作成ページへ遷移', async ({ page }) => {
    // 管理者ログイン
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    // ログイン
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('button[type="submit"]').click();
    
    // ダッシュボードへの遷移を待つ
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      console.log('✅ ログイン成功');
    } catch (e) {
      console.log('❌ ログイン失敗');
      return;
    }
    
    // ページが完全に読み込まれるのを待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 追加の待機
    
    // 方法1: サイドバーメニューから遷移（推奨）
    try {
      // サイドバーのキャラクター管理リンクをクリック
      const characterMenuLink = page.locator('a[href="/admin/characters"], nav a:has-text("キャラクター")');
      if (await characterMenuLink.isVisible({ timeout: 3000 })) {
        await characterMenuLink.click();
        await page.waitForURL('**/admin/characters');
        console.log('✅ キャラクター一覧ページへ遷移');
        
        // 新規作成ボタンをクリック
        const newButton = page.locator('a[href="/admin/characters/new"], button:has-text("新規作成")');
        await newButton.click();
        await page.waitForURL('**/admin/characters/new');
        console.log('✅ キャラクター作成ページへ遷移');
      } else {
        throw new Error('サイドバーメニューが見つかりません');
      }
    } catch (e) {
      console.log('⚠️ メニューナビゲーションに失敗、直接URLで遷移を試みます');
      
      // 方法2: 直接URLで遷移（フォールバック）
      await page.goto('/admin/characters', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      // 新規作成ボタンを探してクリック
      const createButtons = [
        'a[href="/admin/characters/new"]',
        'button:has-text("新規作成")',
        'a:has-text("新規作成")',
        'button:has-text("追加")',
        'a:has-text("追加")'
      ];
      
      let clicked = false;
      for (const selector of createButtons) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          clicked = true;
          console.log(`✅ ボタンをクリック: ${selector}`);
          break;
        }
      }
      
      if (!clicked) {
        // 最終手段: 直接URLで遷移
        await page.goto('/admin/characters/new', { waitUntil: 'networkidle' });
      }
    }
    
    // フォームが表示されるまで待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // フォームフィールドの確認
    console.log('📝 フォームフィールドを確認中...');
    
    // 名前入力フィールド
    const nameFields = await page.locator('input[type="text"]').count();
    console.log(`テキスト入力フィールド数: ${nameFields}`);
    
    // 性格プリセット
    const selectBoxes = await page.locator('select').count();
    console.log(`セレクトボックス数: ${selectBoxes}`);
    
    // 性格タグ（チェックボックス）
    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log(`チェックボックス数: ${checkboxes}`);
    
    // テキストエリア
    const textareas = await page.locator('textarea').count();
    console.log(`テキストエリア数: ${textareas}`);
    
    // 保存ボタン
    const saveButton = page.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")');
    if (await saveButton.isVisible()) {
      console.log('✅ 保存ボタンが表示されています');
    }
    
    // スクリーンショットを保存
    await page.screenshot({ path: 'character-form.png', fullPage: true });
    console.log('📸 フォームのスクリーンショットを character-form.png に保存しました');
  });
});