const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function resetToCorrectLevel() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = '684b12fedcd9521713306082';
  const characterId = '68489ca4a91145fdd86f4a49';
  
  const user = await User.findById(userId);
  
  // yotugiの親密度を正しい値（3）に設定
  const yotugiIndex = user.affinities.findIndex(aff => {
    const charId = aff.character || aff.characterId;
    return charId && charId.toString() === characterId;
  });
  
  if (yotugiIndex !== -1) {
    console.log('🔄 yotugiの親密度を3に戻します...');
    console.log(`現在のレベル: ${user.affinities[yotugiIndex].level}`);
    
    user.affinities[yotugiIndex].level = 3;
    user.affinities[yotugiIndex].experience = 30;
    
    await user.save();
    console.log('✅ 保存完了 - レベル3に設定');
    console.log(`更新後のレベル: ${user.affinities[yotugiIndex].level}`);
  }
  
  await mongoose.disconnect();
}

resetToCorrectLevel().catch(console.error);