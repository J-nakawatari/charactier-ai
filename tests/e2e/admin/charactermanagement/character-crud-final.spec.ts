import { test, expect } from '@playwright/test';

test.describe('キャラクター管琁E���E - 最終修正牁E, () => {
  test.setTimeout(60000); // 全チE��ト�Eタイムアウトを60秒に設宁E
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('キャラクター作�EチE��チE- 段階的アプローチE, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター作�EチE��ト開始（最終版�E�E);
    
    try {
      // スチE��チE: ログイン
      console.log('📝 スチE��チE: ログイン中...');
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // ダチE��ュボ�Eドへの遷移を征E��
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
      
      // スチE��チE: 安定化のための征E��E
      console.log('⏳ スチE��チE: 安定化征E��中...');
      await page.waitForTimeout(5000);
      await page.close();
      
      // スチE��チE: 新しいペ�Eジでキャラクター一覧へ
      console.log('📝 スチE��チE: キャラクター一覧ペ�Eジへ遷移...');
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // スチE��チE: 新規作�Eボタンを探してクリチE��
      console.log('🔍 スチE��チE: 新規作�Eボタンを探索中...');
      const newButtonSelectors = [
        'a[href="/admin/characters/new"]',
        'button:has-text("新規作�E")',
        'a:has-text("新規作�E")',
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
            console.log(`✁EボタンクリチE��成功: ${selector}`);
            break;
          }
        } catch (e) {
          // 次のセレクターを試ぁE
        }
      }
      
      if (!buttonClicked) {
        console.log('⚠�E�Eボタンが見つからなぁE��め、直接URLへ遷移');
        await newPage.goto('/admin/characters/new');
      }
      
      // スチE��チE: フォームペ�Eジの読み込み征E��E
      console.log('⏳ スチE��チE: フォームペ�Eジ読み込み征E��E..');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // URLの確誁E
      const currentUrl = newPage.url();
      console.log(`📍 現在のURL: ${currentUrl}`);
      
      if (!currentUrl.includes('/characters/new') && !currentUrl.includes('/characters/create')) {
        console.error('❁Eキャラクター作�Eペ�Eジに到達できませんでした');
        await newPage.screenshot({ path: 'final-navigation-error.png' });
        throw new Error('ナビゲーションエラー');
      }
      
      // スチE��チE: フォーム要素の存在確誁E
      console.log('🔍 スチE��チE: フォーム要素の確誁E..');
      const formCheck = {
        textInputs: await newPage.locator('input[type="text"]').count(),
        selects: await newPage.locator('select').count(),
        checkboxes: await newPage.locator('input[type="checkbox"]').count(),
        textareas: await newPage.locator('textarea').count(),
        submitButtons: await newPage.locator('button[type="submit"]').count()
      };
      
      console.log('📋 フォーム要素数:', formCheck);
      
      // スチE��チE: フォーム入力（段階的に�E�E
      console.log('📝 スチE��チE: フォーム入力開姁E..');
      const timestamp = Date.now();
      
      // 7-1: 名前入劁E
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
        console.log('  ✁E名前入力完亁E);
      }
      
      // 7-2: 説明�E力（日本語�E英語！E
      if (formCheck.textareas >= 2) {
        console.log('  7-2: 説明�E力中...');
        // 日本語説昁E
        const descriptionJa = newPage.locator('textarea').first();
        await descriptionJa.waitFor({ state: 'visible', timeout: 5000 });
        await descriptionJa.clear();
        await descriptionJa.fill('最終修正版�EチE��トで作�Eされたキャラクターです、E);
        
        // 英語説昁E
        const descriptionEn = newPage.locator('textarea').nth(1);
        await descriptionEn.waitFor({ state: 'visible', timeout: 5000 });
        await descriptionEn.clear();
        await descriptionEn.fill('This is a test character created with the final version.');
        
        await newPage.waitForTimeout(500);
        console.log('  ✁E説明（日本語�E英語）�E力完亁E);
      }
      
      // 7-3: 性別と性格プリセチE��選抁E
      if (formCheck.selects > 0) {
        console.log('  7-3: セレクト�EチE��ス処琁E��...');
        const selects = await newPage.locator('select').all();
        
        // 最初�Eセレクト（性別�E�E
        if (selects.length > 0) {
          const genderSelect = selects[0];
          await genderSelect.waitFor({ state: 'visible', timeout: 5000 });
          const genderOptions = await genderSelect.locator('option').all();
          if (genderOptions.length > 1) {
            const value = await genderOptions[1].getAttribute('value');
            if (value) {
              await genderSelect.selectOption(value);
              console.log(`  ✁E性別選択完亁E ${value}`);
            }
          }
        }
        
        // 2番目のセレクト（性格プリセチE���E�E
        if (selects.length > 1) {
          const personalitySelect = selects[1];
          await personalitySelect.waitFor({ state: 'visible', timeout: 5000 });
          const personalityOptions = await personalitySelect.locator('option').all();
          console.log(`  性格プリセチE��オプション数: ${personalityOptions.length}`);
          
          // 空でなぁE��初�E値を選抁E
          for (let i = 1; i < personalityOptions.length; i++) {
            const optionValue = await personalityOptions[i].getAttribute('value');
            const optionText = await personalityOptions[i].textContent();
            
            if (optionValue && optionValue !== '') {
              await personalitySelect.selectOption(optionValue);
              await newPage.waitForTimeout(500);
              console.log(`  ✁E性格プリセチE��選択完亁E ${optionValue} (${optionText})`);
              break;
            }
          }
        }
      }
      
      // 7-4: 性格タグ選抁E
      if (formCheck.checkboxes > 0) {
        console.log('  7-4: 性格タグ選択中...');
        const checkbox = newPage.locator('input[type="checkbox"]').first();
        await checkbox.waitFor({ state: 'visible', timeout: 5000 });
        await checkbox.click();
        await newPage.waitForTimeout(500);
        console.log('  ✁E性格タグ選択完亁E);
      }
      
      // 7-5: チE��ォルトメチE��ージ�E�日本語�E英語！E
      if (formCheck.textareas >= 4) {
        console.log('  7-5: チE��ォルトメチE��ージ入力中...');
        // 日本語デフォルトメチE��ージ
        const defaultMessageJa = newPage.locator('textarea').nth(2);
        await defaultMessageJa.waitFor({ state: 'visible', timeout: 5000 });
        await defaultMessageJa.clear();
        await defaultMessageJa.fill('こんにちは�E�テストキャラクターですよらしくお願いします！E);
        
        // 英語デフォルトメチE��ージ
        const defaultMessageEn = newPage.locator('textarea').nth(3);
        await defaultMessageEn.waitFor({ state: 'visible', timeout: 5000 });
        await defaultMessageEn.clear();
        await defaultMessageEn.fill('Hello! I am a test character. Nice to meet you!');
        
        await newPage.waitForTimeout(500);
        console.log('  ✁EチE��ォルトメチE��ージ入力完亁E);
      }
      
      // スクリーンショチE���E��E力後！E
      await newPage.screenshot({ path: 'final-form-filled.png', fullPage: true });
      console.log('📸 入力後�EスクリーンショチE��保孁E);
      
      // スチE��チE: 保存�E琁E
      console.log('💾 スチE��チE: 保存�E琁E..');
      const saveButton = newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').first();
      
      if (await saveButton.isVisible()) {
        // ボタンが有効になるまで征E��
        await expect(saveButton).toBeEnabled({ timeout: 10000 });
        
        // ネットワークが安定するまで征E��
        await newPage.waitForLoadState('networkidle');
        
        // 保存�EタンをクリチE��
        await saveButton.click();
        console.log('✁E保存�EタンクリチE��');
        
        // ト�Eストが表示されるまで征E���E�作�E完亁E��チE��ージ�E�E
        try {
          await newPage.waitForSelector('[role="alert"]:has-text("作�E完亁E), .toast:has-text("作�E完亁E)', { timeout: 10000 });
          console.log('✁E作�E完亁E��ーストが表示されました');
        } catch (e) {
          console.log('⚠�E�E作�E完亁E��ーストが見つかりません');
        }
        
        // URLの変更を征E���E�リダイレクト！E
        try {
          await newPage.waitForURL('**/admin/characters', { timeout: 5000 });
          console.log('✁Eキャラクター一覧ペ�Eジにリダイレクトされました');
        } catch (e) {
          console.log('⚠�E�Eリダイレクトが完亁E��ませんでした');
        }
        
        // 成功判定（詳細なログ付き�E�E
        const finalUrl = newPage.url();
        
        // 吁E��件を個別にチェチE��
        const urlChanged = finalUrl.includes('/admin/characters') && !finalUrl.includes('/new');
        const toastVisible = await newPage.locator('[role="alert"]:has-text("作�E完亁E), .toast:has-text("作�E完亁E), [role="alert"]:has-text("新規作�Eしました")').isVisible().catch(() => false);
        const characterNameVisible = await newPage.locator(`text="最終テストキャラ_${timestamp}"`).isVisible().catch(() => false);
        
        console.log('\n📊 成功条件の詳細:');
        console.log(`- URL変更 (charactersペ�Eジ): ${urlChanged ? '✁E : '❁E} (${finalUrl})`);
        console.log(`- 成功ト�Eスト表示: ${toastVisible ? '✁E : '❁E}`);
        console.log(`- キャラクター名表示: ${characterNameVisible ? '✁E : '❁E}`);
        
        // ペ�Eジ上�Eすべてのト�EストメチE��ージを取征E
        const allToasts = await newPage.locator('[role="alert"], .toast, .toast-message').allTextContents();
        if (allToasts.length > 0) {
          console.log('- 検�EされたトースチE', allToasts);
        }
        
        // エラーメチE��ージを探ぁE
        const errorMessages = await newPage.locator('.error, .text-red-600, [role="alert"]:has-text("エラー"), .error-message, .bg-red-50').allTextContents();
        if (errorMessages.length > 0) {
          console.log('- エラーメチE��ージ:', errorMessages);
        }
        
        const hasSuccess = urlChanged || toastVisible || characterNameVisible;
        console.log(`\n📊 最終結果: ${hasSuccess ? '✁E成功' : '❁E失敁E}`);
        
        if (!hasSuccess) {
          await newPage.screenshot({ path: 'final-save-error.png', fullPage: true });
          console.log('- スクリーンショチE��を保存しました: final-save-error.png');
          
          // フォームのバリチE�Eションエラーを確誁E
          const validationErrors = await newPage.locator('.bg-red-50 ul li').allTextContents();
          if (validationErrors.length > 0) {
            console.log('- バリチE�Eションエラー:', validationErrors);
          }
        }
        
        expect(hasSuccess).toBeTruthy();
      } else {
        console.error('❁E保存�Eタンが見つかりません');
        throw new Error('保存�Eタンが見つかりません');
      }
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      throw error;
    } finally {
      await context.close();
      console.log('\n✁EチE��ト完亁E);
    }
  });
  
  test('キャラクター一覧の表示確誁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドを征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    await page.close();
    
    // 新しいペ�Eジでキャラクター一覧を開ぁE
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(3000);
    
    // 一覧の要素を確誁E
    const hasTable = await newPage.locator('table, .character-list, .character-grid').isVisible().catch(() => false);
    const hasNewButton = await newPage.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")').isVisible().catch(() => false);
    
    console.log('📋 キャラクター一覧ペ�Eジ:');
    console.log(`- チE�Eブル/リスチE ${hasTable ? '✁E : '❁E}`);
    console.log(`- 新規作�Eボタン: ${hasNewButton ? '✁E : '❁E}`);
    
    expect(hasTable || hasNewButton).toBeTruthy();
    
    await context.close();
  });
});
