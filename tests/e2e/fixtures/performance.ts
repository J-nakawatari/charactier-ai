import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  navigationStart: number;
  loadEventEnd: number;
  domContentLoadedEventEnd: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  totalLoadTime: number;
  domContentLoadedTime: number;
}

export class PerformanceHelper {
  constructor(private page: Page) {}

  // ページロードのパフォーマンスを計測
  async measurePageLoad(url: string): Promise<PerformanceMetrics> {
    // パフォーマンス計測を開始
    await this.page.goto(url, { waitUntil: 'networkidle' });

    // Navigation Timing APIからメトリクスを取得
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      // LCPを取得
      let largestContentfulPaint: number | undefined;
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
      }

      return {
        navigationStart: navigation.startTime,
        loadEventEnd: navigation.loadEventEnd,
        domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
        firstPaint: firstPaint?.startTime,
        firstContentfulPaint: firstContentfulPaint?.startTime,
        largestContentfulPaint,
        totalLoadTime: navigation.loadEventEnd - navigation.startTime,
        domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.startTime,
      };
    });

    return metrics;
  }

  // APIレスポンスタイムを計測
  async measureAPIResponse(apiCall: () => Promise<any>): Promise<number> {
    const startTime = Date.now();
    await apiCall();
    const endTime = Date.now();
    return endTime - startTime;
  }

  // メモリ使用量を計測
  async measureMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
  }

  // パフォーマンス閾値をチェック
  checkPerformanceThresholds(metrics: PerformanceMetrics, thresholds: Partial<PerformanceMetrics>): boolean {
    for (const [key, threshold] of Object.entries(thresholds)) {
      const actualValue = (metrics as any)[key];
      if (actualValue && threshold && actualValue > threshold) {
        console.error(`Performance threshold exceeded for ${key}: ${actualValue}ms > ${threshold}ms`);
        return false;
      }
    }
    return true;
  }

  // パフォーマンスレポートを生成
  generatePerformanceReport(metrics: PerformanceMetrics): string {
    return `
Performance Report:
==================
Total Load Time: ${metrics.totalLoadTime.toFixed(2)}ms
DOM Content Loaded: ${metrics.domContentLoadedTime.toFixed(2)}ms
First Paint: ${metrics.firstPaint?.toFixed(2) || 'N/A'}ms
First Contentful Paint: ${metrics.firstContentfulPaint?.toFixed(2) || 'N/A'}ms
Largest Contentful Paint: ${metrics.largestContentfulPaint?.toFixed(2) || 'N/A'}ms
    `.trim();
  }
}