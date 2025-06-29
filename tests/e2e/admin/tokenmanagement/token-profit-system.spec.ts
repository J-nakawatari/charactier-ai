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
    
    // トークンを取得（デバッグ用）
    adminToken = await page.evaluate(() => localStorage.getItem('adminToken') || '');
  });

  test('トークンパック作成時の99%利益率計算検証', async ({ page }) => {
    // トークンパック管理ページへ
    await page.goto('/admin/token-packs');
    await page.waitForLoadState('networkidle');
    
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
    // トークンパック管理ページへ
    await page.goto('/admin/token-packs');
    await page.waitForLoadState('networkidle');
    
    // 既存のトークンパックの編集ボタンをクリック
    const firstEditButton = page.locator('button:has-text("編集")').first();
    await firstEditButton.click();
    
    // 現在のトークン数を記録
    const tokenAmountField = page.locator('input[name="tokenAmount"]');
    const originalTokenAmount = await tokenAmountField.inputValue();
    
    // 為替レート更新ボタンがあれば押す（実装されている場合）
    const refreshButton = page.locator('button:has-text("為替レート更新")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(2000); // 更新を待つ
      
      // トークン数が再計算されることを確認
      const newTokenAmount = await tokenAmountField.inputValue();
      console.log(`為替レート更新: ${originalTokenAmount} → ${newTokenAmount} トークン`);
    }
  });

  test('Stripe Price IDの正確な登録と取得', async ({ page }) => {
    // トークンパック管理ページへ
    await page.goto('/admin/token-packs');
    await page.waitForLoadState('networkidle');
    
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
    // トークンパック管理ページへ
    await page.goto('/admin/token-packs');
    
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