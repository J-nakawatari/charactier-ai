# E2Eテストの実行方法

## 環境変数の設定

MongoDB AtlasなどのクラウドDBを使用する場合は、環境変数`TEST_MONGODB_URI`を設定してください：

```bash
# 環境変数を設定してテストを実行（以下は例です - 実際の値に置き換えてください）
export TEST_MONGODB_URI="mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_TEST_DB"
npm run test:e2e
```

または、一時的に設定する場合：

```bash
# 以下は例です - 実際の値に置き換えてください
TEST_MONGODB_URI="mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_TEST_DB" npm run test:e2e
```

**注意**: 
- `YOUR_USERNAME`, `YOUR_PASSWORD`, `YOUR_CLUSTER`, `YOUR_TEST_DB` は実際の値に置き換えてください
- これらは**プレースホルダー**であり、実際の認証情報ではありません

## ローカルMongoDBを使用する場合

環境変数を設定しない場合は、自動的にローカルのMongoDB（`mongodb://localhost:27017/charactier_test`）に接続を試みます。

## セキュリティに関する注意

- **絶対に**実際の認証情報をREADMEやコードに記載しないでください
- **絶対に**認証情報を`.env.test`ファイルに直接記載しないでください
- 本番環境のDBを使用しないでください（テスト用のデータベースを使用）
- CI/CDでは、シークレットとして環境変数を設定してください
- 認証情報は必ず環境変数やシークレット管理ツールを使用してください
- コミット前に`gitleaks`などのツールで認証情報の漏洩をチェックしてください

## 特定のテストファイルを実行

```bash
# 特定のテストファイルのみ実行
npx playwright test tests/e2e/admin/charactermanagement/character-crud-operations.spec.ts

# ブラウザを指定して実行
npx playwright test --project=chromium

# デバッグモードで実行
npx playwright test --debug
```