const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function debugAffinityStructure() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = '684b12fedcd9521713306082';
  const characterId = '68489ca4a91145fdd86f4a49';
  
  const user = await User.findById(userId);
  
  console.log('🔍 完全な親密度データ構造:');
  user.affinities.forEach((aff, index) => {
    console.log(`  親密度[${index}]:`);
    console.log(`    character: ${aff.character}`);
    console.log(`    characterId: ${aff.characterId}`);
    console.log(`    level: ${aff.level}`);
    console.log(`    experience: ${aff.experience}`);
    console.log(`    _id: ${aff._id}`);
    console.log('');
  });
  
  // yotugiの親密度を配列インデックスで直接更新
  const yotugiIndex = user.affinities.findIndex(aff => {
    const charId = aff.character || aff.characterId;
    return charId && charId.toString() === characterId;
  });
  
  if (yotugiIndex !== -1) {
    console.log(`✅ yotugiのインデックス: ${yotugiIndex}`);
    
    user.affinities[yotugiIndex].level = 25;
    user.affinities[yotugiIndex].experience = 250;
    
    const saveResult = await user.save();
    console.log('💾 保存完了');
    
    console.log('🔍 保存後の確認:');
    console.log(`  レベル: ${user.affinities[yotugiIndex].level}`);
    console.log(`  経験値: ${user.affinities[yotugiIndex].experience}`);
  } else {
    console.log('❌ yotugiの親密度データが見つかりません');
  }
  
  await mongoose.disconnect();
}

debugAffinityStructure().catch(console.error);