'use client';

import React from 'react';
import { MessageSquare, Clock, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('recentChats');
  const tGeneral = useTranslations('general');
  
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}${tGeneral('minutes')}${tGeneral('ago')}`;
    } else if (diffInMinutes < 1440) { // 24時間
      return `${Math.floor(diffInMinutes / 60)}${tGeneral('hours')}${tGeneral('ago')}`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}${tGeneral('days')}${tGeneral('ago')}`;
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
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">{t('noHistory')}</p>
          <button 
            onClick={handleNewChatClick}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
{t('startChatting')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
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
                  alt={typeof chat.character.name === 'object' ? chat.character.name[locale as keyof LocalizedString] || chat.character.name.ja || 'Character' : chat.character.name || 'Character'}
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
                    {typeof chat.character.name === 'object' ? chat.character.name[locale as keyof LocalizedString] || chat.character.name.ja || 'Unknown Character' : chat.character.name || 'Unknown Character'}
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
{chat.messageCount}{t('messagesCount')}
                  </span>
                  <div className="flex items-center space-x-1 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium">{t('continueReading')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}