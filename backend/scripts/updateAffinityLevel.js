const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function updateUserAffinityLevel() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = '684b12fedcd9521713306082';
  const characterId = '68489ca4a91145fdd86f4a49';
  
  const user = await User.findById(userId);
  
  if (!user) {
    console.log('❌ ユーザーが見つかりません');
    return;
  }
  
  console.log('🔍 現在の親密度データ:');
  user.affinities.forEach(aff => {
    const charId = aff.character || aff.characterId;
    if (charId && charId.toString() === characterId) {
      console.log(`  yotugi: レベル${aff.level}`);
    }
  });
  
  // yotugiの親密度をレベル15に設定（レベル10の画像を解放するため）
  const affinityIndex = user.affinities.findIndex(aff => {
    const charId = aff.character || aff.characterId;
    return charId && charId.toString() === characterId;
  });
  
  if (affinityIndex !== -1) {
    user.affinities[affinityIndex].level = 15;
    user.affinities[affinityIndex].experience = 150;
    
    await user.save();
    console.log('✅ yotugiの親密度をレベル15に更新しました');
  } else {
    console.log('❌ yotugiの親密度データが見つかりません');
  }
  
  await mongoose.disconnect();
}

updateUserAffinityLevel().catch(console.error);