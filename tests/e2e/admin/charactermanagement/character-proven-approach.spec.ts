import { test, expect } from '@playwright/test';

test.describe('実証済みアプローチでのキャラクター作成', () => {
  test('debug-character-formと同じ方法でキャラクター作成', async ({ browser }) => {
    // 新しいコンテキストを作成（debug-character-formと同じ）
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 実証済みアプローチでテスト開始');
    
    // Step 1: ログイン（debug-character-formと同じ）
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
    } catch (e) {
      console.log('❌ ログイン失敗');
      await context.close();
      return;
    }
    
    // Step 2: 十分な待機（debug-character-formと同じ）
    await page.waitForTimeout(5000);
    await page.close();
    
    // Step 3: 新しいページで開く（debug-character-formと同じ）
    const newPage = await context.newPage();
    console.log('\n📄 新しいページでキャラクター作成ページを開く...');
    
    await newPage.goto('/admin/characters/new', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // URLが正しいことを確認
    const currentUrl = newPage.url();
    console.log('📍 現在のURL:', currentUrl);
    
    if (!currentUrl.includes('/admin/characters/new')) {
      console.error('❌ 期待したURLではありません');
      await newPage.screenshot({ path: 'proven-approach-error.png' });
      await context.close();
      throw new Error('キャラクター作成ページに到達できませんでした');
    }
    
    console.log('✅ キャラクター作成ページに到達');
    
    // Step 4: フォームに入力
    console.log('\n📝 フォームに入力中...');
    
    // 待機
    await newPage.waitForTimeout(2000);
    
    // テキスト入力
    const textInputs = await newPage.locator('input[type="text"]').all();
    if (textInputs.length >= 2) {
      await textInputs[0].fill('実証済みテストキャラ');
      await textInputs[1].fill('Proven Test Character');
      console.log('✅ 名前を入力');
    }
    
    // テキストエリア
    const textareas = await newPage.locator('textarea').all();
    if (textareas.length > 0) {
      await textareas[0].fill('実証済みアプローチで作成されたテストキャラクターです。');
      console.log('✅ 説明を入力');
    }
    
    // セレクトボックス（性格プリセット）
    const selects = await newPage.locator('select').all();
    if (selects.length > 0) {
      const options = await selects[0].locator('option').all();
      // 空でない最初の値を選択
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await selects[0].selectOption(value);
          console.log(`✅ 性格プリセットを選択: ${value}`);
          break;
        }
      }
    }
    
    // チェックボックス（性格タグ）
    const checkboxes = await newPage.locator('input[type="checkbox"]').all();
    if (checkboxes.length > 0) {
      await checkboxes[0].click();
      console.log('✅ 性格タグを選択');
    }
    
    // Step 5: スクリーンショット
    await newPage.screenshot({ path: 'proven-approach-form.png', fullPage: true });
    console.log('\n📸 フォームのスクリーンショットを保存');
    
    // Step 6: 保存
    const saveButton = newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').first();
    if (await saveButton.isVisible()) {
      console.log('\n💾 保存ボタンをクリック...');
      await saveButton.click();
      
      // 結果を待つ
      await newPage.waitForTimeout(5000);
      
      // 成功の確認
      const finalUrl = newPage.url();
      const hasSuccess = !finalUrl.includes('/new') || 
                        await newPage.locator('.toast-success').isVisible().catch(() => false);
      
      console.log('\n📊 結果:');
      console.log('- 最終URL:', finalUrl);
      console.log('- 成功:', hasSuccess ? '✅' : '❌');
      
      if (!hasSuccess) {
        const errors = await newPage.locator('.error, .text-red-600').allTextContents();
        console.log('- エラー:', errors);
        await newPage.screenshot({ path: 'proven-approach-result.png' });
      }
    }
    
    await context.close();
    console.log('\n✅ テスト完了');
  });
});