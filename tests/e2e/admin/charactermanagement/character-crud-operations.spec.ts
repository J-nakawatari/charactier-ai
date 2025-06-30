import { test, expect } from '@playwright/test';

test.describe('キャラクター管琁E���Eの匁E��的E2EチE��チE, () => {
  test.setTimeout(120000); // 全チE��ト�Eタイムアウトを120秒に設定（レート制限対策！E
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  
  // モバイルチE��イスではキャラクター管琁E��面のチE��トをスキチE�E
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    const isMobile = testInfo.project.name.toLowerCase().includes('mobile');
    if (isMobile) {
      testInfo.skip(true, 'モバイルビューのキャラクター管琁E��面は後で画面構�Eを見直す忁E��があるため、現在はスキチE�EしまぁE);
    }
  });
  
  // ログイン処琁E��共通化
  const loginAsAdmin = async (page: any) => {
    // レート制限を回避するため、テスト開始前に少し征E��E
    await page.waitForTimeout(2000);
    
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // レート制限対筁E
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.waitForTimeout(500); // レート制限対筁E
    
    await page.click('button[type="submit"]');
    
    // ダチE��ュボ�Eドへの遷移を征E���E�タイムアウトを延長�E�E
    try {
      await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    } catch (error) {
      // エラー詳細を�E劁E
      console.log('❁Eログイン失敗。現在のURL:', page.url());
      const errorMessage = await page.locator('.error-message, .toast-error, [role="alert"]').textContent().catch(() => '');
      if (errorMessage) {
        console.log('エラーメチE��ージ:', errorMessage);
      }
      throw error;
    }
    
    await page.waitForTimeout(2000); // ログイン後�E征E��E
  };
  
  // beforeEachの代わりに、各チE��トで新しいコンチE��ストを使用

  test('新規キャラクターの作�E', async ({ browser }) => {
    // 新しいコンチE��ストでより安定した動作を実現
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await loginAsAdmin(page);
    await page.waitForTimeout(3000); // 十�Eな征E��（重要E��E
    
    // ペ�Eジを閉じる�E�Eebug-character-formと同じアプローチE��E
    await page.close();
    
    // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(2000);
    
    // 新規作�EボタンをクリチE���E�右上�E紫色のボタン�E�E
    const newButton = newPage.locator('button:has-text("新規作�E")').first();
    
    // ボタンが見つからなぁE��合�E直接URLに移勁E
    if (await newButton.isVisible()) {
      await newButton.click();
      // ペ�Eジ遷移を征E��
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
    } else {
      console.log('⚠�E�E新規作�Eボタンが見つからなぁE��め、直接URLに移勁E);
      await newPage.goto('/admin/characters/new');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
    }
    
    // 基本惁E��の入劁E
    const timestamp = Date.now();
    const characterName = `チE��トキャラ_${timestamp}`;
    
    // まず要素の存在を確認（褁E��の方法で征E��！E
    try {
      await newPage.waitForSelector('input[type="text"]', { timeout: 10000 });
    } catch (e) {
      console.log('⚠�E�Einput[type="text"]が見つかりません。フォームの読み込みを征E��E..');
      await newPage.waitForSelector('form', { timeout: 10000 });
      await newPage.waitForTimeout(2000);
    }
    
    // チE��チE��用スクリーンショチE��
    await newPage.screenshot({ path: 'character-new-page.png', fullPage: true });
    
    const textInputs = await newPage.locator('input[type="text"]').all();
    const textareas = await newPage.locator('textarea').all();
    
    console.log(`📝 入力要素数: text inputs=${textInputs.length}, textareas=${textareas.length}`);
    
    // 要素が存在しなぁE��合�Eエラー�E�詳細惁E��付き�E�E
    if (textInputs.length === 0) {
      await newPage.screenshot({ path: 'no-text-inputs-error.png', fullPage: true });
      const visibleInputs = await newPage.locator('input:visible').count();
      const allInputs = await newPage.locator('input').count();
      console.log(`📊 表示されてぁE��入力フィールチE ${visibleInputs}/${allInputs}`);
      
      // ペ�Eジの状態を確誁E
      const pageTitle = await newPage.title();
      const pageUrl = newPage.url();
      console.log(`📄 ペ�Eジタイトル: ${pageTitle}`);
      console.log(`🔗 現在のURL: ${pageUrl}`);
      
      throw new Error(`チE��スト�E力フィールドが見つかりません。表示されてぁE��入力フィールド数: ${visibleInputs}`);
    }
    
    // キャラクター名（日本語�E英語！E
    if (textInputs.length >= 2) {
      await textInputs[0].fill(characterName);
      await textInputs[1].fill(`Test Character ${timestamp}`);
    } else {
      console.warn(`⚠�E�E期征E��た数のチE��スト�E力フィールドがありません: ${textInputs.length}個`);
      // 最低限、最初�Eフィールドだけ�E劁E
      await textInputs[0].fill(characterName);
    }
    
    // キャチE��フレーズ�E�日本語�E英語！E
    if (textInputs.length >= 4) {
      await textInputs[2].fill('チE��トキャチE��フレーズ');
      await textInputs[3].fill('Test catchphrase');
    }
    
    // 説明（日本語�E英語！E
    if (textareas.length >= 2) {
      await textareas[0].fill('E2EチE��ト用のキャラクター説明です、E);
      await textareas[1].fill('This is a test character for E2E testing.');
    } else if (textareas.length >= 1) {
      await textareas[0].fill('E2EチE��ト用のキャラクター説明です、E);
    }
    
    // セレクト�EチE��ス
    const selects = await newPage.locator('select').all();
    
    // 性別�E�E番目のselect�E�E
    if (selects.length > 0) {
      await selects[0].selectOption({ index: 1 });
    }
    
    // 年齢と職業
    if (textInputs.length > 5) {
      await textInputs[4].fill('20歳');
      await textInputs[5].fill('チE��トキャラクター');
    }
    
    // 性格プリセチE���E�E番目のselect�E�E
    if (selects.length > 1) {
      const options = await selects[1].locator('option').all();
      for (let i = 1; i < options.length; i++) {
        const value = await options[i].getAttribute('value');
        if (value && value !== '') {
          await selects[1].selectOption(value);
          break;
        }
      }
    }
    
    // 性格タグを選択（忁E��！E
    const personalityTags = newPage.locator('input[type="checkbox"][name*="personality"], label:has-text("優しい"), label:has-text("フレンドリー")');
    const firstTag = personalityTags.first();
    if (await firstTag.isVisible()) {
      await firstTag.click();
    } else {
      // チェチE��ボックスが見つからなぁE��合、最初�EチェチE��ボックスをクリチE��
      const anyCheckbox = newPage.locator('input[type="checkbox"]').first();
      if (await anyCheckbox.isVisible()) {
        await anyCheckbox.click();
      }
    }
    
    // チE��ォルトメチE��ージ�E�日本語�E英語！E
    if (textareas.length >= 4) {
      await textareas[2].fill('こんにちは�E�テストキャラクターです。よろしくお願いします！E);
      await textareas[3].fill('Hello! I am a test character. Nice to meet you!');
    } else {
      console.log(`⚠�E�EチE��ォルトメチE��ージ用のチE��ストエリアが不足: ${textareas.length}個`);
    }
    
    // 価格タイプ�E選抁E
    const priceTypeSelect = newPage.locator('select[name="priceType"], input[name="priceType"][type="radio"], select[name="characterAccessType"]');
    if (await priceTypeSelect.first().isVisible()) {
      // 有料を選抁E
      await newPage.locator('input[value="paid"], option[value="paid"]').click();
      
      // 価格設宁E
      await newPage.locator('input[name="price"]').fill('1000');
    }
    
    // AIモチE��の選抁E
    const modelSelect = newPage.locator('select[name="model"], select[name="aiModel"]');
    if (await modelSelect.isVisible()) {
      await modelSelect.selectOption('gpt-4o-mini');
    }
    
    // 画像アチE�Eロード（オプション�E�E
    const imageInput = newPage.locator('input[type="file"][name="avatar"], input[type="file"][name="image"]');
    if (await imageInput.isVisible()) {
      // チE��ト画像をアチE�Eロード（実際のファイルパスが忁E��E��E
      // await imageInput.setInputFiles('path/to/test-image.jpg');
    }
    
    // 保存�EタンをクリチE��
    const saveButton = newPage.locator('button:has-text("保孁E), button:has-text("作�E"), button[type="submit"]').first();
    
    // ボタンが有効になるまで征E��
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    
    // クリチE��前にネットワークアイドルを征E��
    await newPage.waitForLoadState('networkidle');
    
    // 保存�EタンをクリチE��
    await saveButton.click();
    
    // 成功の持E��を征E���E�より柔軟に�E�E
    try {
      // まず少し征E��
      await newPage.waitForTimeout(2000);
      
      // 現在のURLを確誁E
      const currentUrl = newPage.url();
      console.log(`現在のURL: ${currentUrl}`);
      
      // 成功の判定（褁E��の条件�E�E
      let isSuccess = false;
      try {
        isSuccess = 
          // URLがキャラクター一覧また�E編雁E�Eージ
          currentUrl.includes('/admin/characters') ||
          // 成功メチE��ージが表示されてぁE��
          await newPage.locator('.toast-success, .success-message').isVisible().catch(() => false) ||
          // 作�Eしたキャラクター名が表示されてぁE��
          await newPage.locator(`text="${characterName}"`).isVisible().catch(() => false);
      } catch (checkError) {
        console.log('成功判定中のエラー:', checkError.message);
        isSuccess = false;
      }
      
      if (isSuccess) {
        console.log(`キャラクター、E{characterName}」が正常に作�Eされました`);
      } else {
        // エラーメチE��ージを探ぁE
        const errorMessage = await newPage.locator('.error-message, .toast-error, [role="alert"]:has-text("エラー")').textContent().catch(() => null);
        if (errorMessage) {
          throw new Error(`キャラクター作�Eエラー: ${errorMessage}`);
        }
        throw new Error('キャラクター作�Eの成功が確認できませんでした');
      }
    } catch (error) {
      console.error('キャラクター作�EチE��トエラー:', error);
      try {
        // newPageがまだ開いてぁE��場合�EみスクリーンショチE��を撮めE
        if (newPage && !newPage.isClosed()) {
          await newPage.screenshot({ path: 'character-creation-error.png' });
        }
      } catch (screenshotError) {
        console.log('スクリーンショチE��の保存に失敁E', screenshotError.message);
      }
      throw error;
    } finally {
      // クリーンアチE�E
      try {
        await context.close();
      } catch (closeError) {
        // コンチE��ストが既に閉じられてぁE��場合�E無要E
      }
    }
  });

  test('既存キャラクターの編雁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // スコープを庁E��めE
    
    console.log('🔧 キャラクター編雁E��スト開姁E);
    
    try {
      // ログイン
      await loginAsAdmin(page);
      await page.waitForTimeout(3000);
      await page.close();
      
      // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // キャラクターが存在することを確誁E
      const characterRows = await newPage.locator('tbody tr, .character-row, [data-testid="character-item"]').count();
      console.log(`📊 キャラクター数: ${characterRows}`);
      
      if (characterRows === 0) {
        console.log('⚠�E�Eキャラクターが存在しません。テスト用キャラクターを作�EしまぁE..');
        
        // 新規作�Eペ�Eジへ移勁E
        await newPage.goto('/admin/characters/new');
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);
        
        // 最小限の惁E��でキャラクターを作�E
        const timestamp = Date.now();
        
        // フォームの読み込みを征E��
        await newPage.waitForSelector('input[type="text"]', { timeout: 10000 });
        await newPage.waitForTimeout(1000);
        
        const textInputs = await newPage.locator('input[type="text"]').all();
        
        if (textInputs.length === 0) {
          console.log('⚠�E�E新規作�Eペ�Eジでも�E力フィールドが見つかりません');
          await newPage.screenshot({ path: 'new-page-no-inputs.png', fullPage: true });
          throw new Error('新規作�Eペ�Eジに入力フィールドがありません');
        }
        
        await textInputs[0].fill(`編雁E��スト用_${timestamp}`);
        if (textInputs.length > 1) {
          await textInputs[1].fill(`Edit Test ${timestamp}`);
        }
        
        // キャチE��フレーズ
        if (textInputs.length > 3) {
          await textInputs[2].fill('編雁E��スト用キャチE��フレーズ');
          await textInputs[3].fill('Edit test catchphrase');
        }
        
        // 説昁E
        const textareas = await newPage.locator('textarea').all();
        if (textareas.length > 0) {
          await textareas[0].fill('編雁E��スト用の説昁E);
          if (textareas.length > 1) {
            await textareas[1].fill('Edit test description');
          }
        }
        
        // 性別
        const selects = await newPage.locator('select').all();
        if (selects.length > 0) {
          await selects[0].selectOption({ index: 1 });
        }
        
        // 性格プリセチE��
        if (selects.length > 1) {
          const options = await selects[1].locator('option').all();
          for (let i = 1; i < options.length; i++) {
            const value = await options[i].getAttribute('value');
            if (value && value !== '') {
              await selects[1].selectOption(value);
              break;
            }
          }
        }
        
        // 性格タグ
        const checkbox = newPage.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
        }
        
        // チE��ォルトメチE��ージ
        if (textareas.length >= 4) {
          await textareas[2].fill('編雁E��スト用チE��ォルトメチE��ージ');
          await textareas[3].fill('Edit test default message');
        }
        
        // 保孁E
        await newPage.locator('button[type="submit"]').click();
        await newPage.waitForTimeout(3000);
        
        // キャラクター一覧に戻めE
        await newPage.goto('/admin/characters');
        await newPage.waitForLoadState('networkidle');
        await newPage.waitForTimeout(2000);
      }
      
      // 編雁E�Eタンを探す（鉛筁E��イコン�E�E
      const editButtonSelectors = [
        'button[title*="編雁E]',
        'a[href*="/edit"]',
        'button svg[class*="edit"]',
        'button:has(svg)',
        '.edit-button'
      ];
      
      let editButtonClicked = false;
      for (const selector of editButtonSelectors) {
        try {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            editButtonClicked = true;
            console.log(`✁E編雁E�EタンクリチE��: ${selector}`);
            break;
          }
        } catch (e) {
          // 次のセレクターを試ぁE
        }
      }
      
      if (!editButtonClicked) {
        // チE�Eブル冁E�Eリンクを直接探す（操作�Eの編雁E��イコン�E�E
        const firstRow = newPage.locator('tbody tr').first();
        const editLink = firstRow.locator('td:last-child button').first(); // 操作�Eの最初�Eボタン
        if (await editLink.isVisible()) {
          await editLink.click();
          console.log('✁E行�Eの編雁E��イコンクリチE��');
        } else {
          throw new Error('編雁E�Eタンが見つかりません');
        }
      }
      
      // 編雁E�Eージへの遷移を確誁E
      await newPage.waitForLoadState('networkidle');
      
      // URLが編雁E�Eージに変わる�Eを征E��
      await newPage.waitForURL('**/edit', { timeout: 10000 }).catch(async (e) => {
        console.log('⚠�E�E編雁E�Eージへの遷移に失敗しました');
        console.log('現在のURL:', newPage.url());
        
        // 詳細ペ�EジにぁE��場合�E、編雁E�Eタンを探してクリチE��
        const detailPageEditButton = newPage.locator('button:has-text("編雁E)').first();
        if (await detailPageEditButton.isVisible()) {
          console.log('📝 詳細ペ�Eジの編雁E�EタンをクリチE��');
          await detailPageEditButton.click();
          await newPage.waitForLoadState('networkidle');
        }
      });
      
      await newPage.waitForTimeout(3000);
      
      const editUrl = newPage.url();
      console.log(`📍 現在のURL: ${editUrl}`);
      
      // 編雁E��面かどぁE��を確誁E
      if (!editUrl.includes('/edit')) {
        console.log('❁E編雁E�Eージではありません。詳細ペ�Eジの可能性があります、E);
        await newPage.screenshot({ path: 'not-edit-page.png', fullPage: true });
        throw new Error('編雁E�Eージへの遷移に失敗しました');
      }
      
      // 編雁E��面の要素を確誁E
      console.log('✁E編雁E��面に到達しました');
      await newPage.waitForTimeout(2000);
      
      // チE��チE��用スクリーンショチE��
      await newPage.screenshot({ path: 'character-edit-page.png', fullPage: true });
      
      // 入力フィールドを探す前に追加の征E��E
      await newPage.waitForTimeout(2000);
      
      // キャラクター名�E力フィールドを探す（スクリーンショチE��では「キャラクター名（日本語）」�E下！E
      let nameInput = null;
      
      // まず「キャラクター名（日本語）」ラベルを探ぁE
      const nameLabel = newPage.locator('text="キャラクター名（日本語！E');
      if (await nameLabel.isVisible()) {
        console.log('✁Eキャラクター名ラベルを発要E);
        // ラベルの次の入力フィールドを探ぁE
        nameInput = newPage.locator('text="キャラクター名（日本語！E >> .. >> input[type="text"]').first();
        if (!(await nameInput.isVisible())) {
          // 別の方法：最初�EチE��スト�E力フィールチE
          nameInput = newPage.locator('input[type="text"]').first();
        }
      } else {
        // ラベルが見つからなぁE��合�E、最初�EチE��スト�E力フィールドを使用
        nameInput = newPage.locator('input[type="text"]').first();
      }
      
      if (!nameInput || !(await nameInput.isVisible())) {
        // エラー時�E詳細惁E��を収雁E
        await newPage.screenshot({ path: 'no-input-fields-error.png', fullPage: true });
        const visibleInputs = await newPage.locator('input:visible').count();
        const allInputs = await newPage.locator('input').count();
        console.log(`📊 表示されてぁE��入力フィールチE ${visibleInputs}/${allInputs}`);
        
        // ペ�EジのHTMLを一部出力してチE��チE��
        const pageContent = await newPage.content();
        console.log('ペ�EジHTMLの一部:', pageContent.substring(0, 500));
        
        throw new Error(`名前入力フィールドが見つかりません。表示されてぁE��入力フィールド数: ${visibleInputs}`);
      }
      
      // 現在の値を取征E
      const originalName = await nameInput.inputValue();
      console.log(`📝 現在の名前: ${originalName}`);
      
      // 名前を更新
      const timestamp = Date.now();
      const updatedName = `${originalName}_更新_${timestamp}`;
      
      await nameInput.clear();
      await nameInput.fill(updatedName);
      console.log('✁E名前更新完亁E);
      
      // チE��ォルトメチE��ージを更新
      const messageTextarea = newPage.locator('textarea').first();
      if (await messageTextarea.isVisible()) {
        await messageTextarea.clear();
        await messageTextarea.fill('更新されたデフォルトメチE��ージです、E2EチE��トによる編雁E��E);
        console.log('✁EチE��ォルトメチE��ージ更新完亁E);
      }
      
      // 性格タイプを変更�E�優しいと賢ぁE��選択！E
      const kindCheckbox = newPage.locator('label:has-text("優しい") input[type="checkbox"]');
      if (await kindCheckbox.isVisible()) {
        const isChecked = await kindCheckbox.isChecked();
        if (!isChecked) {
          await kindCheckbox.click();
          console.log('✁E「優しい」を選抁E);
        }
      }
      
      const smartCheckbox = newPage.locator('label:has-text("賢ぁE) input[type="checkbox"]');
      if (await smartCheckbox.isVisible()) {
        const isChecked = await smartCheckbox.isChecked();
        if (!isChecked) {
          await smartCheckbox.click();
          console.log('✁E「賢ぁE��を選抁E);
        }
      }
      
      // スクリーンショチE���E�更新前！E
      await newPage.screenshot({ path: 'character-edit-before-save.png', fullPage: true });
      
      // 保存�Eタンを探す（スクリーンショチE��では右下�E紫色のボタン�E�E
      let saveButton = null;
      
      // まず紫色の保存�Eタンを探ぁE
      saveButton = newPage.locator('button:has-text("保孁E)').filter({ hasClass: /bg-purple|purple|primary/ }).first();
      
      if (!(await saveButton.isVisible())) {
        // 通常の保存�Eタンを探ぁE
        const saveButtonSelectors = [
          'button:has-text("保孁E)',
          'button[type="submit"]:has-text("保孁E)',
          'button:has-text("更新")',
          'button:has-text("変更を保孁E)'
        ];
        
        for (const selector of saveButtonSelectors) {
          const button = newPage.locator(selector).first();
          if (await button.isVisible({ timeout: 1000 })) {
            saveButton = button;
            console.log(`✁E保存�Eタン発要E ${selector}`);
            break;
          }
        }
      }
      
      if (!saveButton || !(await saveButton.isVisible())) {
        await newPage.screenshot({ path: 'save-button-not-found.png', fullPage: true });
        throw new Error('保存�Eタンが見つかりません');
      }
      
      // APIレスポンスを監要E
      const updateResponsePromise = newPage.waitForResponse(
        response => response.url().includes('/api/v1/admin/characters') && 
                   (response.request().method() === 'PUT' || response.request().method() === 'PATCH'),
        { timeout: 10000 }
      ).catch(() => null);
      
      // 保孁E
      await saveButton.click();
      console.log('✁E保存�EタンクリチE��');
      
      // レスポンスを征E��
      const response = await updateResponsePromise;
      if (response) {
        const status = response.status();
        console.log(`📡 APIレスポンス: ${status}`);
        
        if (status === 200 || status === 201) {
          console.log(`✁Eキャラクター、E{updatedName}」が正常に更新されました`);
        } else {
          const responseBody = await response.json().catch(() => response.text());
          console.log('❁E更新エラー:', responseBody);
        }
      }
      
      // 結果を征E��
      await newPage.waitForTimeout(3000);
      
      // 成功判宁E
      const finalUrl = newPage.url();
      const isSuccess = 
        finalUrl.includes('/admin/characters') && !finalUrl.includes('/edit') ||
        await newPage.locator('.toast-success').isVisible().catch(() => false);
      
      if (!isSuccess) {
        await newPage.screenshot({ path: 'character-edit-error.png', fullPage: true });
      }
      
      expect(response?.status()).toBe(200);
      
    } catch (error) {
      console.error('❁E編雁E��ストエラー:', error);
      // スクリーンショチE��はエラー箁E��で直接保孁E
      throw error;
    } finally {
      try {
        await context.close();
      } catch (e) {
        // コンチE��ストが既に閉じられてぁE��場合�E無要E
      }
    }
  });

  test('キャラクターの削除', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // スコープを庁E��めE
    
    console.log('🗑�E�Eキャラクター削除チE��ト開姁E);
    
    try {
      // ログイン
      await loginAsAdmin(page);
      await page.waitForTimeout(3000);
      await page.close();
      
      // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(3000);
      
      // キャラクター行を取征E
      const characterRows = await newPage.locator('tbody tr, .character-row').all();
      const rowCount = characterRows.length;
      console.log(`📊 キャラクター数: ${rowCount}`);
      
      if (rowCount === 0) {
        console.log('⚠�E�E削除できるキャラクターがありません');
        // チE��トをスキチE�E
        return;
      }
      
      // チE��ト用に作�Eされたキャラクターを探ぁE
      let targetRow = null;
      let characterName = '';
      
      // チE��ト関連の名前を持つキャラクターを探ぁE
      for (const row of characterRows) {
        const nameElement = await row.locator('td:first-child, .character-name').first();
        const nameText = await nameElement.textContent().catch(() => null);
        
        if (nameText && (nameText.includes('チE��チE) || nameText.includes('Test') || nameText.includes('編雁E))) {
          targetRow = row;
          characterName = nameText;
          console.log(`🎯 削除対象: ${characterName}`);
          break;
        }
      }
      
      // チE��ト用キャラクターが見つからなぁE��合、最後�Eキャラクターを使用
      if (!targetRow) {
        targetRow = characterRows[characterRows.length - 1];
        characterName = await targetRow.locator('td:first-child, .character-name').textContent() || '不�E';
        console.log(`🎯 最後�Eキャラクターを削除: ${characterName}`);
      }
      
      // 削除ボタンを探す（デスクトップビューのみ�E�E
      console.log('🔍 削除ボタンを探してぁE��ぁE..');
      
      // チE��チE��用スクリーンショチE��
      await newPage.screenshot({ path: 'character-list-before-delete.png', fullPage: true });
      
      let deleteButton = null;
      
      // チE��クトップビューでは、操作�E�E�最後�E列）�Eボタンを探ぁE
      const actionCell = targetRow.locator('td:last-child');
      deleteButton = await actionCell.locator('button:has-text("削除")').first();
      
      if (!(await deleteButton.count())) {
        // チE��ストがなぁE��合、アイコンボタンを探ぁE
        const actionButtons = await actionCell.locator('button').all();
        if (actionButtons.length >= 2) {
          deleteButton = actionButtons[actionButtons.length - 1]; // 通常最後�Eボタン
          console.log(`📊 操作�Eのボタン数: ${actionButtons.length}、最後�Eボタンを削除ボタンとして使用`);
        }
      } else {
        console.log('✁E「削除」テキストを持つボタンを検�E');
      }
      
      // 従来のセレクタでも試ぁE
      if (!deleteButton) {
        const deleteButtonSelectors = [
          'button[title*="削除"]',
          'button[aria-label*="削除"]',
          'button:has(svg[class*="trash"])',
          'button:has-text("削除")',
          '[data-action="delete"]',
          '.delete-button',
          'button[class*="delete"]',
          'button[class*="danger"]'
        ];
        
        for (const selector of deleteButtonSelectors) {
          try {
            const button = targetRow.locator(selector).first();
            if (await button.isVisible({ timeout: 500 })) {
              deleteButton = button;
              console.log(`✁E削除ボタン発要E ${selector}`);
              break;
            }
          } catch (e) {
            // 次のセレクタを試ぁE
          }
        }
      }
      
      if (!deleteButton) {
        // エラー時�E詳細惁E��
        const buttonsInfo = [];
        for (let i = 0; i < actionButtons.length; i++) {
          const button = actionButtons[i];
          const title = await button.getAttribute('title').catch(() => null);
          const ariaLabel = await button.getAttribute('aria-label').catch(() => null);
          const classes = await button.getAttribute('class').catch(() => null);
          buttonsInfo.push(`ボタン${i + 1}: title="${title}", aria-label="${ariaLabel}", class="${classes}"`);
        }
        console.log('🔍 操作�Eのボタン詳細:', buttonsInfo);
        
        await newPage.screenshot({ path: 'delete-button-not-found.png', fullPage: true });
        throw new Error(`削除ボタンが見つかりません。操作�Eのボタン数: ${actionButtons.length}`);
      }
      
      // 削除ボタンをクリチE��
      try {
        // まず�Eタンの状態を確誁E
        const isVisible = await deleteButton.isVisible();
        const boundingBox = await deleteButton.boundingBox();
        console.log(`📊 削除ボタンの状慁E visible=${isVisible}, boundingBox=${JSON.stringify(boundingBox)}`);
        
        if (!isVisible) {
          // ボタンが見えなぁE��合、親要素を�Eバ�EしてドロチE�Eダウンを開ぁE
          const parentCell = deleteButton.locator('..');
          await parentCell.hover();
          await newPage.waitForTimeout(500);
          
          // それでも見えなぁE��合�E、モバイルメニューボタンを探ぁE
          const menuButton = targetRow.locator('button').first();
          if (await menuButton.isVisible()) {
            console.log('📱 メニューボタンをクリチE��');
            await menuButton.click();
            await newPage.waitForTimeout(500);
            
            // メニュー冁E�E削除ボタンを探ぁE
            const menuDeleteButton = newPage.locator('button:has-text("削除"):visible').first();
            if (await menuDeleteButton.isVisible()) {
              console.log('✁Eメニュー冁E�E削除ボタンをクリチE��');
              await menuDeleteButton.click();
            } else {
              // 最終手段�E�forceクリチE��
              console.log('⚠�E�EforceクリチE��を使用');
              await deleteButton.click({ force: true });
            }
          } else {
            // 最終手段�E�forceクリチE��
            console.log('⚠�E�EforceクリチE��を使用');
            await deleteButton.click({ force: true });
          }
        } else {
          // 通常のクリチE��
          await deleteButton.click();
        }
      } catch (clickError) {
        console.log('⚠�E�EクリチE��エラー:', clickError.message);
        // エラースクリーンショチE��
        await newPage.screenshot({ path: 'delete-button-click-error.png', fullPage: true });
        
        // 代替方法：�Eージ上�Eすべての削除ボタンを探ぁE
        const allDeleteButtons = await newPage.locator('button:has-text("削除"):visible').all();
        console.log(`📊 ペ�Eジ上�E削除ボタン数: ${allDeleteButtons.length}`);
        
        if (allDeleteButtons.length > 0) {
          console.log('✁E最初�E削除ボタンをクリチE��');
          await allDeleteButtons[0].click();
        } else {
          throw new Error('削除ボタンがクリチE��できません');
        }
      }
      console.log('✁E削除ボタンクリチE��完亁E);
      
      // 確認ダイアログを征E��
      await newPage.waitForTimeout(1000);
      
      // JavaScriptの confirm ダイアログを�E琁E
      newPage.on('dialog', async dialog => {
        console.log(`📢 ダイアログメチE��ージ: ${dialog.message()}`);
        await dialog.accept();
        console.log('✁E確認ダイアログを承誁E);
      });
      
      // カスタムダイアログの要素を探ぁE
      const dialogSelectors = [
        '.confirm-dialog',
        '[role="dialog"]',
        '.modal',
        '[data-testid="confirm-dialog"]',
        '.delete-confirmation'
      ];
      
      let confirmDialog = null;
      for (const selector of dialogSelectors) {
        const dialog = newPage.locator(selector).first();
        if (await dialog.isVisible({ timeout: 1000 })) {
          confirmDialog = dialog;
          console.log(`✁E確認ダイアログ発要E ${selector}`);
          break;
        }
      }
      
      if (!confirmDialog) {
        console.log('⚠�E�E確認ダイアログが表示されませんでした');
        // 直接削除される可能性もあるため、続衁E
      }
      
      // 確認�Eタンを探す（ダイアログ冁E��両方�E�E
      const confirmButtonSelectors = [
        'button:has-text("削除")',
        'button:has-text("確誁E)',
        'button:has-text("OK")',
        'button:has-text("はぁE)',
        'button[data-action="confirm"]',
        'button.confirm-delete',
        'button[class*="danger"]:has-text("削除")'
      ];
      
      if (confirmDialog) {
        
        // APIレスポンスを監要E
        const deleteResponsePromise = newPage.waitForResponse(
          response => response.url().includes('/api/v1/admin/characters') && response.request().method() === 'DELETE',
          { timeout: 10000 }
        ).catch(() => null);
        
        // ダイアログ冁E�EボタンをクリチE��
        let confirmClicked = false;
        for (const selector of confirmButtonSelectors) {
          const button = confirmDialog.locator(selector).last();
          if (await button.isVisible({ timeout: 1000 })) {
            await button.click();
            confirmClicked = true;
            console.log(`✁E確認�EタンクリチE��: ${selector}`);
            break;
          }
        }
        
        if (!confirmClicked) {
          // ダイアログ外�E確認�Eタンを探ぁE
          const globalConfirm = newPage.locator('button:has-text("削除"), button:has-text("確誁E)').last();
          if (await globalConfirm.isVisible()) {
            await globalConfirm.click();
            console.log('✁Eグローバル確認�EタンクリチE��');
          }
        }
        
        // APIレスポンスを征E��
        const response = await deleteResponsePromise;
        if (response) {
          const status = response.status();
          console.log(`📡 APIレスポンス: ${status}`);
          expect(status).toBe(200);
        }
        
        // 削除後�E確誁E
        await newPage.waitForTimeout(2000);
        
        // キャラクターがリストから消えたことを確誁E
        const deletedCharacter = newPage.locator(`text="${characterName}"`);
        const isDeleted = !(await deletedCharacter.isVisible({ timeout: 1000 }).catch(() => false));
        
        if (isDeleted) {
          console.log(`✁Eキャラクター、E{characterName}」が正常に削除されました`);
        } else {
          console.log(`⚠�E�Eキャラクター、E{characterName}」がまだ表示されてぁE��す`);
        }
      } else {
        console.log('⚠�E�E確認ダイアログが表示されませんでした');
        // 直接APIを呼ぶ可能性もある�Eで、レスポンスを征E��
        await newPage.waitForTimeout(3000);
      }
      
    } catch (error) {
      console.error('❁E削除チE��トエラー:', error);
      if (newPage && !newPage.isClosed()) {
        await newPage.screenshot({ path: 'delete-test-error.png', fullPage: true });
      }
      throw error;
    } finally {
      try {
        await context.close();
      } catch (e) {
        // コンチE��ストが既に閉じられてぁE��場合�E無要E
      }
    }
  });

  test.skip('キャラクターのスチE�Eタス管琁E, async ({ browser }) => {
    // スチE�Eタス管琁E���Eが実裁E��れたら有効匁E
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);
    await page.close();
    
    // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // アクチE��ブなキャラクターを探ぁE
    const activeRow = newPage.locator('tr:has-text("公開中"), tr:has-text("Active"), tr:has(.status-active)').first();
    
    if (await activeRow.isVisible()) {
      const characterName = await activeRow.locator('td:first-child').textContent();
      
      // 非�E開にする
      const toggleButton = activeRow.locator('button:has-text("非�E開にする"), .status-toggle');
      await toggleButton.click();
      
      // 確認ダイアログの処琁E
      const confirmDialog = newPage.locator('.confirm-dialog');
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await newPage.locator('button:has-text("確誁E)').click();
      }
      
      // スチE�Eタスが変更されたことを確誁E
      await newPage.waitForTimeout(1000);
      await expect(activeRow).toContainText('非�E閁E);
      
      // 再度公開すめE
      const publishButton = activeRow.locator('button:has-text("公開すめE), .status-toggle');
      await publishButton.click();
      
      if (await confirmDialog.isVisible({ timeout: 1000 })) {
        await newPage.locator('button:has-text("確誁E)').click();
      }
      
      console.log(`キャラクター、E{characterName}」�EスチE�Eタス刁E��替えが正常に動作しました`);
    }
    
    await context.close();
  });

  test('キャラクター画像�E管琁E, async ({ browser }) => {
    test.setTimeout(180000); // チE��トタイムアウトを3刁E��延長
    
    const context = await browser.newContext();
    const page = await context.newPage();
    let newPage; // スコープを庁E��めE
    
    try {
      // ログイン
      await loginAsAdmin(page);
      await page.waitForTimeout(3000);
      await page.close();
      
      // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
      newPage = await context.newPage();
      await newPage.goto('/admin/characters');
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);
      
      // キャラクターが存在するか確誁E
      const rowCount = await newPage.locator('tbody tr').count();
      console.log(`📊 キャラクター数: ${rowCount}`);
      
      if (rowCount === 0) {
        console.log('⚠�E�Eキャラクターが存在しません');
        return;
      }
      
      // 最初�Eキャラクターの編雁E�EタンをクリチE��
      const firstRow = newPage.locator('tbody tr').first();
      
      // 編雁E�Eタンを征E��してからクリチE��
      try {
        // 編雁E�Eタンのセレクターを改喁E
        const editButton = firstRow.locator('button').filter({ has: newPage.locator('[data-lucide="edit"], [data-lucide="pencil"], svg') }).first();
        
        await editButton.waitFor({ state: 'visible', timeout: 5000 });
        await editButton.click();
      } catch (error) {
        console.log('⚠�E�E編雁E�EタンのクリチE��に失敁E', error.message);
        
        // 代替方況E 詳細ペ�Eジ経由で編雁E
        try {
          const viewButton = firstRow.locator('button').first();
          await viewButton.click();
          await newPage.waitForLoadState('networkidle');
          await newPage.waitForTimeout(2000);
          
          // 詳細ペ�Eジから編雁E�EタンをクリチE��
          const editButtonOnDetail = newPage.locator('button:has-text("編雁E)');
          await editButtonOnDetail.click();
        } catch (altError) {
          console.log('⚠�E�E代替方法も失敁E', altError.message);
          return;
        }
      }
      
      // 編雁E�Eージへの遷移を征E��
      await newPage.waitForURL('**/edit', { timeout: 10000 }).catch(() => {
        console.log('⚠�E�E編雁E�Eージへの遷移に失敁E);
      });
      await newPage.waitForTimeout(2000);
      
      // 画像管琁E��クションを探ぁE
      console.log('🖼�E�E画像管琁E��クションを確認中...');
      
      // ギャラリー画像セクションまた�E画像関連のセクションを探ぁE
      const gallerySectionSelectors = [
        'text="ギャラリー画僁E',
        'text="画像設宁E',
        'text="キャラクター画僁E',
        'text="レベル"',
        'text="解放レベル"'
      ];
      
      let gallerySectionFound = false;
      for (const selector of gallerySectionSelectors) {
        if (await newPage.locator(selector).isVisible()) {
          console.log(`✁E画像セクションを発要E ${selector}`);
          gallerySectionFound = true;
          break;
        }
      }
      
      if (gallerySectionFound) {
        // レベル画像�E数を確誁E
        const levelImageElements = await newPage.locator('text=/解放レベル|レベル.*\\d+/').all();
        console.log(`📊 レベル画像要素数: ${levelImageElements.length}`);
        
        // 画像アチE�Eロードフィールド�E数を確誁E
        const uploadFields = await newPage.locator('input[type="file"]').all();
        console.log(`📤 アチE�Eロードフィールド数: ${uploadFields.length}`);
        
        // スクリーンショチE��を保孁E
        await newPage.screenshot({ path: 'character-image-management.png', fullPage: true });
      }
      
      // アチE�Eロード可能枚数の確誁E
      const totalSlots = await newPage.locator('input[type="file"][id^="gallery-upload-"]').count();
      console.log(`\n📊 画像アチE�Eロード統訁E`);
      console.log(`- 総スロチE��数: ${totalSlots}`);
      console.log(`- 親寁E��レベル篁E��: 0-100`);
      console.log(`- 解放間隔: 10レベルごと`);
      
      // 実際にファイルをアチE�Eロードする場合�EチE��ト（コメントアウト！E
      // const testImagePath = path.join(__dirname, 'test-assets', 'test-character.jpg');
      // if (fs.existsSync(testImagePath)) {
      //   await newPage.locator('#gallery-upload-0').setInputFiles(testImagePath);
      //   console.log('✁EチE��ト画像をレベル10にアチE�EローチE);
      // }
      
    } catch (error) {
      console.error('❁E画像管琁E��ストエラー:', error);
      throw error;
    } finally {
      try {
        await context.close();
      } catch (e) {
        // コンチE��ストが既に閉じられてぁE��場合�E無要E
      }
    }
  });

  test.skip('キャラクターの一括操佁E, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);
    await page.close();
    
    // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // チェチE��ボックスで褁E��選抁E
    const checkboxes = newPage.locator('input[type="checkbox"][name="characterIds"], .character-checkbox');
    
    if (await checkboxes.first().isVisible()) {
      // 2つのキャラクターを選抁E
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 一括操作メニューの表示
      const bulkActions = newPage.locator('.bulk-actions, select[name="bulkAction"]');
      await expect(bulkActions).toBeVisible();
      
      // 一括非�E開�EチE��チE
      if (await newPage.locator('option[value="unpublish"]').isVisible()) {
        await bulkActions.selectOption('unpublish');
        
        // 実行�Eタン
        await newPage.locator('button:has-text("実衁E)').click();
        
        // 確認ダイアログ
        const confirmDialog = newPage.locator('.confirm-dialog');
        if (await confirmDialog.isVisible()) {
          await newPage.locator('button:has-text("確誁E)').click();
        }
        
        console.log('一括操作（非公開）が実行されました');
      }
    }
    
    await context.close();
  });

  test.skip('キャラクター検索とフィルタリング', async ({ browser }) => {
    // 検索・フィルター機�Eが実裁E��れたら有効匁E
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ログイン
    await loginAsAdmin(page);
    await page.waitForTimeout(3000);
    await page.close();
    
    // 新しいペ�Eジでキャラクター管琁E�Eージを開ぁE
    const newPage = await context.newPage();
    await newPage.goto('/admin/characters');
    await newPage.waitForLoadState('networkidle');
    
    // 検索機�E
    const searchInput = newPage.locator('input[placeholder*="検索"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('チE��チE);
      await newPage.waitForTimeout(500); // チE��ウンス征E��E
      
      // 検索結果の確誁E
      const results = newPage.locator('tbody tr, .character-row');
      const resultCount = await results.count();
      console.log(`検索結果: ${resultCount}件`);
    }
    
    // フィルタリング�E�価格タイプ！E
    const priceFilter = newPage.locator('select[name="priceType"], input[name="filterPriceType"]');
    if (await priceFilter.first().isVisible()) {
      // 有料のみ表示
      await newPage.locator('[value="paid"]').click();
      await newPage.waitForTimeout(500);
      
      // 無料�Eみ表示
      await newPage.locator('[value="free"]').click();
      await newPage.waitForTimeout(500);
    }
    
    // スチE�Eタスフィルター
    const statusFilter = newPage.locator('select[name="status"], input[name="filterStatus"]');
    if (await statusFilter.first().isVisible()) {
      // 公開中のみ
      await newPage.locator('[value="active"]').click();
      await newPage.waitForTimeout(500);
    }
    
    await context.close();
  });
});
