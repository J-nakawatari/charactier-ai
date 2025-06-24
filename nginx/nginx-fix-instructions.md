# Nginx設定修正手順

## 1. 主な変更点（diff）

### 重要な変更
```diff
# /api/v1/ location block
- proxy_pass http://localhost:5000/api/v1/;
+ proxy_pass http://localhost:5000;

# /api/auth/ location block (新規追加)
+ location /api/auth/ {
+     proxy_pass http://localhost:5000;
+     ...
+ }
```

### 変更の理由
- **問題**: `proxy_pass`の末尾に`/`があると、リクエストパスから`/api/v1/`が削除されて転送される
  - 例: `/api/v1/characters` → `/characters` (誤り)
- **解決**: 末尾の`/`を削除することで、完全なパスが保持される
  - 例: `/api/v1/characters` → `/api/v1/characters` (正しい)

## 2. 適用手順

### 2.1 設定ファイルのバックアップ
```bash
sudo cp /etc/nginx/sites-available/charactier-ai.conf /etc/nginx/sites-available/charactier-ai.conf.backup-$(date +%Y%m%d-%H%M%S)
```

### 2.2 新しい設定ファイルの配置
```bash
# ローカルからサーバーへコピー（サーバー外から実行）
scp nginx/charactier-ai-fixed.conf user@charactier-ai.com:/tmp/

# サーバー上で実行
sudo cp /tmp/charactier-ai-fixed.conf /etc/nginx/sites-available/charactier-ai.conf
```

### 2.3 設定の検証
```bash
# Nginx設定の文法チェック
sudo nginx -t
```

期待される出力:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 2.4 Nginxのリロード
```bash
# 設定を反映（ダウンタイムなし）
sudo systemctl reload nginx

# ステータス確認
sudo systemctl status nginx
```

## 3. 動作確認コマンド

### 3.1 認証が必要なエンドポイント（401が正常）
```bash
# /api/v1/user/profile - 認証なしで401が返ることを確認
curl -k -I https://charactier-ai.com/api/v1/user/profile

# 期待される結果:
# HTTP/2 401
```

### 3.2 公開エンドポイント（200が正常）
```bash
# /api/v1/characters - 公開APIで200が返ることを確認
curl -k -I https://charactier-ai.com/api/v1/characters

# 期待される結果:
# HTTP/2 200
```

### 3.3 SSEエンドポイント（認証付き）
```bash
# まず認証してCookieを取得
curl -k -c cookies.txt -X POST https://charactier-ai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# SSEエンドポイントをテスト（認証Cookie付き）
curl -k -b cookies.txt -I https://charactier-ai.com/api/v1/notifications/stream

# 期待される結果:
# HTTP/2 200
# content-type: text/event-stream
```

### 3.4 その他の重要なエンドポイント
```bash
# Google Analytics設定（公開API）
curl -k -I https://charactier-ai.com/api/v1/system-settings/google-analytics

# 認証API
curl -k -I -X POST https://charactier-ai.com/api/auth/login

# Webhook（405 Method Not Allowedが正常）
curl -k -I https://charactier-ai.com/webhook/stripe
```

## 4. ブラウザでの確認

1. Chrome DevToolsを開く（F12）
2. Networkタブを選択
3. https://charactier-ai.com にアクセス
4. Consoleタブで404エラーが出ていないことを確認
5. Networkタブで以下を確認:
   - `/api/v1/characters` → 200 OK
   - `/api/v1/system-settings/google-analytics` → 200 OK
   - `/api/auth/login` → 405 (GETの場合) または 400 (POSTで認証情報なしの場合)

## 5. トラブルシューティング

### エラーが続く場合
```bash
# Nginxエラーログを確認
sudo tail -f /var/log/nginx/charactier-ai.error.log

# バックエンドログを確認
sudo journalctl -u charactier-backend -f

# Nginxアクセスログを確認
sudo tail -f /var/log/nginx/charactier-ai.access.log
```

### ロールバック手順
```bash
# バックアップから復元
sudo cp /etc/nginx/sites-available/charactier-ai.conf.backup-[タイムスタンプ] /etc/nginx/sites-available/charactier-ai.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 完了確認チェックリスト

- [ ] `nginx -t` でエラーなし
- [ ] `systemctl status nginx` でactiveかつエラーなし
- [ ] `curl` コマンドで各エンドポイントが期待通りのステータスコードを返す
- [ ] ブラウザのConsoleに404エラーなし
- [ ] ログイン機能が正常に動作
- [ ] キャラクター一覧が表示される
- [ ] 通知ベルアイコンが正常に動作（SSE接続）

以上で設定完了です。