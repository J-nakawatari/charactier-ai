# 本番環境502エラー修正手順

## エラー内容
- `/api/auth/login` → 502 Bad Gateway
- `/api/system-settings/google-analytics` → 502 Bad Gateway
- レスポンスがHTMLになっている（JSONではない）

## 原因
バックエンドサーバーがダウンしているか、依存関係（Winston）がインストールされていない

## 修正手順

### 1. SSHで本番サーバーにログイン

### 2. バックエンドの状態確認
```bash
sudo systemctl status charactier-backend
```

### 3. ログを確認
```bash
sudo journalctl -u charactier-backend -n 100
```

### 4. 依存関係のインストール
```bash
cd /var/www/charactier-ai/backend
npm install
```

### 5. ビルド実行
```bash
npm run build
```

### 6. サービス再起動
```bash
sudo systemctl restart charactier-backend
```

### 7. 状態確認
```bash
sudo systemctl status charactier-backend
```

### 8. テスト
```bash
curl http://localhost:5000/api/health
```

## 今後の対策
- post-mergeフックを`.git/hooks/`に追加済み
- 次回からは自動的に`npm install`が実行される