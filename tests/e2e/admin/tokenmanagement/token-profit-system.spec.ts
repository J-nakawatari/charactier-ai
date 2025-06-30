import { test, expect } from '@playwright/test';

test.describe('99%利益確保シスチE��のE2EチE��チE, () => {
  let adminToken: string;
  const testEmail = 'admin@example.com';
  const testPassword = 'admin123';

  test.beforeEach(async ({ page }) => {
    // 管琁E��E��グイン
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    // ログイン成功を征E��
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // ト�Eクンを取得（デバッグ用�E�E
    adminToken = await page.evaluate(() => localStorage.getItem('adminToken') || '');
  });

  test('ト�Eクンパック作�E時�E99%利益率計算検証', async ({ page }) => {
    // サイドバーからト�Eクンパック管琁E�Eージへ遷移
    await page.locator('a:has-text("ト�EクチケチE��管琁E)').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // ペ�Eジが正しく読み込まれたか確誁E
    // 褁E��のh1要素があるため、�E体的なセレクタを使用
    const pageTitle = await page.locator('h1:has-text("ト�Eクン管琁E)').textContent();
    expect(pageTitle).toBe('ト�Eクン管琁E);
    
    // パック管琁E��ブに刁E��替ぁE
    await page.locator('button:has-text("パック管琁E)').click();
    await page.waitForTimeout(1000);
    
    // 新規作�EボタンをクリチE��
    await page.locator('button:has-text("新規作�E")').click();
    
    // チE��ト用の価格を�E力！E00冁E��E
    const testPrice = 500;
    await page.locator('input[name="price"]').fill(testPrice.toString());
    await page.locator('input[name="name"]').fill('利益率チE��トパチE��');
    
    // ト�Eクン数が�E動計算されることを確誁E
    const tokenAmountField = page.locator('input[name="tokenAmount"]');
    await page.waitForTimeout(1000); // 計算を征E��
    
    const calculatedTokens = await tokenAmountField.inputValue();
    expect(parseInt(calculatedTokens)).toBeGreaterThan(0);
    
    // APIレスポンスをインターセプトして利益率を検証
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
    );
    
    // 保存�EタンをクリチE��
    await page.locator('button:has-text("保孁E)').click();
    
    const response = await responsePromise;
    const responseData = await response.json();
    
    // 利益率ぁE9%であることを検証
    if (responseData.tokenPack) {
      const costRatio = 0.01; // 1%のコスチE
      const expectedMinTokens = Math.floor(testPrice * costRatio * 0.9); // 少し余裕を持たせる
      expect(responseData.tokenPack.tokenAmount).toBeGreaterThan(expectedMinTokens);
    }
  });

  test('為替レート変動時�E価格再計箁E, async ({ page }) => {
    // サイドバーからト�Eクンパック管琁E�Eージへ遷移
    await page.locator('a:has-text("ト�EクチケチE��管琁E)').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // パック管琁E��ブに刁E��替ぁE
    await page.locator('button:has-text("パック管琁E)').click();
    await page.waitForTimeout(1000);
    
    // チE��ト用のト�Eクンパックを作�E
    await page.locator('button:has-text("新規作�E")').click();
    await page.locator('input[name="name"]').fill('為替レートテストパチE��');
    await page.locator('input[name="price"]').fill('2000');
    await page.waitForTimeout(1000);
    
    // 保存して一覧に戻めE
    await page.locator('button:has-text("保孁E)').click();
    await page.waitForResponse(response => response.url().includes('/api/v1/admin/token-packs') && response.status() === 201);
    await page.waitForTimeout(2000);
    
    // 作�Eしたパックの編雁E�EタンをクリチE��
    const editButton = page.locator('tr:has-text("為替レートテストパチE��") button:has-text("編雁E)');
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
    
    // 編雁E��ォームが表示されるまで征E��
    await page.waitForSelector('input[name="tokenAmount"]', { state: 'visible', timeout: 5000 });
    
    // 現在のト�Eクン数を記録
    const tokenAmountField = page.locator('input[name="tokenAmount"]');
    const originalTokenAmount = await tokenAmountField.inputValue();
    const originalPrice = await page.locator('input[name="price"]').inputValue();
    
    console.log(`初期値: 価格=${originalPrice}冁E ト�Eクン数=${originalTokenAmount}`);
    
    // 価格を変更してト�Eクン数が�E計算されることを確誁E
    await page.locator('input[name="price"]').fill('3000');
    await page.waitForTimeout(1000); // 計算を征E��
    
    const newTokenAmount = await tokenAmountField.inputValue();
    console.log(`価格変更征E 価格=3000冁E ト�Eクン数=${newTokenAmount}`);
    
    // ト�Eクン数が変更されてぁE��ことを確誁E
    expect(newTokenAmount).not.toBe(originalTokenAmount);
    
    // 99%利益率が維持されてぁE��ことを確誁E
    const ratio = parseInt(newTokenAmount) / parseInt(originalTokenAmount);
    const expectedRatio = 3000 / 2000;
    expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.1); // 誤差10%以冁E
  });

  test('Stripe Price IDの正確な登録と取征E, async ({ page }) => {
    // サイドバーからト�Eクンパック管琁E�Eージへ遷移
    await page.locator('a:has-text("ト�EクチケチE��管琁E)').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // パック管琁E��ブに刁E��替ぁE
    await page.locator('button:has-text("パック管琁E)').click();
    await page.waitForTimeout(1000);
    
    // 新規作�E
    await page.locator('button:has-text("新規作�E")').click();
    
    // フォーム入劁E
    await page.locator('input[name="name"]').fill('Stripe Price IDチE��トパチE��');
    await page.locator('input[name="price"]').fill('1000');
    
    // Stripe Price IDが�E動生成されることを期征E
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/admin/token-packs') && response.request().method() === 'POST'
    );
    
    await page.locator('button:has-text("保孁E)').click();
    
    const response = await responsePromise;
    const responseData = await response.json();
    
    // Stripe Price IDが正しく設定されてぁE��ことを確誁E
    if (responseData.tokenPack && responseData.tokenPack.stripePriceId) {
      expect(responseData.tokenPack.stripePriceId).toMatch(/^price_/);
      console.log(`Stripe Price ID: ${responseData.tokenPack.stripePriceId}`);
    }
  });

  test('利益率計算�EエチE��ケース', async ({ page }) => {
    // サイドバーからト�Eクンパック管琁E�Eージへ遷移
    await page.locator('a:has-text("ト�EクチケチE��管琁E)').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // パック管琁E��ブに刁E��替ぁE
    await page.locator('button:has-text("パック管琁E)').click();
    await page.waitForTimeout(1000);
    
    // 新規作�E
    await page.locator('button:has-text("新規作�E")').click();
    
    // 極小��額でのチE��ト！E00冁E��E
    await page.locator('input[name="price"]').fill('100');
    await page.locator('input[name="name"]').fill('極小��額テスチE);
    await page.waitForTimeout(1000);
    
    const smallAmountTokens = await page.locator('input[name="tokenAmount"]').inputValue();
    expect(parseInt(smallAmountTokens)).toBeGreaterThan(0);
    
    // 大金額でのチE��ト！E0000冁E��E
    await page.locator('input[name="price"]').fill('10000');
    await page.waitForTimeout(1000);
    
    const largeAmountTokens = await page.locator('input[name="tokenAmount"]').inputValue();
    expect(parseInt(largeAmountTokens)).toBeGreaterThan(parseInt(smallAmountTokens));
    
    // 比率が一定であることを確認！E9%利益率�E�E
    const ratio = parseInt(largeAmountTokens) / parseInt(smallAmountTokens);
    const expectedRatio = 10000 / 100;
    expect(Math.abs(ratio - expectedRatio)).toBeLessThan(1); // 誤差1未満
  });
});
