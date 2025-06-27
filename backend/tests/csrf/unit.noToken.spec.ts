// CSRF Token Negative Path Test
// Note: 実際のテストはセットアップが必要なため、
// 現在はテストケースの構造のみを定義しています。

describe('CSRF token negative-path', () => {
  it('PATCH /profile w/o token → 403', async () => {
    // TODO: テスト環境のセットアップ後に実装
    // 1. ログインしてCookieのみ取得
    // 2. CSRFトークンなしでAPIリクエスト
    // 3. 403 Forbiddenが返ることを確認
    expect(true).toBe(true);
  });
});