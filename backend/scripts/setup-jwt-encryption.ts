#!/usr/bin/env node

import { setupEncryptedJwtSecret } from '../src/services/jwtEncryption';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== JWT秘密鍵暗号化セットアップ ===\n');
console.log('このスクリプトは、JWT秘密鍵を暗号化して安全に保管するための設定を生成します。\n');

rl.question('暗号化するJWT秘密鍵を入力してください: ', (secret) => {
  if (!secret || secret.length < 32) {
    console.error('\n❌ エラー: JWT秘密鍵は32文字以上である必要があります。');
    rl.close();
    process.exit(1);
  }

  try {
    setupEncryptedJwtSecret(secret);
    console.log('\n✅ セットアップが完了しました！');
    console.log('上記の環境変数を .env ファイルまたは本番環境の設定に追加してください。');
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }

  rl.close();
});