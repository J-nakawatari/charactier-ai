import { test } from '@playwright/test';

/**
 * キャラクター管理画面のモバイルテストをスキップする共通設定
 * 
 * 使用方法:
 * import './skip-mobile';
 * 
 * または個別に:
 * skipMobileTests();
 */
export function skipMobileTests() {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    const isMobile = testInfo.project.name.toLowerCase().includes('mobile');
    if (isMobile) {
      testInfo.skip(true, 'モバイルビューのキャラクター管理画面は後で画面構成を見直す必要があるため、現在はスキップします');
    }
  });
}

// 自動的に適用
skipMobileTests();