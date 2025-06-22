import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { PurchaseHistoryModel } from '../src/models/PurchaseHistoryModel';

// 環境変数を読み込み
dotenv.config();

// MongoDB接続
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// テスト用購入履歴を作成
const createTestPurchaseHistory = async () => {
  try {
    // 実際のユーザーIDを使用（あなたのユーザーID）
    const testUserId = new mongoose.Types.ObjectId('684b12fedcd9521713306082');
    
    const testPurchases = [
      {
        userId: testUserId,
        stripeSessionId: 'cs_test_' + Date.now() + '_1',
        stripePaymentIntentId: 'pi_test_' + Date.now() + '_1',
        type: 'token' as const,
        amount: 500000,
        price: 1000,
        currency: 'jpy',
        status: 'completed' as const,
        paymentMethod: 'card',
        details: '500,000トークン購入',
        description: 'テスト用トークン購入',
        metadata: {
          profitMargin: 0.5,
          originalAmount: 1000,
          grantedTokens: 500000
        },
        stripeData: {
          sessionId: 'cs_test_session_1',
          paymentIntentId: 'pi_test_intent_1',
          customerId: 'cus_test_customer_1',
          mode: 'payment'
        }
      },
      {
        userId: testUserId,
        stripeSessionId: 'cs_test_' + Date.now() + '_2',
        stripePaymentIntentId: 'pi_test_' + Date.now() + '_2',
        type: 'token' as const,
        amount: 200000,
        price: 500,
        currency: 'jpy',
        status: 'completed' as const,
        paymentMethod: 'card',
        details: '200,000トークン購入',
        description: 'テスト用トークン購入',
        metadata: {
          profitMargin: 0.5,
          originalAmount: 500,
          grantedTokens: 200000
        },
        stripeData: {
          sessionId: 'cs_test_session_2',
          paymentIntentId: 'pi_test_intent_2',
          customerId: 'cus_test_customer_2',
          mode: 'payment'
        }
      }
    ];

    console.log('📝 テスト用購入履歴を作成中...');
    
    for (const purchase of testPurchases) {
      const created = await PurchaseHistoryModel.create(purchase);
      console.log(`✅ 購入履歴作成成功: ${created._id}`);
    }
    
    console.log('🎉 全てのテスト用購入履歴が作成されました');
    
    // 作成されたデータを確認
    const userPurchases = await PurchaseHistoryModel.find({ userId: testUserId });
    console.log(`📊 ユーザーの購入履歴数: ${userPurchases.length}`);
    
  } catch (error) {
    console.error('❌ テスト購入履歴作成エラー:', error);
  }
};

// スクリプト実行
const main = async () => {
  await connectDB();
  await createTestPurchaseHistory();
  await mongoose.disconnect();
  console.log('🔚 スクリプト完了');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ スクリプトエラー:', error);
  process.exit(1);
});