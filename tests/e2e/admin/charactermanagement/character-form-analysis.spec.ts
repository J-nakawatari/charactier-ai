import { test, expect } from '@playwright/test';

test.describe('キャラクター作成フォーム詳細分析', () => {
  test.setTimeout(90000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('フォームの必須フィールドを完全に分析', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 フォーム分析テスト開始');
    
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
      
      // ページ全体のスクリーンショット
      await newPage.screenshot({ path: 'form-analysis-full.png', fullPage: true });
      
      console.log('\n🔍 フォーム要素の完全分析:');
      
      // 必須マークがあるラベルを探す
      const requiredLabels = await newPage.locator('label:has(.text-red-500), label:has(*:text("*"))').all();
      console.log(`\n📌 必須フィールド数: ${requiredLabels.length}`);
      
      for (let i = 0; i < requiredLabels.length; i++) {
        const label = requiredLabels[i];
        const labelText = await label.textContent();
        console.log(`  [${i}] ${labelText?.trim()}`);
      }
      
      // 全ての入力要素を分析
      console.log('\n📋 全入力要素の詳細:');
      
      // テキスト入力
      const textInputs = await newPage.locator('input[type="text"]').all();
      console.log(`\nテキスト入力 (${textInputs.length}個):`);
      for (let i = 0; i < textInputs.length; i++) {
        const input = textInputs[i];
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');
        const required = await input.getAttribute('required');
        const value = await input.inputValue();
        
        // 親要素のラベルテキストを取得
        const parentLabel = await input.locator('xpath=ancestor::div[contains(@class, "space-y")]//label').first().textContent().catch(() => '');
        
        console.log(`  [${i}] name="${name}" placeholder="${placeholder}" required="${required}" value="${value}"`);
        if (parentLabel) {
          console.log(`      ラベル: ${parentLabel.trim()}`);
        }
      }
      
      // セレクトボックス
      const selects = await newPage.locator('select').all();
      console.log(`\nセレクトボックス (${selects.length}個):`);
      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const name = await select.getAttribute('name');
        const required = await select.getAttribute('required');
        const selectedValue = await select.inputValue();
        
        // 親要素のラベルテキストを取得
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
      
      // 最小限の入力でテスト
      console.log('\n📝 最小限の必須項目を入力してテスト...');
      const timestamp = Date.now();
      
      // 名前（日本語・英語）
      if (textInputs.length >= 2) {
        await textInputs[0].fill(`分析テスト_${timestamp}`);
        await textInputs[1].fill(`Analysis Test ${timestamp}`);
        console.log('✅ 名前入力');
      }
      
      // 性別（1番目のセレクト）
      if (selects.length > 0) {
        await selects[0].selectOption({ index: 1 });
        console.log('✅ 性別選択');
      }
      
      // 性格プリセット（2番目のセレクト）
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✅ 性格プリセット選択: ${value}`);
            break;
          }
        }
      }
      
      // 性格タグ（最低1つ必要かも）
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('✅ 性格タグ選択');
      }
      
      // 現在の状態でスクリーンショット
      await newPage.screenshot({ path: 'form-analysis-filled.png', fullPage: true });
      
      // 保存ボタンをクリックして、どんなエラーが出るか確認
      console.log('\n🔬 保存を試みてエラーを分析...');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      if (await saveButton.isVisible()) {
        // 保存前の全フォームデータを確認
        console.log('\n📊 保存前のフォーム状態:');
        
        // 各入力の現在値を確認
        for (let i = 0; i < Math.min(textInputs.length, 5); i++) {
          const value = await textInputs[i].inputValue();
          console.log(`  input[${i}]: "${value}"`);
        }
        
        for (let i = 0; i < selects.length; i++) {
          const value = await selects[i].inputValue();
          console.log(`  select[${i}]: "${value}"`);
        }
        
        // APIレスポンス監視
        const responsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'POST',
          { timeout: 10000 }
        ).catch(() => null);
        
        await saveButton.click();
        console.log('✅ 保存ボタンクリック');
        
        const response = await responsePromise;
        if (response) {
          console.log(`\n📡 APIレスポンス: ${response.status()}`);
          const responseBody = await response.json().catch(() => response.text());
          console.log('レスポンス内容:', JSON.stringify(responseBody, null, 2));
        }
        
        // エラーメッセージを待つ
        await newPage.waitForTimeout(3000);
        
        // 全てのエラーメッセージを収集
        const errorSelectors = [
          '.error',
          '.text-red-600',
          '.text-red-500',
          '.error-message',
          '.field-error',
          '[role="alert"]',
          '.toast-error'
        ];
        
        console.log('\n❌ エラーメッセージ:');
        for (const selector of errorSelectors) {
          const errors = await newPage.locator(selector).allTextContents();
          if (errors.length > 0) {
            console.log(`  ${selector}: ${errors}`);
          }
        }
        
        // 無効なフィールドを探す
        const invalidInputs = await newPage.locator('[aria-invalid="true"], .border-red-300').all();
        console.log(`\n⚠️ 無効なフィールド数: ${invalidInputs.length}`);
        
        // エラー後のスクリーンショット
        await newPage.screenshot({ path: 'form-analysis-error.png', fullPage: true });
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      await newPage.screenshot({ path: 'form-analysis-exception.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});