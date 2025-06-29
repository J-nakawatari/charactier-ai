import { test, expect } from '@playwright/test';

test.describe('キャラクター編集画面の詳細テスト', () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('編集画面の構造と入力', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター編集詳細テスト開始');
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✅ ログイン成功');
      
      // キャラクター一覧へ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 最初のキャラクターの編集ボタンをクリック
      const firstRow = page.locator('tbody tr').first();
      const editButton = firstRow.locator('td:last-child button').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForLoadState('networkidle');
        console.log('✅ 編集画面へ遷移');
      } else {
        throw new Error('編集ボタンが見つかりません');
      }
      
      // 編集画面の要素確認
      console.log('\n📋 編集画面の要素確認:');
      
      // 1. タイトル確認
      const title = await page.locator('h1:has-text("キャラクター編集")').isVisible();
      console.log(`- タイトル「キャラクター編集」: ${title ? '✅' : '❌'}`);
      
      // 2. 言語タブ確認
      const jpTab = await page.locator('button:has-text("日本語")').isVisible();
      const enTab = await page.locator('button:has-text("English")').isVisible();
      console.log(`- 日本語タブ: ${jpTab ? '✅' : '❌'}`);
      console.log(`- Englishタブ: ${enTab ? '✅' : '❌'}`);
      
      // 3. 基本情報の入力フィールド
      console.log('\n📝 基本情報フィールド:');
      
      // キャラクター名（日本語）
      const nameInput = page.locator('input[value*="テストキャラ"]').first();
      if (await nameInput.isVisible()) {
        const currentName = await nameInput.inputValue();
        console.log(`- 現在の名前: ${currentName}`);
        
        // 名前を更新
        await nameInput.clear();
        await nameInput.fill(`${currentName}_編集済み`);
        console.log('✅ 名前を更新');
      }
      
      // デフォルトメッセージ
      const messageTextarea = page.locator('textarea').first();
      if (await messageTextarea.isVisible()) {
        await messageTextarea.clear();
        await messageTextarea.fill('編集テストで更新されたデフォルトメッセージです。');
        console.log('✅ デフォルトメッセージを更新');
      }
      
      // 4. 基本設定セクション
      console.log('\n⚙️ 基本設定:');
      
      // キャラクター種類（ドロップダウン）
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible()) {
        const currentValue = await typeSelect.inputValue();
        console.log(`- 現在のキャラクター種類: ${currentValue}`);
      }
      
      // 性別選択
      const genderInputs = page.locator('input[name="性別"], input[name="gender"]');
      console.log(`- 性別オプション数: ${await genderInputs.count()}`);
      
      // 5. 性格・特徴設定
      console.log('\n🎭 性格・特徴設定:');
      
      // 性格タイプのチェックボックス
      const personalityCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await personalityCheckboxes.count();
      console.log(`- 性格チェックボックス数: ${checkboxCount}`);
      
      // いくつかチェックを入れる
      if (checkboxCount > 0) {
        // 「優しい」にチェック
        const kindCheckbox = page.locator('label:has-text("優しい") input[type="checkbox"]');
        if (await kindCheckbox.isVisible() && !(await kindCheckbox.isChecked())) {
          await kindCheckbox.click();
          console.log('✅ 「優しい」をチェック');
        }
      }
      
      // 6. AI設定
      console.log('\n🤖 AI設定:');
      const aiModelSelect = page.locator('select:has(option:has-text("GPT"))');
      if (await aiModelSelect.isVisible()) {
        const currentModel = await aiModelSelect.inputValue();
        console.log(`- 現在のAIモデル: ${currentModel}`);
      }
      
      // 7. 画像設定の確認
      console.log('\n🖼️ 画像設定:');
      
      // アバター画像
      const avatarUpload = page.locator('text="キャラクター画像設定"').locator('..').locator('input[type="file"]').first();
      console.log(`- アバター画像アップロード: ${await avatarUpload.count() > 0 ? '✅' : '❌'}`);
      
      // ギャラリー画像
      const gallerySection = await page.locator('text="ギャラリー画像"').isVisible();
      console.log(`- ギャラリー画像セクション: ${gallerySection ? '✅' : '❌'}`);
      
      // レベル画像の数を確認
      const levelImages = page.locator('text=/解放レベル \\d+/');
      const levelImageCount = await levelImages.count();
      console.log(`- レベル画像スロット数: ${levelImageCount}`);
      
      // 8. 保存ボタン
      const saveButton = page.locator('button:has-text("保存")');
      console.log(`\n💾 保存ボタン: ${await saveButton.isVisible() ? '✅' : '❌'}`);
      
      // スクリーンショット
      await page.screenshot({ path: 'character-edit-detailed.png', fullPage: true });
      console.log('\n📸 スクリーンショット保存: character-edit-detailed.png');
      
      // 実際に保存
      if (await saveButton.isVisible()) {
        await saveButton.click();
        console.log('💾 保存ボタンをクリック');
        
        // 保存結果を待つ
        await page.waitForTimeout(3000);
        
        // 成功メッセージまたはリダイレクトを確認
        const currentUrl = page.url();
        const hasSuccessMessage = await page.locator('.toast-success, text="保存しました"').isVisible().catch(() => false);
        
        console.log(`\n📊 保存結果:`);
        console.log(`- URL: ${currentUrl}`);
        console.log(`- 成功メッセージ: ${hasSuccessMessage ? '✅' : '❌'}`);
      }
      
    } catch (error) {
      console.error('❌ テストエラー:', error);
      await page.screenshot({ path: 'character-edit-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});