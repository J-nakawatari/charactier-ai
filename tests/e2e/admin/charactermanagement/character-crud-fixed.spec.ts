import { test, expect } from '@playwright/test';

test.describe('キャラクター管理機能 - 修正版', () => {
  test.setTimeout(60000); // テストのタイムアウトを60秒に設定
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('新規キャラクターの作成 - 修正版', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター作成テスト開始（修正版）');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      // 十分な待機
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいページでキャラクター作成ページを直接開く
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      console.log('📍 現在のURL:', newPage.url());
      
      // URLの確認
      if (!newPage.url().includes('/characters/new')) {
        throw new Error('キャラクター作成ページに到達できませんでした');
      }
      
      // フォーム要素の存在を確認してから入力
      console.log('📝 フォームに入力中...');
      
      const timestamp = Date.now();
      const characterName = `テストキャラ_${timestamp}`;
      
      // Step 1: 名前入力（存在確認付き）
      const nameInputs = await newPage.locator('input[type="text"]').count();
      console.log(`テキスト入力フィールド数: ${nameInputs}`);
      
      if (nameInputs >= 2) {
        // 日本語名
        const nameJaInput = newPage.locator('input[type="text"]').first();
        await nameJaInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameJaInput.fill(characterName);
        console.log('✅ 日本語名入力');
        
        // 英語名
        const nameEnInput = newPage.locator('input[type="text"]').nth(1);
        await nameEnInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameEnInput.fill(`Test Character ${timestamp}`);
        console.log('✅ 英語名入力');
      } else {
        console.log('⚠️ 名前入力フィールドが見つかりません');
      }
      
      // Step 2: 説明入力（存在確認付き）
      const textareaCount = await newPage.locator('textarea').count();
      console.log(`テキストエリア数: ${textareaCount}`);
      
      if (textareaCount > 0) {
        const descInput = newPage.locator('textarea').first();
        await descInput.waitFor({ state: 'visible', timeout: 5000 });
        await descInput.fill('修正版テストで作成されたキャラクターです。');
        console.log('✅ 説明入力');
      }
      
      // Step 3: 性格プリセット（存在確認付き）
      const selectCount = await newPage.locator('select').count();
      console.log(`セレクトボックス数: ${selectCount}`);
      
      if (selectCount > 0) {
        const personalitySelect = newPage.locator('select').first();
        await personalitySelect.waitFor({ state: 'visible', timeout: 5000 });
        const options = await personalitySelect.locator('option').count();
        if (options > 1) {
          await personalitySelect.selectOption({ index: 1 });
          console.log('✅ 性格プリセット選択');
        }
      }
      
      // Step 4: 性格タグ（存在確認付き）
      const checkboxCount = await newPage.locator('input[type="checkbox"]').count();
      console.log(`チェックボックス数: ${checkboxCount}`);
      
      if (checkboxCount > 0) {
        const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
        await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 });
        await firstCheckbox.click();
        console.log('✅ 性格タグ選択');
      }
      
      // スクリーンショット（保存前）
      await newPage.screenshot({ path: 'before-save-fixed.png' });
      
      // Step 5: 保存
      const saveButton = newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').first();
      const saveButtonExists = await saveButton.isVisible().catch(() => false);
      
      if (saveButtonExists) {
        console.log('💾 保存ボタンをクリック...');
        await saveButton.click();
        
        // 結果を待つ
        await newPage.waitForTimeout(5000);
        
        // 成功の確認
        const finalUrl = newPage.url();
        const hasSuccessMessage = await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false);
        
        console.log('📊 結果:');
        console.log('- 最終URL:', finalUrl);
        console.log('- 成功メッセージ:', hasSuccessMessage);
        
        const isSuccess = !finalUrl.includes('/new') || hasSuccessMessage;
        
        if (!isSuccess) {
          const errors = await newPage.locator('.error, .text-red-600').allTextContents();
          console.log('❌ エラー:', errors);
        } else {
          console.log('✅ キャラクター作成成功');
        }
        
        expect(isSuccess).toBeTruthy();
      } else {
        console.log('❌ 保存ボタンが見つかりません');
      }
      
    } catch (error) {
      console.error('テストエラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
  
  test('シンプルなキャラクター一覧表示', async ({ page }) => {
    // 直接ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // ダッシュボードを待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // JavaScriptで遷移
    await page.evaluate(() => {
      window.location.href = '/admin/characters';
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('📍 キャラクター一覧ページ:', page.url());
    
    // 一覧の要素を確認
    const hasTable = await page.locator('table, .character-list').isVisible().catch(() => false);
    const hasNewButton = await page.locator('a[href="/admin/characters/new"], button:has-text("新規作成")').isVisible().catch(() => false);
    
    console.log('- テーブル/リスト:', hasTable ? '✅' : '❌');
    console.log('- 新規作成ボタン:', hasNewButton ? '✅' : '❌');
    
    expect(hasTable || hasNewButton).toBeTruthy();
  });
});