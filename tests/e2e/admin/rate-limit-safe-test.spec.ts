import { test, expect } from '@playwright/test';

test.describe('繝ｬ繝ｼ繝亥宛髯舌ｒ閠・・縺励◆繝・せ繝・, () => {
  // 繝・せ繝磯俣縺ｫ蜊∝・縺ｪ蠕・ｩ滓凾髢薙ｒ險ｭ縺代ｋ
  test.beforeEach(async () => {
    // 蜷・ユ繧ｹ繝医・蜑阪↓3遘貞ｾ・ｩ滂ｼ医Ξ繝ｼ繝亥宛髯舌Μ繧ｻ繝・ヨ・・
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('繝ｬ繝ｼ繝亥宛髯舌ｒ蝗樣∩縺励※繝ｭ繧ｰ繧､繝ｳ', async ({ page }) => {
    console.log('噫 繝ｬ繝ｼ繝亥宛髯仙ｯｾ遲匁ｸ医∩繝・せ繝磯幕蟋・);
    
    // 繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｸ・医ｆ縺｣縺上ｊ・・
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // 霑ｽ蜉縺ｮ蠕・ｩ・
    
    // 繝ｭ繧ｰ繧､繝ｳ諠・ｱ繧貞・蜉・
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.waitForTimeout(500); // 蜈･蜉幃俣髫斐ｒ縺ゅ￠繧・
    
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500);
    
    // API繝ｬ繧ｹ繝昴Φ繧ｹ繧堤屮隕・
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/admin/login')
    );
    
    // 繝ｭ繧ｰ繧､繝ｳ
    await page.click('button[type="submit"]');
    
    // 繝ｬ繧ｹ繝昴Φ繧ｹ繧堤｢ｺ隱・
    const response = await responsePromise;
    console.log('API繝ｬ繧ｹ繝昴Φ繧ｹ:', response.status());
    
    if (response.status() === 429) {
      console.log('笶・繝ｬ繝ｼ繝亥宛髯舌お繝ｩ繝ｼ');
      const headers = response.headers();
      console.log('Retry-After:', headers['retry-after']);
      console.log('X-RateLimit-Reset:', headers['x-ratelimit-reset']);
      
      // 繧ｨ繝ｩ繝ｼ蜀・ｮｹ繧定｡ｨ遉ｺ
      const body = await response.json();
      console.log('繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:', body);
      
      throw new Error('繝ｬ繝ｼ繝亥宛髯舌↓驕斐＠縺ｾ縺励◆縲・ISABLE_RATE_LIMIT=true 縺ｧ繝舌ャ繧ｯ繧ｨ繝ｳ繝峨ｒ襍ｷ蜍輔＠縺ｦ縺上□縺輔＞縲・);
    }
    
    // 繝繝・す繝･繝懊・繝峨∈縺ｮ驕ｷ遘ｻ繧貞ｾ・▽
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('笨・繝ｭ繧ｰ繧､繝ｳ謌仙粥');
    
    // 蜊∝・縺ｪ蠕・ｩ・
    await page.waitForTimeout(5000);
    
    // 繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｸ
    await page.evaluate(() => {
      window.location.href = '/admin/characters/new';
    });
    
    await page.waitForURL('**/admin/characters/new', { timeout: 10000 });
    console.log('笨・繧ｭ繝｣繝ｩ繧ｯ繧ｿ繝ｼ菴懈・繝壹・繧ｸ縺ｫ蛻ｰ驕・);
    
    // 繝輔か繝ｼ繝遒ｺ隱・
    const hasForm = await page.locator('input[type="text"]').count() > 0;
    expect(hasForm).toBeTruthy();
  });
});
