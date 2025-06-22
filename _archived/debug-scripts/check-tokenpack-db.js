// MongoDB接続してTokenPack設定を確認するスクリプト
const mongoose = require('mongoose');
require('dotenv').config();

async function checkTokenPacks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB接続成功');
    
    const TokenPackModel = require('./backend/src/models/TokenPackModel').TokenPackModel;
    
    // すべてのアクティブなTokenPackを取得
    const tokenPacks = await TokenPackModel.find({ isActive: true }).lean();
    
    console.log('\n📦 アクティブなTokenPack一覧:');
    console.log('================================');
    
    tokenPacks.forEach(pack => {
      console.log(`\n名前: ${pack.name}`);
      console.log(`価格: ¥${pack.price}`);
      console.log(`トークン数: ${pack.tokens}`);
      console.log(`価格ID: ${pack.priceId || '未設定'}`);
      console.log(`利益率: ${pack.profitMargin}%`);
      console.log('---');
    });
    
    // ¥500のTokenPackを特別に確認
    const pack500 = await TokenPackModel.findOne({ price: 500, isActive: true }).lean();
    if (pack500) {
      console.log('\n🎯 ¥500のTokenPack詳細:');
      console.log(JSON.stringify(pack500, null, 2));
    } else {
      console.log('\n⚠️  ¥500のアクティブなTokenPackが見つかりません');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ MongoDB接続終了');
  }
}

checkTokenPacks();