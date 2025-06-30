import { test, expect } from '@playwright/test';

test.describe('キャラクター作�Eフォーム詳細刁E��', () => {
  test.setTimeout(90000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('フォームの忁E��フィールドを完�Eに刁E��', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 フォーム刁E��チE��ト開姁E);
    
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
      
      // ペ�Eジ全体�EスクリーンショチE��
      await newPage.screenshot({ path: 'form-analysis-full.png', fullPage: true });
      
      console.log('\n🔍 フォーム要素の完�E刁E��:');
      
      // 忁E���Eークがあるラベルを探ぁE
      const requiredLabels = await newPage.locator('label:has(.text-red-500), label:has(*:text("*"))').all();
      console.log(`\n📌 忁E��フィールド数: ${requiredLabels.length}`);
      
      for (let i = 0; i < requiredLabels.length; i++) {
        const label = requiredLabels[i];
        const labelText = await label.textContent();
        console.log(`  [${i}] ${labelText?.trim()}`);
      }
      
      // 全ての入力要素を�E极E
      console.log('\n📋 全入力要素の詳細:');
      
      // チE��スト�E劁E
      const textInputs = await newPage.locator('input[type="text"]').all();
      console.log(`\nチE��スト�E劁E(${textInputs.length}倁E:`);
      for (let i = 0; i < textInputs.length; i++) {
        const input = textInputs[i];
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const required = await input.getAttribute('required');
        const value = await input.inputValue();
        
        // 親要素のラベルチE��ストを取征E
        const parentLabel = await input.locator('xpath=ancestor::div[contains(@class, "space-y")]//label').first().textContent().catch(() => '');
        
        console.log(`  [${i}] name="${name}" placeholder="${placeholder}" required="${required}" value="${value}"`);
        if (parentLabel) {
          console.log(`      ラベル: ${parentLabel.trim()}`);
        }
      }
      
      // セレクト�EチE��ス
      const selects = await newPage.locator('select').all();
      console.log(`\nセレクト�EチE��ス (${selects.length}倁E:`);
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const selectedValue = await select.inputValue();
        
        // 親要素のラベルチE��ストを取征E
        const parentLabel = await select.locator('xpath=ancestor::div[contains(@class, "space-y")]//label').first().textContent().catch(() => '');
        
        console.log(`  [${i}] name="${name}" required="${required}" selectedValue="${selectedValue}"`);
        if (parentLabel) {
          console.log(`      ラベル: ${parentLabel.trim()}`);
        }
        
        // オプションの詳細
        const options = await select.locator('option').all();
        for (let j = 0; j < Math.min(options.length, 3); j++) {
          const optionValue = await options[j].getAttribute('value');
          const optionText = await options[j].textContent();
          console.log(`      option[${j}]: value="${optionValue}" text="${optionText}"`);
        }
      }
      
      // 最小限の入力でチE��チE
      console.log('\n📝 最小限の忁E��頁E��を�E力してチE��チE..');
      const timestamp = Date.now();
      
      // 名前�E�日本語�E英語！E
      if (textInputs.length >= 2) {
        await textInputs[0].fill(`刁E��チE��チE${timestamp}`);
        await textInputs[1].fill(`Analysis Test ${timestamp}`);
        console.log('✁E名前入劁E);
      }
      
      // 性別�E�E番目のセレクト！E
      if (selects.length > 0) {
        await selects[0].selectOption({ index: 1 });
        console.log('✁E性別選抁E);
      }
      
      // 性格プリセチE���E�E番目のセレクト！E
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✁E性格プリセチE��選抁E ${value}`);
            break;
          }
        }
      }
      
      // 性格タグ�E�最佁Eつ忁E��かも！E
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('✁E性格タグ選抁E);
      }
      
      // 現在の状態でスクリーンショチE��
      await newPage.screenshot({ path: 'form-analysis-filled.png', fullPage: true });
      
      // 保存�EタンをクリチE��して、どんなエラーが�Eるか確誁E
      console.log('\n🔬 保存を試みてエラーを�E极E..');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      if (await saveButton.isVisible()) {
        // 保存前の全フォームチE�Eタを確誁E
        console.log('\n📊 保存前のフォーム状慁E');
        
        // 吁E�E力�E現在値を確誁E
        for (let i = 0; i < Math.min(textInputs.length, 5); i++) {
          const value = await textInputs[i].inputValue();
          console.log(`  input[${i}]: "${value}"`);
        }
        
        for (let i = 0; i < selects.length; i++) {
          const value = await selects[i].inputValue();
          console.log(`  select[${i}]: "${value}"`);
        }
        
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
          const responseBody = await response.json().catch(() => response.text());
          console.log('レスポンス冁E��:', JSON.stringify(responseBody, null, 2));
        }
        
        // エラーメチE��ージを征E��
        await newPage.waitForTimeout(3000);
        
        // 全てのエラーメチE��ージを収雁E
        const errorSelectors = [
          '.error',
          '.text-red-600',
          '.text-red-500',
          '.error-message',
          '.field-error',
          '[role="alert"]',
          '.toast-error'
        ];
        
        console.log('\n❁EエラーメチE��ージ:');
        for (const selector of errorSelectors) {
          const errors = await newPage.locator(selector).allTextContents();
          if (errors.length > 0) {
            console.log(`  ${selector}: ${errors}`);
          }
        }
        
        // 無効なフィールドを探ぁE
        const invalidInputs = await newPage.locator('[aria-invalid="true"], .border-red-300').all();
        console.log(`\n⚠�E�E無効なフィールド数: ${invalidInputs.length}`);
        
        // エラー後�EスクリーンショチE��
        await newPage.screenshot({ path: 'form-analysis-error.png', fullPage: true });
      }
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      await newPage.screenshot({ path: 'form-analysis-exception.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
