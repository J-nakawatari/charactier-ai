#!/usr/bin/env tsx
import axios from 'axios';

const PRODUCTION_URL = 'https://charactier-ai.com';
const CRITICAL_ENDPOINTS = [
  '/api/v1/health',
  '/api/v1/characters',
  '/ja',
  '/en',
];

interface CheckResult {
  endpoint: string;
  status: 'OK' | 'ERROR';
  responseTime: number;
  error?: string;
}

async function checkEndpoint(endpoint: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const response = await axios.get(`${PRODUCTION_URL}${endpoint}`, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });
    
    return {
      endpoint,
      status: 'OK',
      responseTime: Date.now() - start,
    };
  } catch (error: any) {
    return {
      endpoint,
      status: 'ERROR',
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

async function runHealthCheck() {
  console.log(`🔍 本番環境ヘルスチェック: ${new Date().toISOString()}\n`);
  
  const results = await Promise.all(
    CRITICAL_ENDPOINTS.map(endpoint => checkEndpoint(endpoint))
  );
  
  let hasError = false;
  
  for (const result of results) {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint} - ${result.responseTime}ms`);
    
    if (result.error) {
      console.log(`   エラー: ${result.error}`);
      hasError = true;
    }
  }
  
  if (hasError) {
    console.log('\n⚠️  一部のエンドポイントでエラーが発生しています');
    process.exit(1);
  } else {
    console.log('\n✨ すべてのエンドポイントが正常に動作しています');
  }
}

// 実行
runHealthCheck().catch(console.error);