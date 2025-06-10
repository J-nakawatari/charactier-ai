'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// ChatLayout向けの文字列ベースCharacter型
interface Character {
  _id: string;
  name: string; // すでに多言語処理済み文字列
  imageChatAvatar: string;
  themeColor: string;
}

interface TypingIndicatorProps {
  character: Character;
  isVisible: boolean;
}

export function TypingIndicator({ character, isVisible }: TypingIndicatorProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="flex items-start space-x-2 sm:space-x-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
        <Image 
          src={character.imageChatAvatar} 
          alt={character.name}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1">
        <div 
          className="inline-block bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2 sm:py-3 shadow-sm border border-gray-200/30"
          style={{ borderLeftColor: character.themeColor }}
        >
          <div className="flex items-center space-x-2">
            {/* タイピングアニメーション */}
            <div className="flex items-center space-x-1">
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  backgroundColor: character.themeColor,
                  animationDelay: '0ms',
                  animationDuration: '1000ms'
                }}
              ></div>
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  backgroundColor: character.themeColor,
                  animationDelay: '200ms',
                  animationDuration: '1000ms'
                }}
              ></div>
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ 
                  backgroundColor: character.themeColor,
                  animationDelay: '400ms',
                  animationDuration: '1000ms'
                }}
              ></div>
            </div>
            
            {/* タイピングテキスト */}
            <span className="text-xs text-gray-500 select-none">
              {character.name}が入力中{dots}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}