import { test, expect } from '@playwright/test';

test.describe('キャラクター作�E - 成功牁E, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('スクリーンショチE��に基づぁE��正確な入劁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 成功版テスト開姁E);
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいペ�Eジでキャラクター作�Eペ�Eジへ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      console.log('\n📝 フォーム入力開始（スクリーンショチE��通り�E�E');
      const timestamp = Date.now();
      
      // === 基本惁E�� ===
      const textInputs = await newPage.locator('input[type="text"]').all();
      
      // キャラクター名（日本語�E英語！E
      await textInputs[0].fill(`成功チE��トキャラ_${timestamp}`);
      await textInputs[1].fill(`Success Test ${timestamp}`);
      console.log('✁Eキャラクター名（日本語�E英語！E);
      
      // キャチE��フレーズ�E�日本語�E英語！E
      await textInputs[2].fill('チE��ト�EキャチE��フレーズ');
      await textInputs[3].fill('Test catchphrase');
      console.log('✁EキャチE��フレーズ�E�日本語�E英語！E);
      
      // === チE��ストエリア�E�説明！E===
      const textareas = await newPage.locator('textarea').all();
      
      // 説明（日本語�E英語！E
      await textareas[0].fill('成功チE��ト用のキャラクターです。�Eての忁E��頁E��を正しく入力してぁE��す、E);
      await textareas[1].fill('This is a success test character with all required fields properly filled.');
      console.log('✁E説明（日本語�E英語！E);
      
      // === 性格・特徴設宁E===
      const selects = await newPage.locator('select').all();
      
      // 性別�E�E番目のselect�E�E
      await selects[0].selectOption({ index: 1 }); // 女性を選抁E
      console.log('✁E性別');
      
      // 年齢�E�E番目のチE��スト�E力！E
      if (textInputs.length > 4) {
        await textInputs[4].fill('20歳');
        console.log('✁E年齢');
      }
      
      // 職業・肩書�E�E番目のチE��スト�E力！E
      if (textInputs.length > 5) {
        await textInputs[5].fill('AIアシスタンチE);
        console.log('✁E職業・肩書');
      }
      
      // 性格プリセチE���E�E番目のselect�E�E
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✁E性格プリセチE��: ${value}`);
            break;
          }
        }
      }
      
      // 性格タグ�E�最佁Eつ�E�E
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('✁E性格タグ');
      }
      
      // === AI・アクセス設宁E===
      // AIモチE���E�E番目のselect�E�E チE��ォルトでOK
      
      // アクセスタイプ！E番目のselect�E�E チE��ォルトでOK
      
      // === プロンプト・メチE��ージ設宁E===
      // チE��ォルトメチE��ージ�E�日本語�E英語！E
      if (textareas.length >= 4) {
        await textareas[2].fill('こんにちは�E�私�E成功チE��トキャラクターです。よろしくお願いします！E);
        await textareas[3].fill('Hello! I am a success test character. Nice to meet you!');
        console.log('✁EチE��ォルトメチE��ージ�E�日本語�E英語！E);
      }
      
      // スクリーンショチE��
      await newPage.screenshot({ path: 'success-test-before-save.png', fullPage: true });
      console.log('\n📸 入力完亁E��クリーンショチE��保孁E);
      
      // 保孁E
      console.log('\n💾 保存�E琁E..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // APIレスポンスを監要E
      const responsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      await saveButton.click();
      console.log('✁E保存�EタンクリチE��');
      
      const response = await responsePromise;
      if (response) {
        const status = response.status();
        console.log(`\n📡 APIレスポンス: ${status}`);
        
        if (status !== 200 && status !== 201) {
          const responseBody = await response.json().catch(() => response.text());
          console.log('エラー詳細:');
          console.log(JSON.stringify(responseBody, null, 2));
        }
      }
      
      // 結果を征E��
      await newPage.waitForTimeout(5000);
      
      // 成功判宁E
      const finalUrl = newPage.url();
      const isSuccess = 
        !finalUrl.includes('/new') || 
        await newPage.locator('.toast-success').isVisible().catch(() => false) ||
        finalUrl.includes('/admin/characters/') && !finalUrl.includes('/new');
      
      console.log('\n📊 最終結果:');
      console.log(`- URL: ${finalUrl}`);
      console.log(`- 成功: ${isSuccess ? '✁E : '❁E}`);
      
      if (!isSuccess) {
        const errors = await newPage.locator('.error, .text-red-600').allTextContents();
        console.log('- エラー:', errors);
        await newPage.screenshot({ path: 'success-test-error.png', fullPage: true });
      } else {
        console.log('\n🎉 キャラクター作�E成功�E�E);
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      await newPage.screenshot({ path: 'success-test-exception.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
