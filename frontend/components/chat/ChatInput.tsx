'use client';

import React, { useState, useCallback, memo } from 'react';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ChatInputProps {
  characterName: string;
  themeColor: string;
  lastMessageCost: number;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export const ChatInput = memo(function ChatInput({
  characterName,
  themeColor,
  lastMessageCost,
  isLoading,
  onSendMessage,
  onTyping,
  onStopTyping
}: ChatInputProps) {
  const t = useTranslations('chatLayout');
  const [inputMessage, setInputMessage] = useState('');
  
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || isLoading) return;
    
    const messageToSend = inputMessage.trim();
    setInputMessage('');
    onStopTyping?.();
    onSendMessage(messageToSend);
  }, [inputMessage, isLoading, onSendMessage, onStopTyping]);
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (e.target.value.trim()) {
      onTyping?.();
    } else {
      onStopTyping?.();
    }
  }, [onTyping, onStopTyping]);
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-1 relative">
          <textarea
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={t('messagePlaceholder', { characterName })}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 placeholder-gray-500 text-base min-h-[52px]"
            rows={1}
            style={{ maxHeight: '80px' }}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {t('cost', { cost: lastMessageCost })}
          </div>
        </div>
        
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg min-h-[52px]"
          style={{ backgroundColor: themeColor }}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>
    </div>
  );
});