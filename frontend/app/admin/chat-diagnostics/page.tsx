'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/utils/admin-api';
import { Search, RefreshCw, MessageSquare, Database, Users, Brain } from 'lucide-react';

interface Character {
  _id: string;
  name: { ja: string; en: string };
  imageCharacterSelect?: string;
  totalMessages?: number;
  totalUsers?: number;
}

export default function AdminChatDiagnosticsPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/v1/admin/characters?locale=ja&includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
        if (data.characters.length > 0 && !selectedCharacterId) {
          setSelectedCharacterId(data.characters[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCharacters = characters.filter(char => {
    const name = typeof char.name === 'string' ? char.name : (char.name?.ja || '');
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacterId(characterId);
    // 新しいタブで診断ページを開く
    window.open(`/admin/chat-diagnostics/${characterId}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 p-4 md:p-6 pr-16 lg:pr-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">チャット診断</h1>
            <p className="text-sm text-gray-500 mt-1">
              キャラクターごとのチャットシステムの詳細診断
            </p>
          </div>
          
          <button
            onClick={fetchCharacters}
            disabled={loading}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              loading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-sm">更新</span>
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* 検索バー */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="キャラクター名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-gray-600">読み込み中...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCharacters.map((character) => (
                <div
                  key={character._id}
                  onClick={() => handleCharacterSelect(character._id)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {character.imageCharacterSelect ? (
                        <img
                          src={character.imageCharacterSelect}
                          alt={character.name?.ja || 'Character'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-sm font-medium">
                          {(character.name?.ja || '?').charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {character.name?.ja || 'Unknown'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        ID: {character._id.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">
                        {(character.totalMessages || 0).toLocaleString()} メッセージ
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">
                        {(character.totalUsers || 0).toLocaleString()} ユーザー
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">クリックして診断を開く</span>
                    <Brain className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredCharacters.length === 0 && !loading && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">キャラクターが見つかりません</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}