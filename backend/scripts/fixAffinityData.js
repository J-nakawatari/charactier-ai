const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

// スキーマを直接定義
const userSchema = new mongoose.Schema({
  affinities: [{
    character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
    level: { type: Number, default: 0 }
  }]
}, { strict: false });

const UserModel = mongoose.model('User', userSchema);

async function fixAffinityData() {
  try {
    console.log('🔄 MongoDB接続中...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB接続成功');

    // すべてのユーザーを取得
    const users = await UserModel.find({});
    console.log(`🔍 ${users.length}人のユーザーを確認中...`);

    for (const user of users) {
      if (user.affinities && user.affinities.length > 0) {
        console.log(`🔍 ユーザー ${user.email} の親密度データを確認中...`);
        
        // 無効な親密度データを特定
        const invalidAffinities = user.affinities.filter(aff => !aff.character);
        
        if (invalidAffinities.length > 0) {
          console.log(`❌ ${invalidAffinities.length}個の無効な親密度データを発見`);
          
          // 無効なデータを削除
          await UserModel.findByIdAndUpdate(
            user._id,
            {
              $pull: {
                affinities: { character: { $exists: false } }
              }
            }
          );
          
          console.log(`✅ ユーザー ${user.email} の無効な親密度データを削除`);
        } else {
          console.log(`✅ ユーザー ${user.email} の親密度データは正常`);
        }
      }
    }

    console.log('✅ 親密度データの修正が完了しました');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB接続を切断');
  }
}

// スクリプト実行
if (require.main === module) {
  fixAffinityData();
}

module.exports = { fixAffinityData };