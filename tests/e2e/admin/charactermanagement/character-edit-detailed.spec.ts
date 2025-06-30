import { test, expect } from '@playwright/test';

test.describe('キャラクター編雁E��面の詳細チE��チE, () => {
  test.setTimeout(60000);
  
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  test('編雁E��面の構造と入劁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🚀 キャラクター編雁E��細チE��ト開姁E);
    
    try {
      // ログイン
      await page.goto('/admin/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
      console.log('✁Eログイン成功');
      
      // キャラクター一覧へ
      await page.goto('/admin/characters');
      await page.waitForLoadState('networkidle');
      
      // 最初�Eキャラクターの編雁E�EタンをクリチE��
      const firstRow = page.locator('tbody tr').first();
      const editButton = firstRow.locator('td:last-child button').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForLoadState('networkidle');
        console.log('✁E編雁E��面へ遷移');
      } else {
        throw new Error('編雁E�Eタンが見つかりません');
      }
      
      // 編雁E��面の要素確誁E
      console.log('\n📋 編雁E��面の要素確誁E');
      
      // 1. タイトル確誁E
      const title = await page.locator('h1:has-text("キャラクター編雁E)').isVisible();
      console.log(`- タイトル「キャラクター編雁E��E ${title ? '✁E : '❁E}`);
      
      // 2. 言語タブ確誁E
      const jpTab = await page.locator('button:has-text("日本誁E)').isVisible();
      const enTab = await page.locator('button:has-text("English")').isVisible();
      console.log(`- 日本語タチE ${jpTab ? '✁E : '❁E}`);
      console.log(`- EnglishタチE ${enTab ? '✁E : '❁E}`);
      
      // 3. 基本惁E��の入力フィールチE
      console.log('\n📝 基本惁E��フィールチE');
      
      // キャラクター名（日本語！E
      const nameInput = page.locator('input[value*="チE��トキャラ"]').first();
      if (await nameInput.isVisible()) {
        const currentName = await nameInput.inputValue();
        console.log(`- 現在の名前: ${currentName}`);
        
        // 名前を更新
        await nameInput.clear();
        await nameInput.fill(`${currentName}_編雁E��み`);
        console.log('✁E名前を更新');
      }
      
      // チE��ォルトメチE��ージ
      const messageTextarea = page.locator('textarea').first();
      if (await messageTextarea.isVisible()) {
        await messageTextarea.clear();
        await messageTextarea.fill('編雁E��ストで更新されたデフォルトメチE��ージです、E);
        console.log('✁EチE��ォルトメチE��ージを更新');
      }
      
      // 4. 基本設定セクション
      console.log('\n⚙︁E基本設宁E');
      
      // キャラクター種類（ドロチE�Eダウン�E�E
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible()) {
        const currentValue = await typeSelect.inputValue();
        console.log(`- 現在のキャラクター種顁E ${currentValue}`);
      }
      
      // 性別選抁E
      const genderInputs = page.locator('input[name="性別"], input[name="gender"]');
      console.log(`- 性別オプション数: ${await genderInputs.count()}`);
      
      // 5. 性格・特徴設宁E
      console.log('\n🎭 性格・特徴設宁E');
      
      // 性格タイプ�EチェチE��ボックス
      const personalityCheckboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await personalityCheckboxes.count();
      console.log(`- 性格チェチE��ボックス数: ${checkboxCount}`);
      
      // ぁE��つかチェチE��を�Eれる
      if (checkboxCount > 0) {
        // 「優しい」にチェチE��
        const kindCheckbox = page.locator('label:has-text("優しい") input[type="checkbox"]');
        if (await kindCheckbox.isVisible() && !(await kindCheckbox.isChecked())) {
          await kindCheckbox.click();
          console.log('✁E「優しい」をチェチE��');
        }
      }
      
      // 6. AI設宁E
      console.log('\n🤁EAI設宁E');
      const aiModelSelect = page.locator('select:has(option:has-text("GPT"))');
      if (await aiModelSelect.isVisible()) {
        const currentModel = await aiModelSelect.inputValue();
        console.log(`- 現在のAIモチE��: ${currentModel}`);
      }
      
      // 7. 画像設定�E確誁E
      console.log('\n🖼�E�E画像設宁E');
      
      // アバター画僁E
      const avatarUpload = page.locator('text="キャラクター画像設宁E').locator('..').locator('input[type="file"]').first();
      console.log(`- アバター画像アチE�EローチE ${await avatarUpload.count() > 0 ? '✁E : '❁E}`);
      
      // ギャラリー画僁E
      const gallerySection = await page.locator('text="ギャラリー画僁E').isVisible();
      console.log(`- ギャラリー画像セクション: ${gallerySection ? '✁E : '❁E}`);
      
      // レベル画像�E数を確誁E
      const levelImages = page.locator('text=/解放レベル \\d+/');
      const levelImageCount = await levelImages.count();
      console.log(`- レベル画像スロチE��数: ${levelImageCount}`);
      
      // 8. 保存�Eタン
      const saveButton = page.locator('button:has-text("保孁E)');
      console.log(`\n💾 保存�Eタン: ${await saveButton.isVisible() ? '✁E : '❁E}`);
      
      // スクリーンショチE��
      await page.screenshot({ path: 'character-edit-detailed.png', fullPage: true });
      console.log('\n📸 スクリーンショチE��保孁E character-edit-detailed.png');
      
      // 実際に保孁E
      if (await saveButton.isVisible()) {
        await saveButton.click();
        console.log('💾 保存�EタンをクリチE��');
        
        // 保存結果を征E��
        await page.waitForTimeout(3000);
        
        // 成功メチE��ージまた�Eリダイレクトを確誁E
        const currentUrl = page.url();
        const hasSuccessMessage = await page.locator('.toast-success, text="保存しました"').isVisible().catch(() => false);
        
        console.log(`\n📊 保存結果:`);
        console.log(`- URL: ${currentUrl}`);
        console.log(`- 成功メチE��ージ: ${hasSuccessMessage ? '✁E : '❁E}`);
      }
      
    } catch (error) {
      console.error('❁EチE��トエラー:', error);
      await page.screenshot({ path: 'character-edit-error.png', fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  });
});
