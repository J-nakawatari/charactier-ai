'use client';

import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Image from 'next/image';
import { Coins } from 'lucide-react';
import { Message } from '@/types/common';

// ChatLayout向けの文字列ベースCharacter型
interface Character {
  _id: string;
  name: string; // すでに多言語処理済み文字列
  description: string; // すでに多言語処理済み文字列
  imageChatAvatar: string;
  imageChatBackground: string;
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
}

interface MessageItemProps {
  message: Message;
  character: Character;
}

export function MessageItem({ message, character }: MessageItemProps) {
  const isUser = message.role === 'user';
  const timeAgo = formatDistanceToNow(message.timestamp, { 
    addSuffix: true, 
    locale: ja 
  });

  if (isUser) {
    return (
      <div className="flex items-start justify-end space-x-3">
        <div className="flex-1 flex flex-col items-end">
          <div className="bg-purple-600/80 backdrop-blur-sm text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs lg:max-w-md shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            {message.tokens && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Coins className="w-3 h-3" />
                <span>{message.tokens}</span>
              </div>
            )}
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2 sm:space-x-3">
      {/* キャラアイコン - モバイルでも表示 */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
        <Image 
          src={character.imageChatAvatar} 
          alt={character.name}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        {/* 名前とタイムスタンプ - モバイルでも表示 */}
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs sm:text-sm font-medium text-gray-800">{character.name}</span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        
        {/* メッセージ内容 */}
        <div 
          className="inline-block bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3 shadow-sm border border-gray-200/30 max-w-xs sm:max-w-sm lg:max-w-md"
          style={{ borderLeftColor: character.themeColor, borderLeftWidth: '3px' }}
        >
          <p className="text-xs sm:text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* トークン消費情報 - モバイルでも表示 */}
        {message.tokens && (
          <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
            <Coins className="w-3 h-3" />
            <span>消費: {message.tokens}枚</span>
          </div>
        )}
      </div>
    </div>
  );
}