import { test, expect, Page } from '@playwright/test';
import { selectors } from './selectors';

// Admin login helper
export async function adminLogin(page: Page) {
  await page.goto('/admin/login');
  await page.locator(selectors.admin.loginEmail).fill('admin@example.com');
  await page.locator(selectors.admin.loginPassword).fill('admin123');
  await page.locator(selectors.admin.loginSubmit).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Safe click helper
export async function safeClick(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 5000 });
  await element.click();
}

// Form fill helper
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [selector, value] of Object.entries(formData)) {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.fill(value.toString());
  }
}

// Success check helper
export async function expectSuccess(page: Page) {
  await expect(page.locator(selectors.common.successToast)).toBeVisible({ timeout: 5000 });
}