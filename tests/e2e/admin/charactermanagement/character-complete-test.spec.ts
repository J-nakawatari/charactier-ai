import { test, expect } from '@playwright/test';

test.describe('キャラクター作�E - 完�E牁E, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('全忁E��頁E��を�E力してキャラクターを作�E', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 完�E版テスト開姁E);
    
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
      
      console.log('\n📝 全忁E��頁E��を�E劁E');
      const timestamp = Date.now();
      
      // 1. キャラクター名（日本語�E英語！E
      const textInputs = await newPage.locator('input[type="text"]').all();
      await textInputs[0].fill(`完�EチE��トキャラ_${timestamp}`);
      await textInputs[1].fill(`Complete Test ${timestamp}`);
      console.log('✁E1. キャラクター名（日本語�E英語！E);
      
      // 2. 説明（日本語�E英語！E- APIエラーから忁E��と判昁E
      const textareas = await newPage.locator('textarea').all();
      if (textareas.length >= 2) {
        await textareas[0].fill('完�EなチE��トキャラクターです。�Eての忁E��頁E��を�E力してぁE��す、E);
        await textareas[1].fill('This is a complete test character with all required fields filled.');
        console.log('✁E2. 説明（日本語�E英語！E);
      }
      
      // 3. 年齢�E�Ege�E�E- APIエラーから忁E��と判昁E
      if (textInputs.length > 2) {
        // 3番目のチE��スト�E力が年齢フィールド�E可能性
        await textInputs[2].fill('20歳');
        console.log('✁E3. 年齢');
      }
      
      // 4. 職業�E�Eccupation�E�E- APIエラーから忁E��と判昁E
      if (textInputs.length > 3) {
        // 4番目のチE��スト�E力が職業フィールド�E可能性
        await textInputs[3].fill('AIアシスタンチE);
        console.log('✁E4. 職業');
      }
      
      // 5. 性別と性格プリセチE��
      const selects = await newPage.locator('select').all();
      if (selects.length > 0) {
        // 性別
        await selects[0].selectOption({ index: 1 });
        console.log('✁E5. 性別');
      }
      
      if (selects.length > 1) {
        // 性格プリセチE��
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✁E6. 性格プリセチE��: ${value}`);
            break;
          }
        }
      }
      
      // 6. 性格タグ
      const firstCheckbox = newPage.locator('input[type="checkbox"]').first();
      await firstCheckbox.click();
      console.log('✁E7. 性格タグ');
      
      // 7. Stripe Product ID - APIエラーから忁E��と判昁E
      // price_で始まるIDを探ぁE
      const stripeInputs = await newPage.locator('input[placeholder*="price_"]').all();
      if (stripeInputs.length > 0) {
        // チE��ト用のダミ�EIDを�E劁E
        await stripeInputs[0].fill('price_test_1234567890');
        console.log('✁E8. Stripe Product ID');
      } else {
        // placeholderで見つからなぁE��合、後ろの方のチE��スト�E力を試ぁE
        for (let i = 4; i < textInputs.length; i++) {
          const placeholder = await textInputs[i].getAttribute('placeholder');
          if (placeholder && placeholder.includes('price_')) {
            await textInputs[i].fill('price_test_1234567890');
            console.log(`✁E8. Stripe Product ID (input[${i}])`);
            break;
          }
        }
      }
      
      // スクリーンショチE��
      await newPage.screenshot({ path: 'complete-test-before-save.png', fullPage: true });
      
      // 保孁E
      console.log('\n💾 保存�E琁E..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
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
        
        if (status === 200 || status === 201) {
          console.log('✁Eキャラクター作�E成功�E�E);
        } else {
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
        await newPage.screenshot({ path: 'complete-test-after-save.png', fullPage: true });
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});
