'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { API_BASE_URL } from '@/lib/api-config';

// Inline type definitions
interface Character {
  _id: string;
  name: { ja: string; en: string };
  description?: { ja: string; en: string };
  personalityType: string;
  personalityPreset?: string;
  personalityTags?: string[];
  traits: string[];
  isActive: boolean;
  isFree: boolean;
  price: number;
  totalChats: number;
  avgIntimacy: number;
  createdAt: string;
  gender?: string;
  age?: string;
  occupation?: string;
  model?: string;
  aiModel?: string;
  characterAccessType?: string;
  stripePriceId?: string;
  imageCharacterSelect?: string;
  imageDashboard?: string;
  imageChatBackground?: string;
  imageChatAvatar?: string;
  galleryImages?: Array<{
    file: string;
    title: string;
    description: string;
  }>;
  adminPrompt?: { ja: string; en: string };
  defaultMessage?: { ja: string; en: string };
  limitMessage?: { ja: string; en: string };
  affinitySettings?: {
    maxLevel: number;
    experienceMultiplier: number;
  };
  levelRewards?: Array<any>;
}

export default function CharacterDetail() {
  const params = useParams();
  const router = useRouter();
  const { success, warning } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        
        // 管理者認証トークンを取得
        const adminToken = localStorage.getItem('adminAccessToken');
        if (!adminToken) {
          throw new Error('管理者認証が必要です');
        }
        
        const response = await fetch(`${API_BASE_URL}/api/characters/${params.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`キャラクターの取得に失敗しました: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🔍 Character data structure:', data);
        console.log('🔍 Character name:', data.character?.name || data.name);
        setCharacter(data.character || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'キャラクターデータの読み込みに失敗しました');
        console.error('Character fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">キャラクター情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/admin/characters')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            キャラクター一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">キャラクターが見つかりません</h1>
          <p className="text-gray-500 mb-4">指定されたキャラクターは存在しません。</p>
          <button 
            onClick={() => router.push('/admin/characters')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            キャラクター一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 Character before render:', character);
  console.log('🔍 Character name before render:', character?.name);
  
  // 一時的にシンプルな表示に変更してエラー箇所を特定
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4">
        <h1>キャラクター詳細</h1>
        <p>名前: {typeof character.name === 'string' ? character.name : (character.name?.ja || '未設定')}</p>
        <p>ID: {character._id}</p>
        <button 
          onClick={() => router.push('/admin/characters')}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          戻る
        </button>
      </div>
    </div>
  );
}