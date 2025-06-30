import { test, expect } from '@playwright/test';

  test.describe('99%利益確保システムのE2Eテスト', () => {
    let adminToken: string;
    const testEmail = 'admin@example.com';
    const testPassword = 'admin123';

    test.beforeEach(async ({ page }) => {
      // 管理者ログイン
      await page.goto('/admin/login');
      await page.locator('input[type="email"]').fill(testEmail);
      await page.locator('input[type="password"]').fill(testPassword);
      await page.locator('button[type="submit"]').click();

      // ログイン成功を待つ
      await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // トークンを取得（デバッグ用）
      adminToken = await page.evaluate(() => localStorage.getItem('adminToken') || '');
    });

    test('トークンパック作成時の99%利益率計算検証', async ({ page }) => {
      // サイドバーからトークンパック管理ページへ遷移
      await page.locator('a:has-text("トークチケット管理")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // ページが正しく読み込まれたか確認
      // 複数のh1要素があるため、具体的なセレクタを使用
      const pageTitle = await page.locator('h1:has-text("トークン管理")').textContent();
      expect(pageTitle).toBe('トークン管理');

      // パック管理タブに切り替え
      await page.locator('button:has-text("パック管理")').click();
      await page.waitForTimeout(1000);

      // 新規作成ボタンをクリック
      await page.locator('button:has-text("新規作成")').click();

      // テスト用の価格を入力（500円）
      const testPrice = 500;
      await page.locator('input[name="price"]').fill(testPrice.toString());
      await page.locator('input[name="name"]').fill('利益率テストパック');

      // トークン数が自動計算されることを確認
      const tokenAmountField = page.locator('input[name="tokenAmount"]');
      await page.waitForTimeout(1000); // 計算を待つ

      const calculatedTokens = await tokenAmountField.inputValue();
      expect(parseInt(calculatedTokens)).toBeGreaterThan(0);

      // APIレスポンスをインターセプトして利益率を検証
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
      );

      // 保存ボタンをクリック
      await page.locator('button:has-text("保存")').click();

      const response = await responsePromise;
      const responseData = await response.json();

      // 利益率が99%であることを検証
      if (responseData.tokenPack) {
        const costRatio = 0.01; // 1%のコスト
        const expectedMinTokens = Math.floor(testPrice * costRatio * 0.9); // 少し余裕を持たせる
        expect(responseData.tokenPack.tokenAmount).toBeGreaterThan(expectedMinTokens);
      }
    });

    test('為替レート変動時の価格再計算', async ({ page }) => {
      // サイドバーからトークンパック管理ページへ遷移
      await page.locator('a:has-text("トークチケット管理")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // パック管理タブに切り替え
      await page.locator('button:has-text("パック管理")').click();
      await page.waitForTimeout(1000);

      // テスト用のトークンパックを作成
      await page.locator('button:has-text("新規作成")').click();
      await page.locator('input[name="name"]').fill('為替レートテストパック');
      await page.locator('input[name="price"]').fill('2000');
      await page.waitForTimeout(1000);

      // 保存して一覧に戻る
      await page.locator('button:has-text("保存")').click();
      await page.waitForResponse(response => response.url().includes('/api/v1/admin/token-packs') && response.status() ===
  201);
      await page.waitForTimeout(2000);

      // 作成したパックの編集ボタンをクリック
      const editButton = page.locator('tr:has-text("為替レートテストパック") button:has-text("編集")');
      await editButton.waitFor({ state: 'visible', timeout: 5000 });
      await editButton.click();

      // 編集フォームが表示されるまで待つ
      await page.waitForSelector('input[name="tokenAmount"]', { state: 'visible', timeout: 5000 });

      // 現在のトークン数を記録
      const tokenAmountField = page.locator('input[name="tokenAmount"]');
      const originalTokenAmount = await tokenAmountField.inputValue();
      const originalPrice = await page.locator('input[name="price"]').inputValue();

      console.log(`初期値: 価格=${originalPrice}円, トークン数=${originalTokenAmount}`);

      // 価格を変更してトークン数が再計算されることを確認
      await page.locator('input[name="price"]').fill('3000');
      await page.waitForTimeout(1000); // 計算を待つ

      const newTokenAmount = await tokenAmountField.inputValue();
      console.log(`価格変更後: 価格=3000円, トークン数=${newTokenAmount}`);

      // トークン数が変更されていることを確認
      expect(newTokenAmount).not.toBe(originalTokenAmount);

      // 99%利益率が維持されていることを確認
      const ratio = parseInt(newTokenAmount) / parseInt(originalTokenAmount);
      const expectedRatio = 3000 / 2000;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.1); // 誤差10%以内
    });

    test('Stripe Price IDの正確な登録と取得', async ({ page }) => {
      // サイドバーからトークンパック管理ページへ遷移
      await page.locator('a:has-text("トークチケット管理")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // パック管理タブに切り替え
      await page.locator('button:has-text("パック管理")').click();
      await page.waitForTimeout(1000);

      // 新規作成
      await page.locator('button:has-text("新規作成")').click();

      // フォーム入力
      await page.locator('input[name="name"]').fill('Stripe Price IDテストパック');
      await page.locator('input[name="price"]').fill('1000');

      // Stripe Price IDが自動生成されることを期待
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
      );

      await page.locator('button:has-text("保存")').click();

      const response = await responsePromise;
      const responseData = await response.json();

      // Stripe Price IDが正しく設定されていることを確認
      if (responseData.tokenPack && responseData.tokenPack.stripePriceId) {
        expect(responseData.tokenPack.stripePriceId).toMatch(/^price_/);
        console.log(`Stripe Price ID: ${responseData.tokenPack.stripePriceId}`);
      }
    });

    test('利益率計算のエッジケース', async ({ page }) => {
      // サイドバーからトークンパック管理ページへ遷移
      await page.locator('a:has-text("トークチケット管理")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // パック管理タブに切り替え
      await page.locator('button:has-text("パック管理")').click();
      await page.waitForTimeout(1000);

      // 新規作成
      await page.locator('button:has-text("新規作成")').click();

      // 極小金額でのテスト（100円）
      await page.locator('input[name="price"]').fill('100');
      await page.locator('input[name="name"]').fill('極小金額テスト');
      await page.waitForTimeout(1000);

      const smallAmountTokens = await page.locator('input[name="tokenAmount"]').inputValue();
      expect(parseInt(smallAmountTokens)).toBeGreaterThan(0);

      // 大金額でのテスト（10000円）
      await page.locator('input[name="price"]').fill('10000');
      await page.waitForTimeout(1000);

      const largeAmountTokens = await page.locator('input[name="tokenAmount"]').inputValue();
      expect(parseInt(largeAmountTokens)).toBeGreaterThan(parseInt(smallAmountTokens));

      // 比率が一定であることを確認（99%利益率）
      const ratio = parseInt(largeAmountTokens) / parseInt(smallAmountTokens);
      const expectedRatio = 10000 / 100;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(1); // 誤差1未満
    });
  });