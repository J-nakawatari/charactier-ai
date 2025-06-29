import { test, expect } from '@playwright/test';

test.describe('キャラクター作成 - 成功版', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('スクリーンショットに基づいた正確な入力', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 成功版テスト開始');
    
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
      
      console.log('\n📝 フォーム入力開始（スクリーンショット通り）:');
      const timestamp = Date.now();
      
      // === 基本情報 ===
      const textInputs = await newPage.locator('input[type="text"]').all();
      
      // キャラクター名（日本語・英語）
      await textInputs[0].fill(`成功テストキャラ_${timestamp}`);
      await textInputs[1].fill(`Success Test ${timestamp}`);
      console.log('✅ キャラクター名（日本語・英語）');
      
      // キャットフレーズ（日本語・英語）
      await textInputs[2].fill('テストのキャッチフレーズ');
      await textInputs[3].fill('Test catchphrase');
      console.log('✅ キャットフレーズ（日本語・英語）');
      
      // === テキストエリア（説明） ===
      const textareas = await newPage.locator('textarea').all();
      
      // 説明（日本語・英語）
      await textareas[0].fill('成功テスト用のキャラクターです。全ての必須項目を正しく入力しています。');
      await textareas[1].fill('This is a success test character with all required fields properly filled.');
      console.log('✅ 説明（日本語・英語）');
      
      // === 性格・特徴設定 ===
      const selects = await newPage.locator('select').all();
      
      // 性別（1番目のselect）
      await selects[0].selectOption({ index: 1 }); // 女性を選択
      console.log('✅ 性別');
      
      // 年齢（5番目のテキスト入力）
      if (textInputs.length > 4) {
        await textInputs[4].fill('20歳');
        console.log('✅ 年齢');
      }
      
      // 職業・肩書（6番目のテキスト入力）
      if (textInputs.length > 5) {
        await textInputs[5].fill('AIアシスタント');
        console.log('✅ 職業・肩書');
      }
      
      // 性格プリセット（2番目のselect）
      if (selects.length > 1) {
        const options = await selects[1].locator('option').all();
        for (let i = 1; i < options.length; i++) {
          const value = await options[i].getAttribute('value');
          if (value && value !== '') {
            await selects[1].selectOption(value);
            console.log(`✅ 性格プリセット: ${value}`);
            break;
          }
        }
      }
      
      // 性格タグ（最低1つ）
      const checkboxes = await newPage.locator('input[type="checkbox"]').all();
      if (checkboxes.length > 0) {
        await checkboxes[0].click();
        console.log('✅ 性格タグ');
      }
      
      // === AI・アクセス設定 ===
      // AIモデル（3番目のselect）- デフォルトでOK
      
      // アクセスタイプ（4番目のselect）- デフォルトでOK
      
      // === プロンプト・メッセージ設定 ===
      // デフォルトメッセージ（日本語・英語）
      if (textareas.length >= 4) {
        await textareas[2].fill('こんにちは！私は成功テストキャラクターです。よろしくお願いします！');
        await textareas[3].fill('Hello! I am a success test character. Nice to meet you!');
        console.log('✅ デフォルトメッセージ（日本語・英語）');
      }
      
      // スクリーンショット
      await newPage.screenshot({ path: 'success-test-before-save.png', fullPage: true });
      console.log('\n📸 入力完了スクリーンショット保存');
      
      // 保存
      console.log('\n💾 保存処理...');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // APIレスポンスを監視
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
        
        if (status !== 200 && status !== 201) {
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
        await newPage.screenshot({ path: 'success-test-error.png', fullPage: true });
      } else {
        console.log('\n🎉 キャラクター作成成功！');
      }
      
      expect(isSuccess).toBeTruthy();
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      await newPage.screenshot({ path: 'success-test-exception.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});