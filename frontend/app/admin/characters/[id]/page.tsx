'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { API_BASE_URL } from '@/lib/api-config';
import { ArrowLeft, Edit, Play, Pause } from 'lucide-react';

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
  
  const handleEdit = () => {
    router.push(`/admin/characters/${character._id}/edit`);
  };

  const handleToggleStatus = () => {
    const characterName = typeof character.name === 'string' ? character.name : (character.name?.ja || '未設定');
    if (character.isActive) {
      warning('キャラクター非公開', `${characterName}を非公開にしました`);
    } else {
      success('キャラクター公開', `${characterName}を公開しました`);
    }
  };
  
  // 段階的にコンテンツを追加してエラー箇所を特定 - ヘッダー部分を追加
  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/characters')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">キャラクター詳細</h1>
              <p className="text-sm text-gray-500 mt-1">キャラクター情報と統計データ</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleEdit}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">編集</span>
            </button>
            
            <button
              onClick={handleToggleStatus}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                character.isActive
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {character.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {character.isActive ? '非公開' : '公開'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* シンプルなメインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報（テスト）</h3>
            <p>名前: {typeof character.name === 'string' ? character.name : (character.name?.ja || '未設定')}</p>
            <p>ID: {character._id}</p>
            <p>ステータス: {character.isActive ? '公開中' : '非公開'}</p>
          </div>
        </div>
      </main>
    </div>
  );
}