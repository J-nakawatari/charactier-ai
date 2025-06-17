'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { API_BASE_URL } from '@/lib/api-config';
import { ArrowLeft, Edit, Play, Pause, Globe, User, MessageSquare, CreditCard } from 'lucide-react';

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

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 基本情報カード - エラーが発生する可能性が高い部分 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-medium">
                    {(typeof character.name === 'string' ? character.name : (character.name?.ja || '未設定')).charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{typeof character.name === 'string' ? character.name : (character.name?.ja || '未設定')}</h2>
                  <p className="text-lg text-gray-600 mt-1">{character.personalityType}</p>
                  <div className="mt-3">
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                      {character.isActive ? '公開中' : '非公開'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-start space-x-3 mb-4">
                  <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">キャラクター名</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-400">日本語:</span>
                        <p className="text-gray-900 font-medium">{character.name?.ja || '未設定'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">英語:</span>
                        <p className="text-gray-900 font-medium">{character.name?.en || '未設定'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start space-x-3 mb-4">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 mb-2">基本設定</p>
                    <div className="space-y-1">
                      <div>
                        <span className="text-xs text-gray-400">性別設定:</span>
                        <p className="text-gray-900 font-medium">{character.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">年齢設定:</span>
                        <p className="text-gray-900 font-medium">{character.age || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-gray-400">職業設定:</span>
                      <p className="text-gray-900 font-medium">{character.occupation || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-start space-x-3">
                  <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">説明</p>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-400 block mb-1">日本語:</span>
                        <p className="text-gray-900 text-sm">{character.description?.ja || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-400 block mb-1">英語:</span>
                        <p className="text-gray-900 text-sm">{character.description?.en || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 統計情報カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-blue-500 p-3 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">総チャット数</p>
                  <p className="text-2xl font-bold text-blue-700">{character.totalChats?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">平均親密度</p>
                  <p className="text-2xl font-bold text-purple-700">{character.avgIntimacy?.toFixed(1) || '0.0'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="bg-green-500 p-3 rounded-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">価格</p>
                  <p className="text-2xl font-bold text-green-700">
                    {character.isFree ? '無料' : `¥${character.price?.toLocaleString() || '0'}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}