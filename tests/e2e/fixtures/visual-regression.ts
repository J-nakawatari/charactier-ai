import { Page, expect } from '@playwright/test';
import * as path from 'path';

export class VisualRegressionHelper {
  private baselineDir: string;
  private diffDir: string;

  constructor() {
    this.baselineDir = path.join(__dirname, '../screenshots/baseline');
    this.diffDir = path.join(__dirname, '../screenshots/diff');
  }

  // スクリーンショットを撮影して比較
  async compareScreenshot(page: Page, name: string, options: any = {}) {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: options.maxDiffPixels || 100,
      threshold: options.threshold || 0.2,
      animations: 'disabled',
      mask: options.mask || [], // 動的な要素をマスク
      fullPage: options.fullPage || false,
    });
  }

  // 特定の要素のスクリーンショットを比較
  async compareElementScreenshot(page: Page, selector: string, name: string, options: any = {}) {
    const element = page.locator(selector);
    await expect(element).toHaveScreenshot(`${name}.png`, {
      maxDiffPixels: options.maxDiffPixels || 100,
      threshold: options.threshold || 0.2,
      animations: 'disabled',
    });
  }

  // モバイルビューポートでのスクリーンショット
  async compareMobileScreenshot(page: Page, name: string) {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await this.compareScreenshot(page, `mobile-${name}`);
  }

  // タブレットビューポートでのスクリーンショット
  async compareTabletScreenshot(page: Page, name: string) {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await this.compareScreenshot(page, `tablet-${name}`);
  }

  // デスクトップビューポートでのスクリーンショット
  async compareDesktopScreenshot(page: Page, name: string) {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
    await this.compareScreenshot(page, `desktop-${name}`);
  }

  // レスポンシブテスト（全デバイスサイズ）
  async compareResponsiveScreenshots(page: Page, name: string) {
    await this.compareMobileScreenshot(page, name);
    await this.compareTabletScreenshot(page, name);
    await this.compareDesktopScreenshot(page, name);
  }
}