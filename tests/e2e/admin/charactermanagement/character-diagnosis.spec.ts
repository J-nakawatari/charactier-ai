import { test, expect } from '@playwright/test';

test.describe('キャラクター作�E - 診断チE��チE, () => {
  test.setTimeout(90000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('フォーム構造を完�Eに琁E��する', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🔬 診断チE��ト開姁E);
    
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
      
      // 1. ペ�EジのHTMLを保存（デバッグ用�E�E
      const pageContent = await newPage.content();
      console.log('\n📄 ペ�Eジ構造の診断:');
      
      // 2. 全てのラベルとそれに対応する�E力要素を特宁E
      const formGroups = await newPage.locator('.space-y-6 > div, .form-group, .mb-4').all();
      console.log(`\nフォームグループ数: ${formGroups.length}`);
      
      // 3. 吁E��キストエリアの詳細を取征E
      console.log('\n📝 チE��ストエリアの詳細:');
      const textareas = await newPage.locator('textarea').all();
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        
        // 近くのラベルを探ぁE
        let label = '';
        try {
          // 親要素から遡ってラベルを探ぁE
          const parentDiv = await textarea.locator('xpath=ancestor::div[contains(@class, "space-y") or contains(@class, "mb")]').first();
          const labelElement = await parentDiv.locator('label').first();
          label = await labelElement.textContent() || '';
        } catch (e) {
          // ラベルが見つからなぁE��吁E
        }
        
        const name = await textarea.getAttribute('name');
        const placeholder = await textarea.getAttribute('placeholder');
        
        console.log(`[${i}] ラベル: "${label.trim()}"`);
        console.log(`    name="${name}" placeholder="${placeholder}"`);
        console.log('---');
      }
      
      // 4. 実際にフォームを埋める�E�診断モード！E
      console.log('\n🖊�E�Eフォーム入力診断:');
      const timestamp = Date.now();
      
      // 名前
      await newPage.locator('input[type="text"]').first().fill(`診断_${timestamp}`);
      await newPage.locator('input[type="text"]').nth(1).fill(`Diagnosis ${timestamp}`);
      console.log('✁E名前入劁E);
      
      // 説明を探して入劁E
      for (let i = 0; i < textareas.length; i++) {
        const textarea = textareas[i];
        const placeholder = await textarea.getAttribute('placeholder') || '';
        
        if (placeholder.includes('説昁E) || i === 0) {
          await textarea.fill('診断用の日本語説明です、E);
          console.log(`✁Etextarea[${i}]に日本語説明�E力`);
        } else if (placeholder.includes('description') || placeholder.includes('English') || i === 1) {
          await textarea.fill('This is a diagnosis description in English.');
          console.log(`✁Etextarea[${i}]に英語説明�E力`);
        } else if (placeholder.includes('メチE��ージ') || placeholder.includes('こんにちは') || i === 2) {
          await textarea.fill('こんにちは�E�診断チE��トキャラクターです、E);
          console.log(`✁Etextarea[${i}]に日本語デフォルトメチE��ージ入力`);
        } else if (placeholder.includes('Hello') || placeholder.includes('message') || i === 3) {
          await textarea.fill('Hello! I am a diagnosis test character.');
          console.log(`✁Etextarea[${i}]に英語デフォルトメチE��ージ入力`);
        }
      }
      
      // セレクト�EチE��ス
      const selects = await newPage.locator('select').all();
      if (selects.length > 0) {
        await selects[0].selectOption({ index: 1 });
        console.log('✁E性別選抁E);
      }
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
      
      // チェチE��ボックス
      await newPage.locator('input[type="checkbox"]').first().click();
      console.log('✁E性格タグ選抁E);
      
      // 5. スクリーンショチE���E��E力後！E
      await newPage.screenshot({ path: 'diagnosis-filled.png', fullPage: true });
      console.log('\n📸 入力後�EスクリーンショチE��保孁E diagnosis-filled.png');
      
      // 6. 保存を試みめE
      console.log('\n💾 保存診断:');
      const saveButton = newPage.locator('button[type="submit"]').first();
      
      // リクエスト�EチE��をキャプチャ
      let requestBody = null;
      newPage.on('request', request => {
        if (request.url().includes('/api/v1/admin/characters') && request.method() === 'POST') {
          requestBody = request.postDataJSON();
        }
      });
      
      await saveButton.click();
      console.log('✁E保存�EタンクリチE��');
      
      // リクエスト�EチE��を表示
      await newPage.waitForTimeout(2000);
      if (requestBody) {
        console.log('\n📤 送信されたデータ:');
        console.log(JSON.stringify(requestBody, null, 2));
      }
      
      // エラーを征E��
      await newPage.waitForTimeout(3000);
      
      // エラーメチE��ージ
      const errors = await newPage.locator('.error, .text-red-600, .toast-error').allTextContents();
      if (errors.length > 0) {
        console.log('\n❁EエラーメチE��ージ:', errors);
      }
      
      // 成功判宁E
      const finalUrl = newPage.url();
      const isSuccess = !finalUrl.includes('/new');
      console.log(`\n📊 結果: ${isSuccess ? '✁E成功' : '❁E失敁E}`);
      console.log(`最終URL: ${finalUrl}`);
      
      // 最終スクリーンショチE��
      await newPage.screenshot({ path: 'diagnosis-final.png', fullPage: true });
      console.log('📸 最終スクリーンショチE��保孁E diagnosis-final.png');
      
    } catch (error) {
      console.error('❁E診断エラー:', error);
      throw error;
    } finally {
      await context.close();
    }
  });
});
