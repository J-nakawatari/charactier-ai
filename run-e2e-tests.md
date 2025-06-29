# E2Eテスト実行手順

## 1. サーバーを起動
別々のターミナルで以下を実行：

### ターミナル1（バックエンド）
```bash
cd backend
npm run dev
```

### ターミナル2（フロントエンド）
```bash
cd frontend  
npm run dev
```

## 2. サーバーが起動したか確認
- http://localhost:3000 にアクセスして画面が表示されるか確認
- http://localhost:5000/api/v1/health にアクセスして `{"status":"ok"}` が返るか確認

## 3. E2Eテストを実行
新しいターミナルで：

```bash
# ヘッドレスモード（高速）
npm run test:e2e

# ヘッドモード（ブラウザが見える）
npm run test:e2e:headed

# 特定のテストだけ実行
npx playwright test tests/e2e/login.spec.ts --headed
```

## 4. テスト結果を確認
テスト終了後：
```bash
npx playwright show-report
```

## トラブルシューティング

### サーバーが起動しない場合
- ポート3000/5000が使われていないか確認
- `npm install` を両方のディレクトリで実行

### テストが失敗する場合
- スクリーンショットが `test-results/` に保存される
- 動画も `test-results/` に保存される（失敗時のみ）