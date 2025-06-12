'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Orbitron } from 'next/font/google';
import Image from 'next/image';
import { getCurrentUser, authenticatedFetch } from '../../../utils/auth';

const orbitron = Orbitron({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap'
});

export default function SetupPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'ja';
  
  const [step, setStep] = useState(1); // 1: 名前入力, 2: キャラ選択
  const [name, setName] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const videoSources = [
    '/video/hero-videos_01.mp4',
    '/video/hero-videos_02.mp4',
    '/video/hero-videos_03.mp4'
  ];

  const fallbackImages = [
    '/images/hero/hero-fallback_01.jpg',
    '/images/hero/hero-fallback_02.jpg', 
    '/images/hero/hero-fallback_03.jpg'
  ];

  // 認証チェック
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    
    // セットアップ済みの場合はホームへ
    if (user.isSetupComplete) {
      router.push(`/${locale}/characters`);
      return;
    }
  }, [locale, router]);

  // Mobile detection
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Video switching effect (desktop only)
  useEffect(() => {
    if (!mounted || isMobile) return;
    
    const video1 = document.getElementById('video1') as HTMLVideoElement;
    const video2 = document.getElementById('video2') as HTMLVideoElement;
    
    if (!video1 || !video2) return;
    
    let currentIndex = 0;
    let activeVideo = video1;
    let nextVideo = video2;
    
    activeVideo.src = videoSources[0];
    activeVideo.style.opacity = '1';
    activeVideo.style.zIndex = '1';
    activeVideo.load();
    activeVideo.play().catch(() => {});
    
    const switchVideo = () => {
      currentIndex = (currentIndex + 1) % videoSources.length;
      
      nextVideo.src = videoSources[currentIndex];
      nextVideo.style.opacity = '0';
      nextVideo.style.zIndex = '2';
      nextVideo.load();
      
      nextVideo.addEventListener('canplay', () => {
        nextVideo.play().catch(() => {});
        nextVideo.style.opacity = '1';
        activeVideo.style.opacity = '0';
        
        setTimeout(() => {
          const temp = activeVideo;
          activeVideo = nextVideo;
          nextVideo = temp;
          
          activeVideo.style.zIndex = '1';
          nextVideo.style.zIndex = '0';
        }, 2000);
      }, { once: true });
    };
    
    const interval = setInterval(switchVideo, 7000);
    
    return () => {
      clearInterval(interval);
    };
  }, [mounted, isMobile]);

  // キャラクター取得
  useEffect(() => {
    if (step === 2) {
      fetchCharacters();
    }
  }, [step]);

  const fetchCharacters = async () => {
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004'}/api/characters?locale=${locale}`);
      
      if (response.ok) {
        const data = await response.json();
        // 無料キャラクターのみをフィルタリング（初回セットアップ用）
        const freeCharacters = (data.characters || []).filter((char: any) => 
          char.characterAccessType === 'free'
        );
        setCharacters(freeCharacters);
        console.log('✅ セットアップ用キャラクター取得:', freeCharacters.length, '個');
      } else {
        setError('キャラクター情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('❌ Characters fetch error:', error);
      setError('キャラクター情報の取得に失敗しました');
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('お名前を入力してください');
      return;
    }

    setError('');
    setStep(2); // キャラ選択画面へ
  };

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacter(characterId);
  };

  const handleSetupComplete = async () => {
    if (!selectedCharacter) {
      setError('キャラクターを選択してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004'}/api/user/setup-complete`, {
        method: 'POST',
        body: JSON.stringify({ 
          name: name.trim(), 
          selectedCharacterId: selectedCharacter 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // ユーザー情報をローカルストレージに更新
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log('✅ セットアップ完了');
        router.push(`/${locale}/characters`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'セットアップに失敗しました');
      }
    } catch (error) {
      console.error('❌ Setup completion error:', error);
      setError('セットアップに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Video/Image Container */}
      <div className="absolute inset-0 w-full h-full">
        {/* Desktop: Video Background */}
        {!isMobile && (
          <>
            <video
              id="video1"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out"
              style={{ opacity: 0, zIndex: 0 }}
              muted
              loop
              playsInline
            />
            <video
              id="video2"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out"
              style={{ opacity: 0, zIndex: 0 }}
              muted
              loop
              playsInline
            />
          </>
        )}
        
        {/* Mobile: Static Image Background */}
        {isMobile && (
          <Image
            src={fallbackImages[0]}
            alt="Background"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        
        {/* Noise Overlay */}
        <div className="absolute inset-0 w-full h-full noise-overlay" />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60" />
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Setup Card */}
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {step === 1 ? (
              <>
                {/* Step 1: 名前入力 */}
                <h1 
                  className={`${orbitron.className} text-center text-2xl md:text-3xl font-bold mb-4`}
                  style={{ color: '#E91E63' }}
                >
                  はじめまして！
                </h1>
                
                <p className="text-center text-gray-600 mb-8">
                  あなたのお名前を教えてください
                </p>
                
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                
                {/* Name Form */}
                <form onSubmit={handleNameSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      お名前
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例：太郎"
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg outline-none text-gray-900 focus:ring-2"
                      style={{ focusRingColor: '#E91E63' }}
                      autoFocus
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: '#E91E63' }}
                  >
                    次へ
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Step 2: キャラ選択 */}
                <h1 
                  className="text-center text-2xl md:text-3xl font-bold mb-4"
                  style={{ color: '#E91E63' }}
                >
                  こんにちは、{name}さん！
                </h1>
                
                <p className="text-center text-gray-600 mb-8">
                  チャットで会話したいキャラクターを選択してください
                </p>
                
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                
                {/* Character Selection - Card Layout */}
                <div className="mb-6 max-h-96 overflow-y-auto overflow-x-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                    {characters.map((character) => (
                      <div
                        key={character._id}
                        onClick={() => handleCharacterSelect(character._id)}
                        className={`relative bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group ${
                          selectedCharacter === character._id
                            ? 'ring-4 ring-pink-500 shadow-xl'
                            : 'shadow-md hover:shadow-lg hover:border-pink-400 border-2 border-transparent'
                        }`}
                      >
                      {/* 選択インジケーター */}
                      {selectedCharacter === character._id && (
                        <div className="absolute top-2 right-2 z-10 bg-pink-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* キャラクター画像 */}
                      <div className="aspect-square w-full bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
                        {character.imageCharacterSelect ? (
                          <img
                            src={character.imageCharacterSelect}
                            alt={character.name[locale] || character.name.ja}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-pink-400">
                            {(character.name[locale] || character.name.ja)?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      
                      {/* キャラクター情報 */}
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {character.name[locale] || character.name.ja}
                        </h3>
                        <p className="text-sm text-pink-600 font-medium">
                          {character.personalityPreset}
                        </p>
                        {character.description && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {character.description[locale] || character.description.ja}
                          </p>
                        )}
                      </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleSetupComplete}
                  disabled={!selectedCharacter || isLoading}
                  className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ backgroundColor: '#E91E63' }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      セットアップ中...
                    </div>
                  ) : (
                    'チャットを始める'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}