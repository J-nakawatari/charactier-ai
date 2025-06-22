import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CharacterModel } from '../src/models/CharacterModel';

dotenv.config();

// MongoDB接続
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required');
    }

    mongoose.set('bufferCommands', false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// サンプル画像データ（CLAUDE.md仕様：10レベル毎にアンロック）
const generateAffinityImages = (characterName) => {
  const baseImages = [
    {
      unlockLevel: 0,
      title: { ja: `${characterName}の基本画像`, en: `${characterName} Basic Image` },
      description: { ja: '初回会話でアンロック', en: 'Unlocked on first conversation' },
      rarity: 'common',
      isDefault: true
    },
    {
      unlockLevel: 10,
      title: { ja: `${characterName}の笑顔`, en: `${characterName} Smile` },
      description: { ja: 'レベル10で解放される特別な笑顔', en: 'Special smile unlocked at level 10' },
      rarity: 'common',
      isDefault: false
    },
    {
      unlockLevel: 20,
      title: { ja: `${characterName}の制服姿`, en: `${characterName} in Uniform` },
      description: { ja: 'レベル20で解放される制服姿', en: 'Uniform look unlocked at level 20' },
      rarity: 'rare',
      isDefault: false
    },
    {
      unlockLevel: 30,
      title: { ja: `${characterName}の私服`, en: `${characterName} Casual Wear` },
      description: { ja: 'レベル30で解放される私服姿', en: 'Casual wear unlocked at level 30' },
      rarity: 'rare',
      isDefault: false
    },
    {
      unlockLevel: 40,
      title: { ja: `${characterName}の特別な表情`, en: `${characterName} Special Expression` },
      description: { ja: 'レベル40で解放される特別な表情', en: 'Special expression unlocked at level 40' },
      rarity: 'epic',
      isDefault: false
    },
    {
      unlockLevel: 50,
      title: { ja: `${characterName}の限定画像`, en: `${characterName} Limited Image` },
      description: { ja: 'レベル50で解放される限定画像', en: 'Limited image unlocked at level 50' },
      rarity: 'epic',
      isDefault: false
    },
    {
      unlockLevel: 60,
      title: { ja: `${characterName}のレア画像`, en: `${characterName} Rare Image` },
      description: { ja: 'レベル60で解放されるレア画像', en: 'Rare image unlocked at level 60' },
      rarity: 'legendary',
      isDefault: false
    },
    {
      unlockLevel: 70,
      title: { ja: `${characterName}の特級画像`, en: `${characterName} Premium Image` },
      description: { ja: 'レベル70で解放される特級画像', en: 'Premium image unlocked at level 70' },
      rarity: 'legendary',
      isDefault: false
    },
    {
      unlockLevel: 80,
      title: { ja: `${characterName}の極秘画像`, en: `${characterName} Secret Image` },
      description: { ja: 'レベル80で解放される極秘画像', en: 'Secret image unlocked at level 80' },
      rarity: 'legendary',
      isDefault: false
    },
    {
      unlockLevel: 90,
      title: { ja: `${characterName}の究極画像`, en: `${characterName} Ultimate Image` },
      description: { ja: 'レベル90で解放される究極画像', en: 'Ultimate image unlocked at level 90' },
      rarity: 'legendary',
      isDefault: false
    },
    {
      unlockLevel: 100,
      title: { ja: `${characterName}の完全体`, en: `${characterName} Complete Form` },
      description: { ja: 'レベル100で解放される完全体', en: 'Complete form unlocked at level 100' },
      rarity: 'legendary',
      isDefault: false
    }
  ];

  return baseImages.map((img, index) => ({
    url: `/characters/${characterName.toLowerCase()}/affinity-${img.unlockLevel}.webp`,
    unlockLevel: img.unlockLevel,
    title: img.title,
    description: img.description,
    rarity: img.rarity,
    tags: [`level-${img.unlockLevel}`, img.rarity, characterName.toLowerCase()],
    isDefault: img.isDefault,
    order: index,
    createdAt: new Date()
  }));
};

// メイン処理
const seedAffinityImages = async () => {
  try {
    await connectDB();
    
    console.log('🔍 既存キャラクターを取得中...');
    const characters = await CharacterModel.find({ isActive: true });
    console.log(`✅ ${characters.length}件のキャラクターを発見`);
    
    for (const character of characters) {
      const characterName = character.name.ja || character.name;
      console.log(`\n🎨 ${characterName} の親密度画像を更新中...`);
      
      // 既存のgalleryImagesがあるかチェック
      if (character.galleryImages && character.galleryImages.length > 0) {
        console.log(`⚠️ ${characterName} には既に ${character.galleryImages.length} 件の画像があります - スキップ`);
        continue;
      }
      
      // 新しい画像データを生成
      const affinityImages = generateAffinityImages(characterName);
      
      // キャラクターを更新
      await CharacterModel.findByIdAndUpdate(
        character._id,
        { 
          $set: { 
            galleryImages: affinityImages 
          } 
        },
        { new: true }
      );
      
      console.log(`✅ ${characterName} に ${affinityImages.length} 件の親密度画像を追加完了`);
    }
    
    console.log('\n🎉 全キャラクターの親密度画像シードが完了しました！');
    
  } catch (error) {
    console.error('❌ シード処理エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📝 MongoDB接続を終了しました');
  }
};

// スクリプト実行
seedAffinityImages().catch(console.error);