// scripts/seedCharacters.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import Character from '../backend/models/Character';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/charactier';

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB接続完了');

    // 初期データ
    const characters = [
      {
        name: { ja: 'ミサキ', en: 'Misaki' },
        description: { ja: '優しく穏やかな性格のキャラです。', en: 'A gentle and calm personality.' },
        characterAccessType: 'free',
        personalityPreset: 'おっとり系',
        model: 'gpt-3.5-turbo',
        isActive: true
      },
      {
        name: { ja: 'リン', en: 'Rin' },
        description: { ja: 'ツンデレな魅力を持つキャラです。', en: 'A classic tsundere-type character.' },
        characterAccessType: 'token-based',
        personalityPreset: 'ツンデレ',
        model: 'gpt-3.5-turbo',
        isActive: true
      }
    ];

    await Character.insertMany(characters);
    console.log('🌟 キャラクター2体を挿入しました');

    await mongoose.disconnect();
    console.log('✅ MongoDB切断');
    process.exit(0);
  } catch (err) {
    console.error('❌ エラー:', err);
    process.exit(1);
  }
};

run();
