const mongoose = require('mongoose');
require('dotenv').config();

const CharacterSchema = new mongoose.Schema({}, { strict: false });
const Character = mongoose.model('Character', CharacterSchema);

async function removeLevel0ImageFromYotugi() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const yotugiId = '68489ca4a91145fdd86f4a49';
  const character = await Character.findById(yotugiId);
  
  if (!character) {
    console.log('❌ yotugiキャラクターが見つかりません');
    return;
  }
  
  console.log('🔍 現在のyotugiの画像一覧:');
  character.galleryImages.forEach((img, i) => {
    console.log(`  ${i+1}. レベル${img.unlockLevel}: ${img.title?.ja || img.title}`);
  });
  
  // レベル0の画像を削除
  const originalLength = character.galleryImages.length;
  character.galleryImages = character.galleryImages.filter(img => img.unlockLevel !== 0);
  
  // orderを再調整
  character.galleryImages.forEach((img, index) => {
    img.order = index;
  });
  
  await character.save();
  
  console.log(`✅ レベル0の画像を削除しました (${originalLength} → ${character.galleryImages.length}枚)`);
  
  console.log('🔍 更新後の画像一覧:');
  character.galleryImages.forEach((img, i) => {
    console.log(`  ${i+1}. レベル${img.unlockLevel}: ${img.title?.ja || img.title}`);
  });
  
  await mongoose.disconnect();
}

removeLevel0ImageFromYotugi().catch(console.error);