import { test, expect } from '@playwright/test';

test.describe('キャラクター作�E - 動作確認版', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('性格プリセチE��正しく選択する版', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 チE��ト開姁E);
    
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
      
      console.log('📍 現在のURL:', newPage.url());
      
      // フォーム入劁E
      console.log('\n📝 フォーム入力開姁E..');
      const timestamp = Date.now();
      
      // 名前入劁E
      const textInputs = await newPage.locator('input[type="text"]').all();
      if (textInputs.length >= 2) {
        await textInputs[0].fill(`動作確認キャラ_${timestamp}`);
        await textInputs[1].fill(`Working Char ${timestamp}`);
        console.log('✁E名前入力完亁E);
      }
      
      // 説明�E劁E
      const textareas = await newPage.locator('textarea').all();
      if (textareas.length > 0) {
        await textareas[0].fill('動作確認用のチE��トキャラクターです、E);
        console.log('✁E説明�E力完亁E);
      }
      
      // セレクト�EチE��スの詳細確誁E
      const selects = await newPage.locator('select').all();
      console.log(`\n📋 セレクト�EチE��ス数: ${selects.length}`);
      
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const options = await select.locator('option').all();
        console.log(`\nセレクチE${i}] name="${name}"`);
        
        // 吁E��プションの詳細
        for (let j = 0; j < Math.min(options.length, 5); j++) {
          const value = await options[j].getAttribute('value');
          const text = await options[j].textContent();
          console.log(`  オプション[${j}]: value="${value}", text="${text}"`);
        }
        
        // 性格プリセチE��の選択！Eameまた�Eオプションの冁E��で判断�E�E
        if (i === 1 || name === 'personalityPreset' || (options.length > 5 && await options[1].textContent()?.then(t => t?.includes('フレンドリー')))) {
          console.log('⭁Eこれが性格プリセチE��セレクトです！E);
          
          // 空でなぁE��初�E値を選抁E
          for (let j = 1; j < options.length; j++) {
            const value = await options[j].getAttribute('value');
            if (value && value !== '') {
              await select.selectOption(value);
              console.log(`✁E性格プリセチE��選抁E ${value}`);
              break;
            }
          }
        } else if (i === 0) {
          // 性別の選抁E
          const value = await options[1].getAttribute('value');
          if (value) {
            await select.selectOption(value);
            console.log(`✁E性別選抁E ${value}`);
          }
        }
      }
      
      // 性格タグ選抁E
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('✁E性格タグ選択完亁E);
      }
      
      // スクリーンショチE��
      await newPage.screenshot({ path: 'working-form.png', fullPage: true });
      console.log('\n📸 フォームのスクリーンショチE��保孁E);
      
      // 保存�EタンクリチE��
      const saveButton = newPage.locator('button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        console.log('\n💾 保存�E琁E..');
        
        // APIレスポンス監要E
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        await saveButton.click();
        console.log('✁E保存�EタンクリチE��');
        
        const response = await responsePromise;
        if (response) {
          console.log(`\n📡 APIレスポンス: ${response.status()}`);
          if (response.status() !== 200 && response.status() !== 201) {
            const body = await response.text();
            console.log('エラー冁E��:', body);
          }
        }
        
        // 結果を征E��
        await newPage.waitForTimeout(5000);
        
        // 成功判宁E
        const finalUrl = newPage.url();
        const hasSuccess = 
          !finalUrl.includes('/new') || 
          await newPage.locator('.toast-success').isVisible().catch(() => false);
        
        console.log('\n📊 最終結果:');
        console.log(`- URL: ${finalUrl}`);
        console.log(`- 成功: ${hasSuccess ? '✁E : '❁E}`);
        
        if (!hasSuccess) {
          const errors = await newPage.locator('.error, .text-red-600').allTextContents();
          console.log('- エラー:', errors);
        }
        
        expect(hasSuccess).toBeTruthy();
      }
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});
