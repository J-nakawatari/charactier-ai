#!/usr/bin/env node

/**
 * 🔍 残存エラー詳細調査スクリプト
 * 
 * 目的: 残存45件のエラーを詳細分析し、根本原因を特定
 * 安全性: 機密情報は一切表示しない
 */

const mongoose = require('mongoose');
require('dotenv').config();

// APIErrorModelの定義
const APIErrorSchema = new mongoose.Schema({
  endpoint: String,
  method: String,
  statusCode: Number,
  errorType: String,
  errorMessage: String,
  userId: mongoose.Schema.Types.ObjectId,
  userAgent: String,
  ipAddress: String,
  requestBody: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolutionCategory: String,
  notes: String
}, {
  timestamps: true,
  collection: 'api_errors'
});

const APIErrorModel = mongoose.model('APIError', APIErrorSchema);

async function analyzeRemainingErrors() {
  try {
    console.log('🔍 残存エラー分析開始...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      throw new Error('環境変数MONGO_URIが設定されていません');
    }
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ データベース接続成功');

    // 1. 未解決エラーの基本統計
    const unresolvedErrors = await APIErrorModel.find({ resolved: false })
      .sort({ timestamp: -1 })
      .lean();

    console.log(`\n📊 未解決エラー: ${unresolvedErrors.length}件`);

    // 2. エラータイプ別分析
    const errorsByType = {};
    const errorsByEndpoint = {};
    const errorsByStatus = {};

    unresolvedErrors.forEach(error => {
      // エラータイプ別
      if (!errorsByType[error.errorType]) {
        errorsByType[error.errorType] = [];
      }
      errorsByType[error.errorType].push(error);

      // エンドポイント別
      if (!errorsByEndpoint[error.endpoint]) {
        errorsByEndpoint[error.endpoint] = [];
      }
      errorsByEndpoint[error.endpoint].push(error);

      // ステータスコード別
      if (!errorsByStatus[error.statusCode]) {
        errorsByStatus[error.statusCode] = [];
      }
      errorsByStatus[error.statusCode].push(error);
    });

    // 3. 認可エラー（29件）の詳細分析
    console.log('\n🔍 認可エラー詳細分析:');
    const authorizationErrors = errorsByType['authorization'] || [];
    console.log(`   件数: ${authorizationErrors.length}件`);
    
    if (authorizationErrors.length > 0) {
      // エンドポイント別の認可エラー
      const authErrorsByEndpoint = {};
      authorizationErrors.forEach(error => {
        if (!authErrorsByEndpoint[error.endpoint]) {
          authErrorsByEndpoint[error.endpoint] = 0;
        }
        authErrorsByEndpoint[error.endpoint]++;
      });

      console.log('   エンドポイント別:');
      Object.entries(authErrorsByEndpoint)
        .sort(([,a], [,b]) => b - a)
        .forEach(([endpoint, count]) => {
          console.log(`     ${endpoint}: ${count}件`);
        });

      // 最新の認可エラーメッセージパターン
      const recentAuthErrors = authorizationErrors.slice(0, 5);
      console.log('   最新エラーのパターン:');
      recentAuthErrors.forEach((error, index) => {
        // エラーメッセージから機密情報を除外
        const sanitizedMessage = error.errorMessage
          .replace(/userId[^,}]*/g, 'userId:[HIDDEN]')
          .replace(/email[^,}]*/g, 'email:[HIDDEN]')
          .replace(/user[^,}]*:\s*"[^"]*"/g, 'user:[HIDDEN]');
        
        console.log(`     ${index + 1}. ${error.endpoint} [${error.statusCode}]`);
        console.log(`        メッセージ: ${sanitizedMessage.substring(0, 100)}...`);
        console.log(`        時刻: ${error.timestamp.toISOString().substring(0, 19)}`);
      });
    }

    // 4. 認証エラー（12件）の詳細分析
    console.log('\n🔍 認証エラー詳細分析:');
    const authenticationErrors = errorsByType['authentication'] || [];
    console.log(`   件数: ${authenticationErrors.length}件`);
    
    if (authenticationErrors.length > 0) {
      const authErrorsByEndpoint = {};
      authenticationErrors.forEach(error => {
        if (!authErrorsByEndpoint[error.endpoint]) {
          authErrorsByEndpoint[error.endpoint] = 0;
        }
        authErrorsByEndpoint[error.endpoint]++;
      });

      console.log('   エンドポイント別:');
      Object.entries(authErrorsByEndpoint)
        .sort(([,a], [,b]) => b - a)
        .forEach(([endpoint, count]) => {
          console.log(`     ${endpoint}: ${count}件`);
        });
    }

    // 5. サーバーエラー（4件）の詳細分析
    console.log('\n🔍 サーバーエラー詳細分析:');
    const serverErrors = errorsByType['server_error'] || [];
    console.log(`   件数: ${serverErrors.length}件`);
    
    if (serverErrors.length > 0) {
      serverErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.endpoint} [${error.statusCode}]`);
        console.log(`      時刻: ${error.timestamp.toISOString().substring(0, 19)}`);
        console.log(`      メッセージ: ${error.errorMessage.substring(0, 100)}...`);
      });
    }

    // 6. 時系列パターン分析
    console.log('\n📈 時系列パターン分析:');
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = unresolvedErrors.filter(error => 
      error.timestamp > last24Hours
    );
    console.log(`   過去24時間のエラー: ${recentErrors.length}件`);

    // 7. 問題の優先度評価
    console.log('\n💡 問題の優先度評価:');
    console.log('   🔴 高優先度:');
    if (authenticationErrors.length > 0) {
      console.log(`     - 認証エラー ${authenticationErrors.length}件 (管理画面アクセス不可)`);
    }
    if (authorizationErrors.length > 20) {
      console.log(`     - 認可エラー ${authorizationErrors.length}件 (ユーザーアクセス拒否)`);
    }
    
    console.log('   🟡 中優先度:');
    if (serverErrors.length > 0) {
      console.log(`     - サーバーエラー ${serverErrors.length}件 (システム不安定性)`);
    }

    // 8. 推奨アクション
    console.log('\n🎯 推奨アクション:');
    console.log('   1. 認証エラーの管理者トークン問題を調査');
    console.log('   2. 認可エラーの新しいパターンを特定');
    console.log('   3. サーバーエラーの個別対応');
    console.log('   4. エラー発生頻度の継続監視');

  } catch (error) {
    console.error('❌ 分析エラーが発生:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 分析完了');
  }
}

// 直接実行の場合
if (require.main === module) {
  analyzeRemainingErrors();
}

module.exports = { analyzeRemainingErrors };