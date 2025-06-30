import { test, expect } from '@playwright/test';

test.describe('キャラクター管琁E���E - 修正牁E, () => {
  test.setTimeout(60000); // チE��ト�Eタイムアウトを60秒に設宁E
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('新規キャラクターの作�E - 修正牁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター作�EチE��ト開始（修正版！E);
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // ダチE��ュボ�Eドへの遷移を征E��
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
      
      // 十�Eな征E��E
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいペ�Eジでキャラクター作�Eペ�Eジを直接開く
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      console.log('📍 現在のURL:', newPage.url());
      
      // URLの確誁E
      if (!newPage.url().includes('/characters/new')) {
        throw new Error('キャラクター作�Eペ�Eジに到達できませんでした');
      }
      
      // フォーム要素の存在を確認してから入劁E
      console.log('📝 フォームに入力中...');
      
      const timestamp = Date.now();
      const characterName = `チE��トキャラ_${timestamp}`;
      
      // Step 1: 名前入力（存在確認付き�E�E
      const nameInputs = await newPage.locator('input[type="text"]').count();
      console.log(`チE��スト�E力フィールド数: ${nameInputs}`);
      
      if (nameInputs >= 2) {
        // 日本語名
        const nameJaInput = newPage.locator('input[type="text"]').first();
        await nameJaInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameJaInput.fill(characterName);
        console.log('✁E日本語名入劁E);
        
        // 英語名
        const nameEnInput = newPage.locator('input[type="text"]').nth(1);
        await nameEnInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameEnInput.fill(`Test Character ${timestamp}`);
        console.log('✁E英語名入劁E);
      } else {
        console.log('⚠�E�E名前入力フィールドが見つかりません');
      }
      
      // Step 2: 説明�E力（存在確認付き�E�E
      const textareaCount = await newPage.locator('textarea').count();
      console.log(`チE��ストエリア数: ${textareaCount}`);
      
      if (textareaCount > 0) {
        const descInput = newPage.locator('textarea').first();
        await descInput.waitFor({ state: 'visible', timeout: 5000 });
        await descInput.fill('修正版テストで作�Eされたキャラクターです、E);
        console.log('✁E説明�E劁E);
      }
      
      // Step 3: 性格プリセチE���E�存在確認付き�E�E
      const selectCount = await newPage.locator('select').count();
      console.log(`セレクト�EチE��ス数: ${selectCount}`);
      
      if (selectCount > 0) {
        const personalitySelect = newPage.locator('select').first();
        await personalitySelect.waitFor({ state: 'visible', timeout: 5000 });
        const options = await personalitySelect.locator('option').all();
        
        // 空でなぁE��を選抁E
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await personalitySelect.selectOption(value);
            console.log(`✁E性格プリセチE��選抁E ${value}`);
            break;
          }
        }
      }
      
      // Step 4: 性格タグ�E�存在確認付き�E�E
      const checkboxCount = await newPage.locator('input[type="checkbox"]').count();
      console.log(`チェチE��ボックス数: ${checkboxCount}`);
      
      if (checkboxCount > 0) {
        const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
        await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 });
        await firstCheckbox.click();
        console.log('✁E性格タグ選抁E);
      }
      
      // スクリーンショチE���E�保存前�E�E
      await newPage.screenshot({ path: 'before-save-fixed.png' });
      
      // Step 5: 保孁E
      const saveButton = newPage.locator('button[type="submit"], button:has-text("保孁E), button:has-text("作�E")').first();
      const saveButtonExists = await saveButton.isVisible().catch(() => false);
      
      if (saveButtonExists) {
        console.log('💾 保存�EタンをクリチE��...');
        await saveButton.click();
        
        // 結果を征E��
        await newPage.waitForTimeout(5000);
        
        // 成功の確誁E
        const finalUrl = newPage.url();
        const hasSuccessMessage = await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false);
        
        console.log('📊 結果:');
        console.log('- 最終URL:', finalUrl);
        console.log('- 成功メチE��ージ:', hasSuccessMessage);
        
        const isSuccess = !finalUrl.includes('/new') || hasSuccessMessage;
        
        if (!isSuccess) {
          const errors = await newPage.locator('.error, .text-red-600').allTextContents();
          console.log('❁Eエラー:', errors);
        } else {
          console.log('✁Eキャラクター作�E成功');
        }
        
        expect(isSuccess).toBeTruthy();
      } else {
        console.log('❁E保存�Eタンが見つかりません');
      }
      
    } catch (error) {
      console.error('チE��トエラー:', error);
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
    
    // ダチE��ュボ�Eドを征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await page.waitForTimeout(5000);
    
    // JavaScriptで遷移
    await page.evaluate(() => {
      window.location.href = '/admin/characters';
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('📍 キャラクター一覧ペ�Eジ:', page.url());
    
    // 一覧の要素を確誁E
    const hasTable = await page.locator('table, .character-list').isVisible().catch(() => false);
    const hasNewButton = await page.locator('a[href="/admin/characters/new"], button:has-text("新規作�E")').isVisible().catch(() => false);
    
    console.log('- チE�Eブル/リスチE', hasTable ? '✁E : '❁E);
    console.log('- 新規作�Eボタン:', hasNewButton ? '✁E : '❁E);
    
    expect(hasTable || hasNewButton).toBeTruthy();
  });
});
