'use client';

import { useState } from 'react';
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
  Gift,
  Zap,
  Volume2,
  Globe,
  Upload,
  User,
  Brain,
  Languages
} from 'lucide-react';

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, warning } = useToast();
  const [activePromptLanguage, setActivePromptLanguage] = useState<'ja' | 'en'>('ja');
  
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
                    {character.name.ja.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{character.name.ja}</h2>
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
                  {/* Stripe ID は後で実装 */}
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
                    0
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
                    ¥0
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
                    GPT-3.5
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 基本情報詳細 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-start space-x-3 mb-4">
                  <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">キャラクター名</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-400">日本語:</span>
                        <p className="text-gray-900 font-medium">{character.name.ja}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">英語:</span>
                        <p className="text-gray-900 font-medium">{character.name.en}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start space-x-3 mb-4">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-2">基本属性</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-gray-400">性別:</span>
                        <p className="text-gray-900 font-medium">{getGenderText(character.gender || 'female')}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">年齢:</span>
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

          {/* 性格・特徴設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">性格・特徴設定</h3>
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <Brain className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2">性格プリセット</p>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-900 font-medium">{character.personalityPreset || character.personalityType}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-3">性格タグ</p>
                  <div className="flex flex-wrap gap-2">
                    {character.personalityTags ? character.personalityTags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full border border-purple-200"
                      >
                        {tag}
                      </span>
                    )) : character.traits.map((trait, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI・アクセス設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI・アクセス設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <Zap className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">AIモデル</p>
                  <p className="text-gray-900 font-medium">{character.model || 'GPT-3.5'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">アクセスタイプ</p>
                  <p className="text-gray-900 font-medium">
                    {getAccessTypeText(character.characterAccessType || 'token-based')}
                  </p>
                  {character.characterAccessType === 'purchaseOnly' && character.stripePriceId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Stripe価格ID: {character.stripePriceId}
                    </p>
                  )}
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

          {/* キャラクター画像設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">キャラクター画像設定</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* キャラクター選択画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  キャラクター選択画像
                </label>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Image className="w-4 h-4 text-gray-400" alt="" />
                    <span className="text-sm text-gray-600">{character.imageCharacterSelect ? '設定済み' : '未設定'}</span>
                  </div>
                </div>
              </div>

              {/* ダッシュボード画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ダッシュボード画像
                </label>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Image className="w-4 h-4 text-gray-400" alt="" />
                    <span className="text-sm text-gray-600">{character.imageDashboard ? '設定済み' : '未設定'}</span>
                  </div>
                </div>
              </div>

              {/* チャット背景画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  チャット背景画像
                </label>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Image className="w-4 h-4 text-gray-400" alt="" />
                    <span className="text-sm text-gray-600">{character.imageChatBackground ? '設定済み' : '未設定'}</span>
                  </div>
                </div>
              </div>

              {/* チャットアバター画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  チャットアバター画像
                </label>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Image className="w-4 h-4 text-gray-400" alt="" />
                    <span className="text-sm text-gray-600">{character.imageChatAvatar ? '設定済み' : '未設定'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ギャラリー画像（親密度解放用） */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ギャラリー画像（親密度解放用）</h3>
            <p className="text-sm text-gray-600 mb-6">
              親密度レベルに応じて解放される画像を設定します。最大10枚まで登録可能です。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 10 }, (_, index) => {
                const galleryItem = character.galleryImages && character.galleryImages[index];
                const unlockLevel = (index + 1) * 10;
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        解放レベル {unlockLevel}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {index + 1}/10
                      </span>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                        {galleryItem?.file ? (
                          <Image className="w-6 h-6 text-green-600" alt="" />
                        ) : (
                          <span className="text-gray-400 text-xs">画像{index + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          galleryItem ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {galleryItem ? '設定済み' : '未設定'}
                        </div>
                        
                        {galleryItem && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900 font-medium">
                              {galleryItem.title || '無題'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {galleryItem.description || '説明なし'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* プロンプト・メッセージ設定 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Languages className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">プロンプト・メッセージ設定</h3>
            </div>
            
            {/* 言語切り替えタブ */}
            <div className="flex space-x-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActivePromptLanguage('ja')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activePromptLanguage === 'ja'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">🇯🇵</span>
                日本語
              </button>
              <button
                onClick={() => setActivePromptLanguage('en')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activePromptLanguage === 'en'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">🇺🇸</span>
                English
              </button>
            </div>
            
            <div className="space-y-6">
              {/* 管理者プロンプト */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  管理者プロンプト ({activePromptLanguage === 'ja' ? '日本語' : '英語'})
                </h4>
                <div className="p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {activePromptLanguage === 'ja' 
                      ? (character.adminPrompt?.ja || 'プロンプトが設定されていません')
                      : (character.adminPrompt?.en || 'Prompt not set')
                    }
                  </p>
                </div>
              </div>

              {/* デフォルトメッセージ */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  デフォルトメッセージ ({activePromptLanguage === 'ja' ? '日本語' : '英語'})
                </h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {activePromptLanguage === 'ja' 
                      ? (character.defaultMessage?.ja || 'デフォルトメッセージが設定されていません')
                      : (character.defaultMessage?.en || 'Default message not set')
                    }
                  </p>
                </div>
              </div>
              
              {/* 制限メッセージ */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  制限メッセージ ({activePromptLanguage === 'ja' ? '日本語' : '英語'})
                </h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {activePromptLanguage === 'ja' 
                      ? (character.limitMessage?.ja || '制限メッセージが設定されていません')
                      : (character.limitMessage?.en || 'Limit message not set')
                    }
                  </p>
                </div>
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