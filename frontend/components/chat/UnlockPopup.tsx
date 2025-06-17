'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Star, Heart, Gift, Sparkles } from 'lucide-react';

interface UnlockPopupProps {
  level: number;
  illustration: string;
  characterName: string;
  onClose: () => void;
}

export function UnlockPopup({ level, illustration, characterName, onClose }: UnlockPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300); // アニメーション完了後にクローズ
  }, [onClose]);

  useEffect(() => {
    // アニメーション開始
    setIsVisible(true);
    setShowConfetti(true);
    
    // 紙吹雪エフェクトを3秒後に停止
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    // 10秒後に自動で閉じる
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, 10000);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [handleClose]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
      isVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'
    }`}>
      {/* 紙吹雪エフェクト */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                fontSize: `${12 + Math.random() * 8}px`
              }}
            >
              {['✨', '🎉', '💖', '⭐', '🌟'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* メインポップアップ */}
      <div className={`relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-500 ${
        isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-12'
      }`}>
        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-t-2xl p-6 text-center overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-pink-400/20 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Star className="w-6 h-6 text-yellow-300 animate-spin" />
              <h2 className="text-xl font-bold">レベルアップ！</h2>
              <Star className="w-6 h-6 text-yellow-300 animate-spin" style={{ animationDirection: 'reverse' }} />
            </div>
            
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Heart className="w-8 h-8 text-pink-300 animate-pulse" />
              <span className="text-3xl font-bold">Lv.{level}</span>
              <Heart className="w-8 h-8 text-pink-300 animate-pulse" />
            </div>
            
            <p className="text-sm opacity-90">
              {characterName}との関係がより深まりました！
            </p>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="p-6">
          {/* アンロック特典 */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-purple-200">
                <Gift className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              新しいイラストが解放されました！
            </h3>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-purple-700">{illustration}</span>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-sm text-gray-600">
                ギャラリーで確認できます
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="space-y-3">
            <button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
              onClick={() => {
                // TODO: ギャラリーページへの遷移
                console.log('Navigate to gallery');
                handleClose();
              }}
            >
              ギャラリーで確認する
            </button>
            
            <button 
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              onClick={handleClose}
            >
              会話を続ける
            </button>
          </div>
        </div>

        {/* 下部装飾 */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-b-2xl"></div>
      </div>
    </div>
  );
}