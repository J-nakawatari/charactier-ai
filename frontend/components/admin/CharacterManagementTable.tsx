'use client';

import { CharacterData } from '@/mock/adminData';
import { Eye, Edit, Play, Pause, Heart } from 'lucide-react';

interface CharacterManagementTableProps {
  characters: CharacterData[];
}

export default function CharacterManagementTable({ characters }: CharacterManagementTableProps) {
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
            無料
          </span>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ja-JP');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-4 md:px-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">キャラクター一覧</h3>
        <p className="text-sm text-gray-500 mt-1">キャラクターの詳細情報と管理</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-full" style={{ minWidth: '800px' }}>
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
              <tr key={character.id} className="hover:bg-gray-50">
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {character.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{character.name}</div>
                      <div className="text-sm text-gray-500">ID: {character.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">{character.personalityType}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {character.traits.map((trait, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(character.isActive, character.isFree)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {character.isFree ? '無料' : `¥${formatNumber(character.price)}`}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(character.totalChats)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 text-pink-500 mr-1" />
                    <div className="text-sm text-gray-900">{character.avgIntimacy.toFixed(1)}%</div>
                    <div className="ml-2 w-12 md:w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-pink-500 h-2 rounded-full" 
                        style={{ width: `${character.avgIntimacy}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(character.createdAt)}
                </td>
                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="text-gray-400 hover:text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-purple-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    {character.isActive ? (
                      <button className="text-gray-400 hover:text-yellow-600">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="text-gray-400 hover:text-green-600">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
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