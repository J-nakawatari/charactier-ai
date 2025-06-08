'use client';

import { Eye, Edit, MoreHorizontal, Heart } from 'lucide-react';
import { CharacterData } from '@/mock/adminData';

interface CharacterTableProps {
  characters: CharacterData[];
}

export default function CharacterTable({ characters }: CharacterTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">キャラクター管理</h3>
          <p className="text-sm text-gray-500">最近のチャット</p>
        </div>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
          新規キャラクター
        </button>
      </div>

      {/* モバイル用カードビュー */}
      <div className="block lg:hidden space-y-4">
        {characters.map((character) => (
          <div key={character.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {character.name.ja.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{character.name.ja}</div>
                  <div className="text-sm text-gray-500">ID: {character.id}</div>
                  <div className="text-sm text-gray-900">{character.personalityType}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-gray-500">価格</div>
                <div className="text-sm font-medium text-gray-900">
                  {character.isFree ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      無料
                    </span>
                  ) : (
                    `¥${character.price}`
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">チャット数</div>
                <div className="text-sm font-medium text-gray-900">{character.totalChats.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">平均親密度</div>
                <div className="flex items-center">
                  <Heart className="w-3 h-3 text-red-400 mr-1" />
                  <span className="text-sm font-medium text-gray-900">{character.avgIntimacy.toFixed(1)}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ステータス</div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  character.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {character.isActive ? 'アクティブ' : '非アクティブ'}
                </span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              特徴: {character.traits.slice(0, 2).join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* デスクトップ用テーブルビュー */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                キャラクター
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                タイプ
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                価格
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                チャット数
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                平均親密度
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {characters.map((character) => (
              <tr key={character.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {character.name.ja.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{character.name.ja}</div>
                      <div className="text-sm text-gray-500">ID: {character.id}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div>
                    <div className="text-sm text-gray-900">{character.personalityType}</div>
                    <div className="text-xs text-gray-500">
                      {character.traits.slice(0, 2).join(', ')}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="text-sm text-gray-900">
                    {character.isFree ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        無料
                      </span>
                    ) : (
                      `¥${character.price}`
                    )}
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="text-sm text-gray-900">
                    {character.totalChats.toLocaleString()}
                  </div>
                </td>
                <td className="py-4 px-2">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-gray-900">
                      {character.avgIntimacy.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    character.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {character.isActive ? 'アクティブ' : '非アクティブ'}
                  </span>
                </td>
                <td className="py-4 px-2 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
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