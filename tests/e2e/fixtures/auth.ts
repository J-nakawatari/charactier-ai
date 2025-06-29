import { Page, BrowserContext } from '@playwright/test';
import { TestUser } from './test-data';

export class AuthHelper {
  constructor(private page: Page) {}

  // ログイン処理
  async login(user: TestUser) {
    await this.page.goto('/ja/auth/login');
    await this.page.getByLabel('メールアドレス').fill(user.email);
    await this.page.getByLabel('パスワード').fill(user.password);
    await this.page.getByRole('button', { name: 'ログイン' }).click();
    
    // ダッシュボードへの遷移を待つ
    await this.page.waitForURL('/ja/dashboard');
  }

  // ログアウト処理
  async logout() {
    await this.page.getByRole('button', { name: 'ログアウト' }).click();
    await this.page.waitForURL('/ja');
  }

  // 認証状態を確認
  async isLoggedIn(): Promise<boolean> {
    try {
      // ダッシュボードにアクセスしてみる
      await this.page.goto('/ja/dashboard');
      await this.page.waitForLoadState('networkidle');
      
      // リダイレクトされていないか確認
      const url = this.page.url();
      return url.includes('/dashboard');
    } catch {
      return false;
    }
  }

  // 認証状態を保存（セッションストレージとクッキーを保存）
  async saveAuthState(context: BrowserContext): Promise<any> {
    const cookies = await context.cookies();
    const localStorage = await this.page.evaluate(() => {
      const data: any = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          data[key] = window.localStorage.getItem(key);
        }
      }
      return data;
    });

    return { cookies, localStorage };
  }

  // 認証状態を復元
  async restoreAuthState(context: BrowserContext, authState: any) {
    // クッキーを復元
    if (authState.cookies) {
      await context.addCookies(authState.cookies);
    }

    // ローカルストレージを復元
    if (authState.localStorage) {
      await this.page.goto('/'); // ページを開く
      await this.page.evaluate((data) => {
        Object.entries(data).forEach(([key, value]) => {
          if (value) {
            window.localStorage.setItem(key, value as string);
          }
        });
      }, authState.localStorage);
    }
  }
}

// 共通のログイン前処理（beforeEachで使用）
export async function loginAsTestUser(page: Page, user: TestUser) {
  const authHelper = new AuthHelper(page);
  await authHelper.login(user);
}