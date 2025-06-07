'use client';

import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { mockCharacters } from '@/mock/adminData';
import { 
  ArrowLeft, 
  Edit, 
  Play, 
  Pause, 
  Heart, 
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  Tag,
  Image,
  Star,
  TrendingUp,
  Settings,
  Gift,
  Zap,
  Volume2
} from 'lucide-react';

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, warning } = useToast();
  
  const character = mockCharacters.find(c => c.id === params.id);
  
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

  const handleEdit = () => {
    router.push(`/admin/characters/${character.id}/edit`);
  };

  const handleToggleStatus = () => {
    if (character.isActive) {
      warning('キャラクター非公開', `${character.name}を非公開にしました`);
    } else {
      success('キャラクター公開', `${character.name}を公開しました`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGenderText = (gender: string) => {
    const genderMap = {
      'male': '男性',
      'female': '女性', 
      'neutral': '中性'
    };
    return genderMap[gender as keyof typeof genderMap] || gender;
  };
  
  const getAccessTypeText = (type: string) => {
    const typeMap = {
      'free': '無料',
      'token-based': 'トークン制',
      'purchaseOnly': '買い切り'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const getStatusBadge = (isActive: boolean, isFree: boolean) => {
    if (!isActive) {
      return (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
          非公開
        </span>
      );
    }
    
    return (
      <div className="flex space-x-2">
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
          公開中
        </span>
        {isFree && (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            無料
          </span>
        )}
      </div>
    );
  };

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
              <p className="text-sm text-gray-500 mt-1">
                キャラクター情報と統計データ
              </p>
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
          {/* 基本情報カード */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-medium">
                    {character.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{character.name}</h2>
                  <p className="text-lg text-gray-600 mt-1">{character.personalityType}</p>
                  <div className="mt-3">
                    {getStatusBadge(character.isActive, character.isFree)}
                  </div>
                </div>
              </div>
            </div>

            {/* 特徴タグ */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">特徴</h3>
              <div className="flex flex-wrap gap-2">
                {character.traits.map((trait, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>

            {/* 統計情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">価格</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {character.isFree ? '無料' : `¥${character.price.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">総チャット数</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {character.totalChats.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">平均親密度</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {character.avgIntimacy.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">利用ユーザー数</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {character.totalUsers?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">総売上</p>
                  <p className="text-xl font-semibold text-gray-900">
                    ¥{character.totalRevenue?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">AIモデル</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {character.model || 'GPT-3.5'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* キャラクター設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター設定</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">性格プリセット</p>
                    <p className="text-gray-900 font-medium">{character.personalityPreset || character.personalityType}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">性別</p>
                    <p className="text-gray-900 font-medium">{getGenderText(character.gender)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">アクセスタイプ</p>
                    <p className="text-gray-900 font-medium">
                      {getAccessTypeText(character.characterAccessType)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">作成日</p>
                    <p className="text-gray-900 font-medium">{formatDate(character.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* パフォーマンス指標 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">パフォーマンス</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">親密度レベル</span>
                    <span className="text-sm font-medium text-gray-900">{character.avgIntimacy.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${character.avgIntimacy}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">人気度</span>
                    <span className="text-sm font-medium text-gray-900">
                      {character.totalChats > 10000 ? '高' : character.totalChats > 5000 ? '中' : '低'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        character.totalChats > 10000 ? 'bg-green-500' : 
                        character.totalChats > 5000 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (character.totalChats / 15000) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    このキャラクターは
                    <span className="font-medium text-gray-900">
                      {character.totalChats > 10000 ? '非常に人気があり' : 
                       character.totalChats > 5000 ? 'そこそこ人気があり' : 'まだ発見されていない'}
                    </span>
                    、ユーザーとの親密度も
                    <span className="font-medium text-gray-900">
                      {character.avgIntimacy > 60 ? '高い' : character.avgIntimacy > 30 ? '普通' : '低い'}
                    </span>
                    水準です。
                  </p>
                </div>
              </div>
            </div>
            
            {/* メディア・アセット */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">メディア・アセット</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">キャラクター画像</p>
                    <p className="text-gray-900 font-medium">{character.imageCharacterSelect ? '設定済み' : '未設定'}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Star className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">ギャラリー画像</p>
                    <p className="text-gray-900 font-medium">{character.galleryImages?.length || 0}枚</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Volume2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">音声サンプル</p>
                    <p className="text-gray-900 font-medium">{character.sampleVoiceUrl ? '設定済み' : '未設定'}</p>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
          
          {/* プロンプト・メッセージ設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">プロンプト・メッセージ設定</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">デフォルトメッセージ</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {character.defaultMessage?.ja || 'デフォルトメッセージが設定されていません'}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">制限メッセージ</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {character.limitMessage?.ja || '制限メッセージが設定されていません'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">管理者プロンプト</h4>
              <div className="p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {character.adminPrompt?.ja || 'プロンプトが設定されていません'}
                </p>
              </div>
            </div>
          </div>
          
          {/* 親密度・報酬システム */}
          {character.affinitySettings && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">親密度・報酬システム</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">最大レベル</span>
                  </div>
                  <p className="text-lg font-semibold text-blue-900">{character.affinitySettings.maxLevel || 100}</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">経験値倍率</span>
                  </div>
                  <p className="text-lg font-semibold text-green-900">{character.affinitySettings.experienceMultiplier || 1.0}x</p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Gift className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">報酬数</span>
                  </div>
                  <p className="text-lg font-semibold text-yellow-900">{character.levelRewards?.length || 0}個</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}