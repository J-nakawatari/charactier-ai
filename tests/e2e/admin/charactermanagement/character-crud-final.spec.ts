import { test, expect } from '@playwright/test';

test.describe('キャラクター管理機能 - 最終修正版', () => {
  test.setTimeout(60000); // 全テストのタイムアウトを60秒に設定
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター作成テスト - 段階的アプローチ', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター作成テスト開始（最終版）');
    
    try {
      // ステップ1: ログイン
      console.log('📝 ステップ1: ログイン中...');
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // ダッシュボードへの遷移を待つ
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      // ステップ2: 安定化のための待機
      console.log('⏳ ステップ2: 安定化待機中...');
      await page.waitForTimeout(5000);
      await page.close();
      
      // ステップ3: 新しいページでキャラクター一覧へ
      console.log('📝 ステップ3: キャラクター一覧ページへ遷移...');
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // ステップ4: 新規作成ボタンを探してクリック
      console.log('🔍 ステップ4: 新規作成ボタンを探索中...');
      const newButtonSelectors = [
        'a[href="/admin/characters/new"]',
        'button:has-text("新規作成")',
        'a:has-text("新規作成")',
        '.new-character-button',
        'button[data-action="create-character"]'
      ];
      
      let buttonClicked = false;
      for (const selector of newButtonSelectors) {
        try {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            buttonClicked = true;
            console.log(`✅ ボタンクリック成功: ${selector}`);
            break;
          }
        } catch (e) {
          // 次のセレクターを試す
        }
      }
      
      if (!buttonClicked) {
        console.log('⚠️ ボタンが見つからないため、直接URLへ遷移');
        await newPage.goto('/admin/characters/new');
      }
      
      // ステップ5: フォームページの読み込み待機
      console.log('⏳ ステップ5: フォームページ読み込み待機...');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // URLの確認
      const currentUrl = newPage.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      
      if (!currentUrl.includes('/characters/new') && !currentUrl.includes('/characters/create')) {
        console.error('❌ キャラクター作成ページに到達できませんでした');
        await newPage.screenshot({ path: 'final-navigation-error.png' });
        throw new Error('ナビゲーションエラー');
      }
      
      // ステップ6: フォーム要素の存在確認
      console.log('🔍 ステップ6: フォーム要素の確認...');
      const formCheck = {
        textInputs: await newPage.locator('input[type="text"]').count(),
        selects: await newPage.locator('select').count(),
        checkboxes: await newPage.locator('input[type="checkbox"]').count(),
        textareas: await newPage.locator('textarea').count(),
        submitButtons: await newPage.locator('button[type="submit"]').count()
      };
      
      console.log('📋 フォーム要素数:', formCheck);
      
      // ステップ7: フォーム入力（段階的に）
      console.log('📝 ステップ7: フォーム入力開始...');
      const timestamp = Date.now();
      
      // 7-1: 名前入力
      if (formCheck.textInputs >= 2) {
        console.log('  7-1: 名前入力中...');
        const nameJa = newPage.locator('input[type="text"]').first();
        await nameJa.waitFor({ state: 'visible', timeout: 5000 });
        await nameJa.clear();
        await nameJa.fill(`最終テストキャラ_${timestamp}`);
        await newPage.waitForTimeout(500);
        
        const nameEn = newPage.locator('input[type="text"]').nth(1);
        await nameEn.waitFor({ state: 'visible', timeout: 5000 });
        await nameEn.clear();
        await nameEn.fill(`Final Test Character ${timestamp}`);
        await newPage.waitForTimeout(500);
        console.log('  ✅ 名前入力完了');
      }
      
      // 7-2: 説明入力（日本語・英語）
      if (formCheck.textareas >= 2) {
        console.log('  7-2: 説明入力中...');
        // 日本語説明
        const descriptionJa = newPage.locator('textarea').first();
        await descriptionJa.waitFor({ state: 'visible', timeout: 5000 });
        await descriptionJa.clear();
        await descriptionJa.fill('最終修正版のテストで作成されたキャラクターです。');
        
        // 英語説明
        const descriptionEn = newPage.locator('textarea').nth(1);
        await descriptionEn.waitFor({ state: 'visible', timeout: 5000 });
        await descriptionEn.clear();
        await descriptionEn.fill('This is a test character created with the final version.');
        
        await newPage.waitForTimeout(500);
        console.log('  ✅ 説明（日本語・英語）入力完了');
      }
      
      // 7-3: 性別と性格プリセット選択
      if (formCheck.selects > 0) {
        console.log('  7-3: セレクトボックス処理中...');
        const selects = await newPage.locator('select').all();
        
        // 最初のセレクト（性別）
        if (selects.length > 0) {
          const genderSelect = selects[0];
          await genderSelect.waitFor({ state: 'visible', timeout: 5000 });
          const genderOptions = await genderSelect.locator('option').all();
          if (genderOptions.length > 1) {
            const value = await genderOptions[1].getAttribute('value');
            if (value) {
              await genderSelect.selectOption(value);
              console.log(`  ✅ 性別選択完了: ${value}`);
            }
          }
        }
        
        // 2番目のセレクト（性格プリセット）
        if (selects.length > 1) {
          const personalitySelect = selects[1];
          await personalitySelect.waitFor({ state: 'visible', timeout: 5000 });
          const personalityOptions = await personalitySelect.locator('option').all();
          console.log(`  性格プリセットオプション数: ${personalityOptions.length}`);
          
          // 空でない最初の値を選択
          for (let i = 1; i < personalityOptions.length; i++) {
            const optionValue = await personalityOptions[i].getAttribute('value');
            const optionText = await personalityOptions[i].textContent();
            
            if (optionValue && optionValue !== '') {
              await personalitySelect.selectOption(optionValue);
              await newPage.waitForTimeout(500);
              console.log(`  ✅ 性格プリセット選択完了: ${optionValue} (${optionText})`);
              break;
            }
          }
        }
      }
      
      // 7-4: 性格タグ選択
      if (formCheck.checkboxes > 0) {
        console.log('  7-4: 性格タグ選択中...');
        const checkbox = newPage.locator('input[type="checkbox"]').first();
        await checkbox.waitFor({ state: 'visible', timeout: 5000 });
        await checkbox.click();
        await newPage.waitForTimeout(500);
        console.log('  ✅ 性格タグ選択完了');
      }
      
      // 7-5: デフォルトメッセージ（日本語・英語）
      if (formCheck.textareas >= 4) {
        console.log('  7-5: デフォルトメッセージ入力中...');
        // 日本語デフォルトメッセージ
        const defaultMessageJa = newPage.locator('textarea').nth(2);
        await defaultMessageJa.waitFor({ state: 'visible', timeout: 5000 });
        await defaultMessageJa.clear();
        await defaultMessageJa.fill('こんにちは！テストキャラクターですよらしくお願いします！');
        
        // 英語デフォルトメッセージ
        const defaultMessageEn = newPage.locator('textarea').nth(3);
        await defaultMessageEn.waitFor({ state: 'visible', timeout: 5000 });
        await defaultMessageEn.clear();
        await defaultMessageEn.fill('Hello! I am a test character. Nice to meet you!');
        
        await newPage.waitForTimeout(500);
        console.log('  ✅ デフォルトメッセージ入力完了');
      }
      
      // スクリーンショット（入力後）
      await newPage.screenshot({ path: 'final-form-filled.png', fullPage: true });
      console.log('📸 入力後のスクリーンショット保存');
      
      // ステップ8: 保存処理
      console.log('💾 ステップ8: 保存処理...');
      const saveButton = newPage.locator('button[type="submit"], button:has-text("保存"), button:has-text("作成")').first();
      
      if (await saveButton.isVisible()) {
        // ボタンが有効になるまで待つ
        await expect(saveButton).toBeEnabled({ timeout: 10000 });
        
        // ネットワークが安定するまで待つ
        await newPage.waitForLoadState('networkidle');
        
        // 保存ボタンをクリック
        await saveButton.click();
        console.log('✅ 保存ボタンクリック');
        
        // 結果を待つ
        await newPage.waitForTimeout(5000);
        
        // 成功判定
        const finalUrl = newPage.url();
        const hasSuccess = 
          !finalUrl.includes('/new') || 
          await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false) ||
          await newPage.locator(`text="最終テストキャラ_${timestamp}"`).isVisible().catch(() => false);
        
        console.log('\n📊 最終結果:');
        console.log(`- URL: ${finalUrl}`);
        console.log(`- 成功: ${hasSuccess ? '✅' : '❌'}`);
        
        if (!hasSuccess) {
          const errors = await newPage.locator('.error, .text-red-600, [role="alert"]').allTextContents();
          console.log('- エラー:', errors);
          await newPage.screenshot({ path: 'final-save-error.png' });
        }
        
        expect(hasSuccess).toBeTruthy();
      } else {
        console.error('❌ 保存ボタンが見つかりません');
        throw new Error('保存ボタンが見つかりません');
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      throw error;
    } finally {
      await context.close();
      console.log('\n✅ テスト完了');
    }
  });
  
  test('キャラクター一覧の表示確認', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // ダッシュボードを待つ
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    await page.close();
    
    // 新しいページでキャラクター一覧を開く
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000);
    
    // 一覧の要素を確認
    const hasTable = await newPage.locator('table, .character-list, .character-grid').isVisible().catch(() => false);
    const hasNewButton = await newPage.locator('a[href="/admin/characters/new"], button:has-text("新規作成")').isVisible().catch(() => false);
    
    console.log('📋 キャラクター一覧ページ:');
    console.log(`- テーブル/リスト: ${hasTable ? '✅' : '❌'}`);
    console.log(`- 新規作成ボタン: ${hasNewButton ? '✅' : '❌'}`);
    
    expect(hasTable || hasNewButton).toBeTruthy();
    
    await context.close();
  });
});