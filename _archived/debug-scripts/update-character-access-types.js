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

// キャラクタースキーマ（簡略版）
const characterSchema = new mongoose.Schema({
  name: {
    ja: String,
    en: String
  },
  characterAccessType: {
    type: String,
    enum: ['free', 'token-based', 'purchaseOnly']
  }
}, { timestamps: true });

const Character = mongoose.model('Character', characterSchema);

const updateCharacterAccessTypes = async () => {
  try {
    await connectDB();
    
    console.log('🔍 token-basedキャラクターを検索中...');
    
    // token-basedキャラクターを検索
    const tokenBasedCharacters = await Character.find({ 
      characterAccessType: 'token-based' 
    });
    
    console.log(`📊 見つかったtoken-basedキャラクター: ${tokenBasedCharacters.length}件`);
    
    for (const char of tokenBasedCharacters) {
      console.log(`📝 キャラクター: ${char.name.ja} (${char.name.en})`);
      console.log(`   現在のアクセスタイプ: ${char.characterAccessType}`);
      
      // リン/Rinキャラクターをプレミアキャラに変更
      if (char.name.ja === 'リン' || char.name.en === 'Rin') {
        char.characterAccessType = 'purchaseOnly';
        await char.save();
        console.log(`✅ ${char.name.ja}をpurchaseOnlyに変更しました`);
      } else {
        // 他のキャラクターがあれば確認
        console.log(`⚠️  想定外のtoken-basedキャラクター: ${char.name.ja}`);
      }
    }
    
    // 確認用：全キャラクターのアクセスタイプを表示
    console.log('\n📋 全キャラクターのアクセスタイプ:');
    const allCharacters = await Character.find({}).select('name characterAccessType');
    
    for (const char of allCharacters) {
      console.log(`   ${char.name.ja}: ${char.characterAccessType}`);
    }
    
    console.log('\n✅ アクセスタイプ更新完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB接続終了');
  }
};

// スクリプト実行
updateCharacterAccessTypes();