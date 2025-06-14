const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function fixAffinityLevel() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const userId = '684b12fedcd9521713306082';
  const characterId = '68489ca4a91145fdd86f4a49';
  
  console.log('🔍 更新前のデータ確認...');
  const userBefore = await User.findById(userId);
  
  userBefore.affinities.forEach(aff => {
    const charId = aff.character || aff.characterId;
    if (charId && charId.toString() === characterId) {
      console.log(`  yotugi 更新前: レベル${aff.level}, 経験値: ${aff.experience}`);
    }
  });
  
  // updateOne を使って確実に更新
  const result = await User.updateOne(
    { 
      _id: userId,
      'affinities.character': characterId
    },
    {
      $set: {
        'affinities.$.level': 25,
        'affinities.$.experience': 250
      }
    }
  );
  
  console.log('🔄 Update result:', result);
  
  console.log('🔍 更新後のデータ確認...');
  const userAfter = await User.findById(userId);
  
  userAfter.affinities.forEach(aff => {
    const charId = aff.character || aff.characterId;
    if (charId && charId.toString() === characterId) {
      console.log(`  yotugi 更新後: レベル${aff.level}, 経験値: ${aff.experience}`);
    }
  });
  
  await mongoose.disconnect();
}

fixAffinityLevel().catch(console.error);