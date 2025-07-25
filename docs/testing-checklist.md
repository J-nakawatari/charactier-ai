# Charactier AI 動作確認チェックリスト

最終更新: 2025-01-29

## 🔍 ユーザー画面 (Frontend)

### 1. 認証・アカウント管理
- [ ] **新規会員登録**
  - [ ] 必須項目の入力チェック
  - [ ] パスワード確認の一致チェック
  - [ ] メールアドレスの形式チェック
  - [ ] 利用規約への同意チェック
  - [ ] 登録完了後のメール送信確認
  - [ ] 初回登録ボーナス（10,000トークン）の付与確認
  - [ ] 言語設定（日本語/英語）の反映確認

- [ ] **メール認証**
  - [ ] 認証メールの受信確認
  - [ ] 認証リンクのクリックで認証完了
  - [ ] 認証済みの場合の適切なメッセージ表示
  - [ ] 期限切れトークンのエラーハンドリング
  - [ ] 認証後のセットアップページへの遷移

- [ ] **ログイン**
  - [ ] 正しい認証情報でのログイン成功
  - [ ] 誤った認証情報でのエラー表示
  - [ ] ログイン後のダッシュボードへのリダイレクト
  - [ ] リメンバーミー機能の動作確認

- [ ] **ログアウト**
  - [ ] ログアウト処理の完了確認
  - [ ] ログアウト後のトップページへのリダイレクト
  - [ ] ローカルストレージのクリア確認
  - [ ] 通知ストリームの切断確認

- [ ] **アカウント削除**
  - [ ] 削除確認ダイアログの表示
  - [ ] CSRFトークンの検証
  - [ ] 削除処理の完了確認
  - [ ] 削除後のトップページへのリダイレクト

### 2. ダッシュボード
- [ ] **ユーザー情報表示**
  - [ ] ユーザー名の表示
  - [ ] トークン残高の表示
  - [ ] 総メッセージ数の表示
  - [ ] 親密度情報の表示

- [ ] **キャラクター親密度**
  - [ ] 各キャラクターの親密度レベル表示
  - [ ] 経験値バーの表示
  - [ ] 次のレベルまでの必要経験値表示
  - [ ] アンロック画像数の表示

### 3. キャラクター一覧
- [ ] **キャラクター表示**
  - [ ] 全キャラクターの一覧表示
  - [ ] 無料/有料キャラクターの区別表示
  - [ ] 購入済み/未購入の状態表示
  - [ ] キャラクター画像の表示

- [ ] **フィルター機能**
  - [ ] 全て表示
  - [ ] ベースキャラのみ表示
  - [ ] 購入済みキャラのみ表示
  - [ ] 未購入キャラのみ表示

- [ ] **ソート機能**
  - [ ] 人気順
  - [ ] 新着順
  - [ ] 登録順
  - [ ] 名前順
  - [ ] 親密度順

- [ ] **検索機能**
  - [ ] キャラクター名での検索
  - [ ] 性格タグでの検索
  - [ ] 検索結果の表示
  - [ ] 検索リセット機能

### 4. チャット機能
- [ ] **チャット開始**
  - [ ] チャット画面への遷移
  - [ ] キャラクターの初期メッセージ表示
  - [ ] キャラクター画像・テーマカラーの反映

- [ ] **メッセージ送受信**
  - [ ] メッセージ送信機能
  - [ ] AIからの返信受信
  - [ ] トークン消費の確認
  - [ ] 入力中インジケーターの表示
  - [ ] エラー時のリトライ機能

- [ ] **親密度システム**
  - [ ] メッセージ送信による経験値獲得
  - [ ] レベルアップ通知の表示
  - [ ] レベルアップポップアップの表示
  - [ ] 新規画像アンロック通知

- [ ] **チャット履歴**
  - [ ] 過去のメッセージの表示
  - [ ] スクロール機能
  - [ ] 日付区切りの表示

### 5. ライブラリ（ギャラリー）
- [ ] **キャラクター選択**
  - [ ] キャラクター選択ドロップダウン
  - [ ] 選択したキャラクターの情報表示
  - [ ] 親密度レベルの表示

- [ ] **画像表示**
  - [ ] アンロック済み画像の表示
  - [ ] ロック中画像のプレビュー表示
  - [ ] レアリティ表示
  - [ ] アンロックレベル表示

- [ ] **画像詳細モーダル**
  - [ ] 画像クリックでモーダル表示
  - [ ] 画像タイトル・説明文の表示
  - [ ] タグの表示
  - [ ] ESCキーでのクローズ

- [ ] **フィルター・検索**
  - [ ] タイトル/説明文での検索
  - [ ] タグでの検索
  - [ ] グリッド/リスト表示切替

### 6. トークン購入
- [ ] **購入ページ**
  - [ ] トークンパック一覧表示
  - [ ] 価格表示（円）
  - [ ] ボーナストークン表示
  - [ ] 利益率99%の維持確認

- [ ] **Stripe決済**
  - [ ] チェックアウトセッション作成
  - [ ] Stripeページへのリダイレクト
  - [ ] 決済完了後の戻り処理
  - [ ] トークン付与の確認
  - [ ] 購入履歴への記録

### 7. キャラクター購入
- [ ] **購入フロー**
  - [ ] 購入ボタンの表示（未購入キャラ）
  - [ ] 価格表示
  - [ ] Stripeチェックアウトへの遷移
  - [ ] 購入完了後のアンロック確認
  - [ ] チャット開始可能になることの確認

### 8. プロフィール設定
- [ ] **基本情報編集**
  - [ ] ユーザー名の変更
  - [ ] メールアドレスの変更
  - [ ] 言語設定の変更
  - [ ] 変更内容の保存確認

- [ ] **パスワード変更**
  - [ ] 現在のパスワード確認
  - [ ] 新しいパスワードの設定
  - [ ] パスワード確認の一致チェック
  - [ ] 変更完了通知

### 9. 通知機能
- [ ] **リアルタイム通知**
  - [ ] 購入完了通知
  - [ ] レベルアップ通知
  - [ ] システムメッセージ通知
  - [ ] 通知のトースト表示

### 10. エラーハンドリング
- [ ] **ネットワークエラー**
  - [ ] 適切なエラーメッセージ表示
  - [ ] リトライ機能の提供

- [ ] **認証エラー**
  - [ ] 401エラー時のログインページへのリダイレクト
  - [ ] トークン更新の自動試行

- [ ] **バリデーションエラー**
  - [ ] フォーム入力エラーの表示
  - [ ] エラーフィールドのハイライト

## 🛠️ 管理画面 (Admin)

### 1. 管理者認証
- [ ] **ログイン**
  - [ ] 管理者アカウントでのログイン
  - [ ] 権限レベルの確認（super_admin/moderator）
  - [ ] ログイン後の管理ダッシュボードへの遷移

- [ ] **ログアウト**
  - [ ] ログアウト処理
  - [ ] ログインページへのリダイレクト

### 2. ダッシュボード
- [ ] **統計情報表示**
  - [ ] 総ユーザー数
  - [ ] 総収益
  - [ ] アクティブユーザー数
  - [ ] 今月の収益
  - [ ] トークン使用量統計

- [ ] **グラフ表示**
  - [ ] 日別収益グラフ
  - [ ] ユーザー登録推移
  - [ ] トークン使用量推移

### 3. ユーザー管理
- [ ] **ユーザー一覧**
  - [ ] 全ユーザーの表示
  - [ ] ページネーション機能
  - [ ] 検索機能（名前/メール）
  - [ ] ソート機能

- [ ] **ユーザー詳細**
  - [ ] ユーザー情報の表示
  - [ ] トークン残高の表示
  - [ ] 購入履歴の表示
  - [ ] アカウントステータスの表示

- [ ] **ユーザー編集**
  - [ ] ユーザー名の変更
  - [ ] メールアドレスの変更
  - [ ] トークン残高の調整（super_adminのみ）
  - [ ] 変更履歴の記録

- [ ] **アカウント制御**
  - [ ] アカウント停止/停止解除
  - [ ] チャット機能の停止/解除
  - [ ] 警告の発行
  - [ ] アカウント削除（論理削除）

### 4. キャラクター管理
- [ ] **キャラクター一覧**
  - [ ] 全キャラクターの表示
  - [ ] アクティブ/非アクティブ状態の表示
  - [ ] 統計情報の表示（利用者数、収益等）

- [ ] **キャラクター作成**
  - [ ] 基本情報の入力
  - [ ] 多言語対応（日本語/英語）
  - [ ] AI設定（モデル選択、プロンプト）
  - [ ] 画像アップロード（4種類）
  - [ ] ギャラリー画像の設定（レベル10-100）
  - [ ] 価格設定（有料キャラの場合）
  - [ ] Stripe商品IDの設定

- [ ] **キャラクター編集**
  - [ ] 既存情報の読み込み
  - [ ] 各項目の編集
  - [ ] 画像の差し替え
  - [ ] ギャラリー画像の追加/削除
  - [ ] 変更の保存確認

- [ ] **キャラクター削除**
  - [ ] 削除確認ダイアログ
  - [ ] 論理削除の実行
  - [ ] 削除後の一覧更新

### 5. 収益管理
- [ ] **収益一覧**
  - [ ] 期間別収益表示
  - [ ] 商品別収益内訳
  - [ ] グラフ表示

- [ ] **購入履歴**
  - [ ] 全購入履歴の表示
  - [ ] ユーザー別フィルター
  - [ ] 日付範囲フィルター
  - [ ] CSV出力機能

### 6. トークン管理
- [ ] **トークン統計**
  - [ ] 総発行トークン数
  - [ ] 総消費トークン数
  - [ ] モデル別使用量
  - [ ] コスト分析（99%利益率の確認）

- [ ] **トークンパック管理**
  - [ ] パック一覧表示
  - [ ] 価格・ボーナス率の確認
  - [ ] 販売統計の表示

### 7. システム設定
- [ ] **AIモデル設定**
  - [ ] 利用可能モデルの表示
  - [ ] デフォルトモデルの設定
  - [ ] モデル別コスト設定

- [ ] **セキュリティ設定**
  - [ ] レート制限の確認
  - [ ] IPブロックリストの管理
  - [ ] セキュリティログの確認

### 8. 通知管理
- [ ] **通知作成**
  - [ ] 通知タイプの選択
  - [ ] 対象ユーザーの選択
  - [ ] メッセージ内容の入力
  - [ ] 送信予約機能

- [ ] **通知履歴**
  - [ ] 送信済み通知の一覧
  - [ ] 送信結果の確認
  - [ ] 再送信機能

### 9. エラー監視
- [ ] **エラーログ**
  - [ ] システムエラーの一覧
  - [ ] エラー詳細の表示
  - [ ] エラー頻度の分析

- [ ] **アラート設定**
  - [ ] 閾値設定
  - [ ] 通知先設定

## 🔄 統合テスト項目

### 1. エンドツーエンドフロー
- [ ] **新規ユーザーフロー**
  - [ ] 会員登録 → メール認証 → セットアップ → キャラクター選択 → チャット開始

- [ ] **購入フロー**
  - [ ] トークン購入 → 残高確認 → キャラクター購入 → チャット利用

- [ ] **親密度アップフロー**
  - [ ] チャット → レベルアップ → 画像アンロック → ライブラリで確認

### 2. 同時アクセステスト
- [ ] 複数ユーザーの同時チャット
- [ ] 大量メッセージ送信時のパフォーマンス
- [ ] リアルタイム通知の配信確認

### 3. データ整合性
- [ ] トークン残高の正確性
- [ ] 購入履歴とStripeの整合性
- [ ] 親密度データの永続性

## 🛡️ セキュリティチェック

- [ ] XSS攻撃への耐性
- [ ] SQLインジェクション対策
- [ ] CSRF保護の動作確認
- [ ] 認証トークンの有効期限
- [ ] レート制限の動作確認
- [ ] 不適切コンテンツのフィルタリング

## 📱 レスポンシブ確認

- [ ] スマートフォン表示（iOS/Android）
- [ ] タブレット表示
- [ ] デスクトップ表示
- [ ] 横向き/縦向きの切り替え

## 🌐 多言語対応

- [ ] 日本語/英語の切り替え
- [ ] 翻訳の正確性
- [ ] 日付・通貨フォーマット
- [ ] エラーメッセージの翻訳

## 📊 パフォーマンス確認

- [ ] ページロード速度
- [ ] API応答時間
- [ ] 画像最適化
- [ ] キャッシュの動作確認

## 🔧 本番環境固有

- [ ] Blue-Greenデプロイメント
- [ ] ゼロダウンタイム確認
- [ ] ロールバック機能
- [ ] ログ収集の確認
- [ ] 監視アラートの動作

---

## チェックリストの使い方

1. **定期テスト**: 週次または重要なリリース前に実施
2. **部分テスト**: 機能変更時は関連項目のみ確認
3. **自動化候補**: 頻繁にチェックする項目は自動テスト化を検討
4. **優先度**: 
   - 🔴 高（決済・認証関連）
   - 🟡 中（基本機能）
   - 🟢 低（UI/UX改善）

## 更新履歴

- 2025-01-29: 初版作成