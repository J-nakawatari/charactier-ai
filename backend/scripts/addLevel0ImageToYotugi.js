const mongoose = require('mongoose');
require('dotenv').config();

const CharacterSchema = new mongoose.Schema({}, { strict: false });
const Character = mongoose.model('Character', CharacterSchema);

async function addLevel0ImageToYotugi() {
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
  
  // レベル0の画像が既に存在するかチェック
  const level0Image = character.galleryImages.find(img => img.unlockLevel === 0);
  
  if (level0Image) {
    console.log('✅ レベル0の画像は既に存在します');
  } else {
    console.log('❌ レベル0の画像が見つかりません。追加します...');
    
    // レベル0の基本画像を追加
    const newLevel0Image = {
      url: '/characters/yotugi/affinity-0.webp',
      unlockLevel: 0,
      title: {
        ja: 'yotugiの基本画像',
        en: 'yotugi Basic Image'
      },
      description: {
        ja: '初回会話でアンロック',
        en: 'Unlocked on first conversation'
      },
      rarity: 'common',
      tags: ['level-0', 'common', 'yotugi'],
      isDefault: true,
      order: 0,
      createdAt: new Date()
    };
    
    // 既存の画像のorderを1つずつ増やす
    character.galleryImages.forEach(img => {
      img.order = (img.order || 0) + 1;
    });
    
    // 新しい画像を先頭に追加
    character.galleryImages.unshift(newLevel0Image);
    
    await character.save();
    console.log('✅ レベル0の画像を追加しました');
    
    console.log('🔍 更新後の画像一覧:');
    character.galleryImages.forEach((img, i) => {
      console.log(`  ${i+1}. レベル${img.unlockLevel}: ${img.title?.ja || img.title}`);
    });
  }
  
  await mongoose.disconnect();
}

addLevel0ImageToYotugi().catch(console.error);