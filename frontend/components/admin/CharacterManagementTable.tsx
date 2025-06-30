'use client';

import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { Eye, Edit, Play, Pause, Heart, Trash2 } from 'lucide-react';
import { adminFetch } from '@/utils/admin-api';

interface Character {
  _id: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  personalityPreset: string;
  personalityTags: string[];
  characterAccessType: 'free' | 'purchaseOnly';
  isActive: boolean;
  imageCharacterSelect?: string;
  imageDashboard?: string;
  imageChatBackground?: string;
  imageChatAvatar?: string;
  totalMessages?: number;
  totalUsers?: number;
  averageAffinityLevel?: number;
  createdAt: string;
  updatedAt: string;
}

interface CharacterManagementTableProps {
  characters: Character[];
  onCharacterDeleted?: () => void;
}

export default function CharacterManagementTable({ characters, onCharacterDeleted }: CharacterManagementTableProps) {
  const { success, warning, error } = useToast();
  
  // デバッグ用
  console.log('🔍 CharacterManagementTable - characters:', characters);
  
  // ヘルパー関数
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const getStatusBadge = (isActive: boolean, isFree: boolean) => {
    if (!isActive) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          非公開
        </span>
      );
    }
    
    return (
      <div className="flex space-x-1">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          公開中
        </span>
        {isFree && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            ベースキャラ
          </span>
        )}
      </div>
    );
  };

  const handleViewCharacter = (character: Character) => {
    window.location.href = `/admin/characters/${character._id}`;
  };

  const handleEditCharacter = (character: Character) => {
    window.location.href = `/admin/characters/${character._id}/edit`;
  };

  const handleToggleStatus = (character: Character) => {
    if (character.isActive) {
      warning('キャラクター非公開', `${character.name?.ja || 'キャラクター'}を非公開にしました`);
    } else {
      success('キャラクター公開', `${character.name?.ja || 'キャラクター'}を公開しました`);
    }
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (window.confirm(`${character.name?.ja || 'このキャラクター'}を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      try {
        const response = await adminFetch(`/api/v1/admin/characters/${character._id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          success('削除完了', `${character.name?.ja || 'キャラクター'}を削除しました`);
          if (onCharacterDeleted) {
            onCharacterDeleted();
          }
        } else {
          const data = await response.json();
          error('削除エラー', data.error || 'キャラクターの削除に失敗しました');
        }
      } catch (err) {
        error('削除エラー', 'キャラクターの削除中にエラーが発生しました');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">キャラクター一覧</h3>
        <p className="text-sm text-gray-500 mt-1">キャラクターの詳細情報と管理</p>
      </div>

      {/* モバイル用カードビュー */}
      <div className="block lg:hidden p-4 space-y-4">
        {characters.map((character) => (
          <div key={character._id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                  {character.imageCharacterSelect ? (
                    <Image
                      src={character.imageCharacterSelect}
                      alt={character.name?.ja || 'Character'}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {character.name?.ja?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">{character.name?.ja || 'N/A'}</div>
                  <div className="text-xs text-gray-500 mb-2">ID: {character._id ? character._id.slice(-8) : 'N/A'}</div>
                  {getStatusBadge(character.isActive, character.characterAccessType === 'free')}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleViewCharacter(character)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEditCharacter(character)}
                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {character.isActive ? (
                  <button 
                    onClick={() => handleToggleStatus(character)}
                    className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                    title="非公開にする"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleStatus(character)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="公開する"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteCharacter(character)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">性格・特徴</div>
              <div className="text-sm font-medium text-gray-900 mb-2">{character.personalityPreset || 'N/A'}</div>
              <div className="flex flex-wrap gap-1">
                {character.personalityTags ? character.personalityTags.slice(0, 3).map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                  >
                    {tag}
                  </span>
                )) : (
                  <span className="text-xs text-gray-500">タグなし</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500">タイプ</div>
                <div className="text-sm font-medium text-gray-900">
                  {character.characterAccessType === 'free' ? 'ベースキャラ' : 'プレミアムキャラ'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">チャット数</div>
                <div className="text-sm font-medium text-gray-900">{(character.totalMessages || 0).toLocaleString()}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">平均親密度</div>
                <div className="flex items-center">
                  <Heart className="w-4 h-4 text-pink-500 mr-1" />
                  <div className="text-sm font-medium text-gray-900 mr-2">{(character.averageAffinityLevel || 0).toFixed(1)}%</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full" 
                      style={{ width: `${character.averageAffinityLevel || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              作成日: {formatDate(character.createdAt)}
            </div>
          </div>
        ))}
      </div>

      {/* デスクトップ用テーブルビュー */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                キャラクター
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                性格・特徴
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                価格
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                チャット数
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                平均親密度
              </th>
              <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日
              </th>
              <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {characters.map((character) => (
              <tr key={character._id} className="hover:bg-gray-50">
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                      {character.imageCharacterSelect ? (
                        <Image
                          src={character.imageCharacterSelect}
                          alt={character.name?.ja || 'Character'}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {character.name?.ja?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{character.name?.ja || 'N/A'}</div>
                      <div className="text-sm text-gray-500">ID: {character._id ? character._id.slice(-8) : 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">{character.personalityPreset || 'N/A'}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {character.personalityTags ? character.personalityTags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                      >
                        {tag}
                      </span>
                    )) : (
                      <span className="text-xs text-gray-500">タグなし</span>
                    )}
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(character.isActive, character.characterAccessType === 'free')}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {character.characterAccessType === 'free' ? 'ベースキャラ' : 'プレミアムキャラ'}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(character.totalMessages || 0).toLocaleString()}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 text-pink-500 mr-1" />
                    <div className="text-sm text-gray-900">{(character.averageAffinityLevel || 0).toFixed(1)}%</div>
                    <div className="ml-2 w-12 md:w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-pink-500 h-2 rounded-full" 
                        style={{ width: `${character.averageAffinityLevel || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(character.createdAt)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleViewCharacter(character)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="詳細を見る"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEditCharacter(character)}
                      className="text-gray-400 hover:text-purple-600 transition-colors"
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {character.isActive ? (
                      <button 
                        onClick={() => handleToggleStatus(character)}
                        className="text-gray-400 hover:text-yellow-600"
                        title="非公開にする"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleToggleStatus(character)}
                        className="text-gray-400 hover:text-green-600"
                        title="公開する"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteCharacter(character)}
                      className="text-gray-400 hover:text-red-600"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}