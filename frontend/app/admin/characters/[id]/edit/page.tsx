'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { mockCharacters } from '@/mock/adminData';
import { ArrowLeft, Save, X } from 'lucide-react';

export default function CharacterEditPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  
  const character = mockCharacters.find(c => c.id === params.id);
  
  const [formData, setFormData] = useState({
    name: character?.name || '',
    personalityType: character?.personalityType || '',
    traits: character?.traits || [],
    price: character?.price || 0,
    isFree: character?.isFree || false,
    isActive: character?.isActive || false,
  });

  const [newTrait, setNewTrait] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.name.trim()) {
      error('入力エラー', 'キャラクター名は必須です');
      return;
    }
    
    if (!formData.personalityType.trim()) {
      error('入力エラー', '性格タイプは必須です');
      return;
    }

    if (formData.traits.length === 0) {
      error('入力エラー', '特徴は最低1つ入力してください');
      return;
    }

    if (!formData.isFree && formData.price <= 0) {
      error('入力エラー', '有料キャラクターの場合、価格は1円以上で設定してください');
      return;
    }

    // 保存処理（実際の実装では API 呼び出し）
    success('保存完了', `${formData.name}の情報を更新しました`);
    
    // 詳細画面に戻る
    setTimeout(() => {
      router.push(`/admin/characters/${character.id}`);
    }, 1000);
  };

  const handleCancel = () => {
    router.push(`/admin/characters/${character.id}`);
  };

  const addTrait = () => {
    if (newTrait.trim() && !formData.traits.includes(newTrait.trim())) {
      setFormData({
        ...formData,
        traits: [...formData.traits, newTrait.trim()]
      });
      setNewTrait('');
    }
  };

  const removeTrait = (trait: string) => {
    setFormData({
      ...formData,
      traits: formData.traits.filter(t => t !== trait)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTrait();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push(`/admin/characters/${character.id}`)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">キャラクター編集</h1>
              <p className="text-sm text-gray-500 mt-1">
                {character.name}の情報を編集
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      キャラクター名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="キャラクター名を入力"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性格タイプ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personalityType}
                      onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="例: 優しい、ツンデレ、明るい"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      特徴 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newTrait}
                          onChange={(e) => setNewTrait(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="特徴を入力してEnterで追加"
                        />
                        <button
                          type="button"
                          onClick={addTrait}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          追加
                        </button>
                      </div>
                      
                      {formData.traits.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.traits.map((trait, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full"
                            >
                              {trait}
                              <button
                                type="button"
                                onClick={() => removeTrait(trait)}
                                className="ml-2 text-purple-500 hover:text-purple-700"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 価格設定 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">価格設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">無料キャラクター</span>
                    </label>
                  </div>

                  {!formData.isFree && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        価格（円）
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="980"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 公開設定 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">公開設定</h3>
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">キャラクターを公開する</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    チェックを外すとユーザーからは見えなくなります
                  </p>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>キャンセル</span>
                </button>
                
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}