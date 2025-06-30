# Playwrightセットアップ手順

E2Eテストを実行するためには、Playwrightのブラウザ依存関係をインストールする必要があります。

## 1. 依存関係のインストール

以下のコマンドを実行してください：

```bash
# Playwrightのブラウザをインストール
npx playwright install

# システム依存関係をインストール（sudoパスワードが必要です）
sudo npx playwright install-deps
```

## 2. テストの実行

依存関係がインストールされたら、以下のコマンドでテストを実行できます：

```bash
# 新規ユーザーフローのテストを実行
npx playwright test tests/e2e/user/auth/new-user-complete-flow.spec.ts

# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行（視覚的デバッグ）
npx playwright test --ui
```

## 3. 既に修正済みの内容

- ✅ ホームページのロケール対応（/ja/）
- ✅ 新規登録ボタンのセレクタ修正
- ✅ MongoDB接続エラーのハンドリング
- ✅ global-setup/teardownのエラー処理改善

## 4. トラブルシューティング

### エラー: "Host system is missing dependencies"
これはPlaywrightのブラウザ実行に必要なシステムライブラリが不足している場合に表示されます。
`sudo npx playwright install-deps`を実行してください。

### エラー: "MongoDB接続エラー"
MongoDBが起動していない場合でも、テストは実行可能です。
global-setupがモックデータを使用してテストを続行します。