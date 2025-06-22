# Winston依存関係の修正手順

## 本番サーバーでの修正方法

本番サーバーで以下のコマンドを実行してください：

```bash
# SSHで本番サーバーにログイン後
cd /var/www/charactier-ai/backend
npm install winston winston-daily-rotate-file
npm run build

# サービス再起動
sudo systemctl restart charactier-backend
```

## 問題の原因

Phase 2-2でWinstonロガーを追加しましたが、本番サーバーの自動デプロイスクリプトが
`npm install`を実行していないため、新しい依存関係がインストールされていません。

## 恒久的な解決策

`.git/hooks/post-merge`フックが作成されました。これにより今後は自動的に
依存関係がインストールされます。