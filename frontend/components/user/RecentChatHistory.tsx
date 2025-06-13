'use client';

import React from 'react';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface LocalizedString {
  ja: string;
  en: string;
}

interface RecentChat {
  _id: string;
  character: {
    _id: string;
    name: LocalizedString;
    imageCharacterSelect: string;
  };
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
}

interface RecentChatHistoryProps {
  recentChats: RecentChat[];
  locale: string;
}

export default function RecentChatHistory({ recentChats, locale }: RecentChatHistoryProps) {
  const router = useRouter();
  
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 1440) { // 24時間
      return `${Math.floor(diffInMinutes / 60)}時間前`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}日前`;
    }
  };

  const handleChatClick = (chatId: string, characterId: string) => {
    // キャラクターのチャット画面に遷移
    router.push(`/${locale}/characters/${characterId}/chat`);
  };

  const handleNewChatClick = () => {
    // キャラクター一覧画面に遷移
    router.push(`/${locale}/characters`);
  };

  if ((recentChats || []).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">最近のチャット</h3>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">まだチャット履歴がありません</p>
          <button 
            onClick={handleNewChatClick}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            キャラクターと話してみる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">最近のチャット</h3>
        </div>
        <button 
          onClick={handleNewChatClick}
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          すべて見る
        </button>
      </div>

      {/* チャット履歴リスト */}
      <div className="space-y-3">
        {(recentChats || []).map((chat) => (
          <div
            key={chat._id}
            onClick={() => handleChatClick(chat._id, chat.character._id)}
            className="group p-4 border border-gray-200 rounded-lg hover:border-purple-200 hover:bg-purple-50 transition-all cursor-pointer"
          >
            <div className="flex items-start space-x-3">
              {/* キャラクターアバター */}
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                <Image
                  src={chat.character.imageCharacterSelect}
                  alt={chat.character.name[locale as keyof LocalizedString]}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* チャット情報 */}
              <div className="flex-1 min-w-0">
                {/* キャラクター名と時間 */}
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {chat.character.name[locale as keyof LocalizedString]}
                  </h4>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(chat.lastMessageAt)}</span>
                  </div>
                </div>

                {/* 最後のメッセージ */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {chat.lastMessage}
                </p>

                {/* メッセージ数と続きボタン */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {chat.messageCount}件のメッセージ
                  </span>
                  <div className="flex items-center space-x-1 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium">続きを読む</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <button 
            onClick={handleNewChatClick}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            新しいチャットを開始
          </button>
        </div>
      </div>
    </div>
  );
}