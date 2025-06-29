import { test, expect } from '@playwright/test';

test.describe('キャラクター作成 - 完全版', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('全必須項目を入力してキャラクターを作成', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 完全版テスト開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      await page.waitForTimeout(5000);
      await page.close();
      
      // 新しいページでキャラクター作成ページへ
      const newPage = await context.newPage();
      await newPage.goto('/admin/characters/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await newPage.waitForTimeout(3000);
      
      console.log('\n📝 全必須項目を入力:');
      const timestamp = Date.now();
      
      // 1. キャラクター名（日本語・英語）
      const textInputs = await newPage.locator('input[type="text"]').all();
      await textInputs[0].fill(`完全テストキャラ_${timestamp}`);
      await textInputs[1].fill(`Complete Test ${timestamp}`);
      console.log('✅ 1. キャラクター名（日本語・英語）');
      
      // 2. 説明（日本語・英語） - APIエラーから必須と判明
      const textareas = await newPage.locator('textarea').all();
      if (textareas.length >= 2) {
        await textareas[0].fill('完全なテストキャラクターです。全ての必須項目を入力しています。');
        await textareas[1].fill('This is a complete test character with all required fields filled.');
        console.log('✅ 2. 説明（日本語・英語）');
      }
      
      // 3. 年齢（age） - APIエラーから必須と判明
      if (textInputs.length > 2) {
        // 3番目のテキスト入力が年齢フィールドの可能性
        await textInputs[2].fill('20歳');
        console.log('✅ 3. 年齢');
      }
      
      // 4. 職業（occupation） - APIエラーから必須と判明
      if (textInputs.length > 3) {
        // 4番目のテキスト入力が職業フィールドの可能性
        await textInputs[3].fill('AIアシスタント');
        console.log('✅ 4. 職業');
      }
      
      // 5. 性別と性格プリセット
      const selects = await newPage.locator('select').all();
      if (selects.length > 0) {
        // 性別
        await selects[0].selectOption({ index: 1 });
        console.log('✅ 5. 性別');
      }
      
      if (selects.length > 1) {
        // 性格プリセット
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✅ 6. 性格プリセット: ${value}`);
            break;
          }
        }
      }
      
      // 6. 性格タグ
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      console.log('✅ 7. 性格タグ');
      
      // 7. Stripe Product ID - APIエラーから必須と判明
      // price_で始まるIDを探す
      const stripeInputs = await newPage.locator('input[placeholder*="price_"]').all();
      if (stripeInputs.length > 0) {
        // テスト用のダミーIDを入力
        await stripeInputs[0].fill('price_test_1234567890');
        console.log('✅ 8. Stripe Product ID');
      } else {
        // placeholderで見つからない場合、後ろの方のテキスト入力を試す
        for (let i = 4; i < textInputs.length; i++) {
          const placeholder = await textInputs[i].getAttribute('placeholder');
          if (placeholder && placeholder.includes('price_')) {
            await textInputs[i].fill('price_test_1234567890');
            console.log(`✅ 8. Stripe Product ID (input[${i}])`);
            break;
          }
        }
      }
      
      // スクリーンショット
      await newPage.screenshot({ path: 'complete-test-before-save.png', fullPage: true });
      
      // 保存
      console.log('\n💾 保存処理...');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      const responsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      await saveButton.click();
      console.log('✅ 保存ボタンクリック');
      
      const response = await responsePromise;
      if (response) {
        const status = response.status();
        console.log(`\n📡 APIレスポンス: ${status}`);
        
        if (status === 200 || status === 201) {
          console.log('✅ キャラクター作成成功！');
        } else {
          const responseBody = await response.json().catch(() => response.text());
          console.log('エラー詳細:');
          console.log(JSON.stringify(responseBody, null, 2));
        }
      }
      
      // 結果を待つ
      await newPage.waitForTimeout(5000);
      
      // 成功判定
      const finalUrl = newPage.url();
      const isSuccess = 
        !finalUrl.includes('/new') || 
        await newPage.locator('.toast-success').isVisible().catch(() => false) ||
        finalUrl.includes('/admin/characters/') && !finalUrl.includes('/new');
      
      console.log('\n📊 最終結果:');
      console.log(`- URL: ${finalUrl}`);
      console.log(`- 成功: ${isSuccess ? '✅' : '❌'}`);
      
      if (!isSuccess) {
        const errors = await newPage.locator('.error, .text-red-600').allTextContents();
        console.log('- エラー:', errors);
        await newPage.screenshot({ path: 'complete-test-after-save.png', fullPage: true });
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});