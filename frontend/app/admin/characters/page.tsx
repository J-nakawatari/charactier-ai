'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import CharacterStats from '@/components/admin/CharacterStats';
import CharacterManagementTable from '@/components/admin/CharacterManagementTable';
import { useToast } from '@/contexts/ToastContext';
import { adminFetch, adminPost, adminPut } from '@/utils/admin-api';
import { Search, Filter, Plus, Download, Users, RefreshCw, GripVertical, Save, X } from 'lucide-react';

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
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export default function CharactersPage() {
  const { success, warning } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null);
  const [sortMode, setSortMode] = useState<'custom' | 'newest' | 'popular'>('custom');
  const [isSorting, setIsSorting] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<Character[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // キャラクター一覧を取得
  useEffect(() => {
    fetchCharacters();
    
    // 1時間ごとに統計を自動更新
    intervalRef.current = setInterval(() => {
      updateAllCharacterStats();
    }, 60 * 60 * 1000); // 1時間
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  const fetchCharacters = async () => {
    try {
      setIsLoading(true);
      
      const response = await adminFetch(`/api/v1/admin/characters?locale=ja&includeInactive=true&sort=${sortMode}`);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Characters API response:', data);
        console.log('📊 Character sort orders:', data.characters?.map((c: Character) => ({ 
          id: c._id, 
          name: c.name.ja, 
          sortOrder: c.sortOrder 
        })));
        setCharacters(data.characters || []);
      } else {
        console.error('❌ Characters API error:', response.status, response.statusText);
        setError('キャラクター一覧の取得に失敗しました');
      }
    } catch (error) {
      console.error('❌ Characters fetch error:', error);
      setError('キャラクター一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 全キャラクターの統計を更新
  const updateAllCharacterStats = useCallback(async () => {
    try {
      setUpdatingStats(true);
      
      const response = await adminPost('/api/v1/admin/characters/update-stats', {});
      
      if (response.ok) {
        const data = await response.json();
        success('統計更新完了', `${data.updated}件のキャラクター統計を更新しました`);
        setLastStatsUpdate(new Date());
        
        // キャラクター一覧を再取得
        await fetchCharacters();
      } else {
        const errorData = await response.json();
        warning('統計更新エラー', errorData.error || '統計の更新に失敗しました');
      }
    } catch (error) {
      console.error('Statistics update error:', error);
      warning('統計更新エラー', '統計の更新に失敗しました');
    } finally {
      setUpdatingStats(false);
    }
  }, [success, warning]);

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = characters.findIndex(c => c._id === active.id);
      const newIndex = characters.findIndex(c => c._id === over?.id);

      const newCharacters = arrayMove(characters, oldIndex, newIndex);
      setCharacters(newCharacters);
    }
  };

  // 並び順をサーバーに保存
  const saveCharacterOrder = async (characterIds: string[]) => {
    try {
      setIsSorting(true);
      console.log('📤 Saving character order:', {
        characterIds,
        count: characterIds.length,
        firstId: characterIds[0],
        lastId: characterIds[characterIds.length - 1]
      });
      
      const response = await adminPut('/api/v1/admin/characters/reorder', { characterIds });

      if (response.ok) {
        success('並び順を保存しました');
      } else {
        const error = await response.json();
        console.error('📛 Reorder error response:', error);
        throw new Error(error.message || '並び順の保存に失敗しました');
      }
    } catch (error) {
      console.error('Order save error:', error);
      warning('保存エラー', '並び順の保存に失敗しました');
      // 元の順序に戻す
      fetchCharacters();
    } finally {
      setIsSorting(false);
    }
  };

  // デバッグ用テスト関数
  const testReorderDebug = async () => {
    try {
      const testIds = characters.slice(0, 3).map(c => c._id);
      console.log('🧪 Testing reorder-debug with IDs:', testIds);
      
      const response = await adminPost('/api/v1/admin/characters/reorder-debug', { 
        characterIds: testIds 
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🧪 Debug response:', data);
        if (!data.isArray || !data.characterIds) {
          console.error('❌ Body parsing issue detected!', data);
        } else {
          console.log('✅ Body parsing working correctly');
        }
      } else {
        console.error('❌ Debug request failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Debug test error:', error);
    }
  };

  // ドラッグモードの開始
  const startDragMode = () => {
    setIsDragMode(true);
    setOriginalOrder([...characters]);
    setSortMode('custom');
    // デバッグテストを実行
    testReorderDebug();
  };

  // ドラッグモードの保存
  const saveDragMode = async () => {
    // 実際のIDを確認
    const ids = characters.map(c => c._id);
    console.log('🔍 IDs to save:', ids);
    console.log('🔍 ID types:', ids.map(id => ({ id, type: typeof id, length: id?.length })));
    
    await saveCharacterOrder(ids);
    setIsDragMode(false);
    // 並び順を保存した後はカスタムソートモードを維持
    setSortMode('custom');
  };

  // ドラッグモードのキャンセル
  const cancelDragMode = () => {
    setCharacters(originalOrder);
    setIsDragMode(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">キャラクター管理</h1>
              <p className="text-sm text-gray-500 mt-1">
                AIキャラクターの作成・編集・公開状況管理
              </p>
            </div>
            
            {/* 統計更新ボタン */}
            <button
              onClick={updateAllCharacterStats}
              disabled={updatingStats}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                updatingStats 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title={lastStatsUpdate ? `最終更新: ${lastStatsUpdate.toLocaleString('ja-JP')}` : '統計を更新'}
            >
              <RefreshCw className={`w-4 h-4 ${updatingStats ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-sm">
                {updatingStats ? '更新中...' : '統計を更新'}
              </span>
            </button>
          </div>
          
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
            {/* ソートモード選択 */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              disabled={isDragMode}
            >
              <option value="custom">カスタム順</option>
              <option value="newest">新しい順</option>
              <option value="popular">人気順</option>
            </select>
            
            {/* ソートモード切り替え */}
            {!isDragMode && sortMode === 'custom' ? (
              <button
                onClick={startDragMode}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                title="並び順を変更"
              >
                <GripVertical className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">並び替え</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={saveDragMode}
                  disabled={isSorting}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">保存</span>
                </button>
                <button
                  onClick={cancelDragMode}
                  disabled={isSorting}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">キャンセル</span>
                </button>
              </div>
            )}
            {/* 検索 */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="キャラクター検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg  text-sm sm:w-auto"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              {/* フィルター */}
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none justify-center text-gray-700">
                <Filter className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">フィルター</span>
              </button>
              
              {/* エクスポート */}
              <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex-1 sm:flex-none justify-center">
                <Download className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">エクスポート</span>
              </button>
              
              {/* 新規追加 */}
              <button 
                onClick={() => window.location.href = '/admin/characters/new'}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex-1 sm:flex-none justify-center"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">新規作成</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-gray-600">読み込み中...</span>
            </div>
          ) : (
            <>
              {/* 統計カード */}
              <CharacterStats characters={characters} />
              
              {/* キャラクター管理テーブル */}
              {isDragMode ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={characters.map(c => c._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <CharacterManagementTable 
                      characters={characters} 
                      onCharacterDeleted={fetchCharacters}
                      isSortMode={true}
                    />
                  </SortableContext>
                </DndContext>
              ) : (
                <CharacterManagementTable 
                  characters={characters} 
                  onCharacterDeleted={fetchCharacters}
                  isSortMode={false}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}