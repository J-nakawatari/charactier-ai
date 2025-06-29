// テスト用起動スクリプト
process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';

console.log('🚀 Starting backend in TEST mode');
console.log('📋 Environment variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  DISABLE_RATE_LIMIT:', process.env.DISABLE_RATE_LIMIT);
console.log('');

// バックエンドを起動
require('./src/index.ts');