const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB接続
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB接続成功');
  } catch (error) {
    console.error('❌ MongoDB接続エラー:', error);
    process.exit(1);
  }
};

// ユーザースキーマ（簡略版）
const userSchema = new mongoose.Schema({
  email: String,
  // 新しいフィールド構造に対応
  purchasedCharacters: [mongoose.Schema.Types.ObjectId],
  // 旧フィールド（互換性のため残す）
  purchasedCharacterModels: [{
    character: mongoose.Schema.Types.ObjectId,
    purchaseDate: Date,
    amount: Number
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const checkUserPurchases = async () => {
  try {
    await connectDB();
    
    console.log('🔍 全ユーザーの購入履歴を確認中...');
    
    // 全ユーザーを取得
    const users = await User.find({}).select('email purchasedCharacters purchasedCharacterModels');
    
    console.log(`📊 総ユーザー数: ${users.length}件`);
    
    for (const user of users) {
      // 新しいフィールド（purchasedCharacters）をチェック
      const newPurchaseCount = user.purchasedCharacters ? user.purchasedCharacters.length : 0;
      // 旧フィールド（purchasedCharacterModels）をチェック
      const oldPurchaseCount = user.purchasedCharacterModels ? user.purchasedCharacterModels.length : 0;
      
      console.log(`👤 ユーザー: ${user.email}`);
      console.log(`   💰 新システム購入履歴: ${newPurchaseCount}件`);
      console.log(`   💰 旧システム購入履歴: ${oldPurchaseCount}件`);
      
      // 新システムの購入履歴を表示
      if (newPurchaseCount > 0) {
        console.log('   📝 新システム購入詳細:');
        user.purchasedCharacters.forEach((characterId, index) => {
          console.log(`      ${index + 1}. キャラクターID: ${characterId}`);
        });
      }
      
      // 旧システムの購入履歴を表示
      if (oldPurchaseCount > 0) {
        console.log('   📝 旧システム購入詳細:');
        user.purchasedCharacterModels.forEach((purchase, index) => {
          console.log(`      ${index + 1}. キャラクターID: ${purchase.character}`);
          console.log(`         購入日: ${purchase.purchaseDate}`);
          console.log(`         金額: ${purchase.amount}円`);
        });
      }
      
      if (newPurchaseCount === 0 && oldPurchaseCount === 0) {
        console.log('   📝 購入履歴なし');
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB接続終了');
  }
};

// スクリプト実行
checkUserPurchases();