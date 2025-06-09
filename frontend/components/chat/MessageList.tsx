'use client';

import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';

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

interface MessageListProps {
  messages: Message[];
  character: Character;
  isLoading: boolean;
}

export function MessageList({ messages, character, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 新しいメッセージが追加されたら自動スクロール
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent relative z-20"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img 
                src={character.imageChatAvatar} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {character.name}との会話を始めよう
            </h3>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              {character.description}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageItem 
            key={message.id}
            message={message}
            character={character}
          />
        ))}

        {isLoading && (
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
              <img 
                src={character.imageChatAvatar} 
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div 
                className="inline-block bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3 shadow-sm border border-gray-200/30"
                style={{ borderLeftColor: character.themeColor }}
              >
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}