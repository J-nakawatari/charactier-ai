'use client';

import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Coins } from 'lucide-react';

interface Character {
  _id: string;
  name: string;
  description: string;
  imageChatAvatar: string;
  imageChatBackground: string;
  currentMood: 'happy' | 'sad' | 'angry' | 'shy' | 'excited';
  themeColor: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
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
          <div className="bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs lg:max-w-md shadow-sm">
            <p className="text-sm leading-relaxed">{message.content}</p>
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
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
        <img 
          src={character.imageChatAvatar} 
          alt={character.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-800">{character.name}</span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>
        
        <div 
          className="inline-block bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-200/50 max-w-xs lg:max-w-md"
          style={{ borderLeftColor: character.themeColor, borderLeftWidth: '3px' }}
        >
          <p className="text-sm leading-relaxed text-gray-800">{message.content}</p>
        </div>
        
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