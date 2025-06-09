'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Orbitron } from 'next/font/google';
import Image from 'next/image';

const orbitron = Orbitron({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap'
});

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'ja';
  const t = useTranslations('login');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
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

  // Language switcher
  const handleLanguageSwitch = (newLocale: string) => {
    router.push(`/${newLocale}/login`);
  };

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
    activeVideo.play().catch(() => {
      // Ignore play errors
    });
    
    const switchVideo = () => {
      currentIndex = (currentIndex + 1) % videoSources.length;
      setCurrentVideoIndex(currentIndex);
      
      nextVideo.src = videoSources[currentIndex];
      nextVideo.style.opacity = '0';
      nextVideo.style.zIndex = '2';
      nextVideo.load();
      
      nextVideo.addEventListener('canplay', () => {
        nextVideo.play().catch(() => {
          // Ignore play errors
        });
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
  }, [mounted, isMobile, videoSources]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 ログイン実行中...');
      
      // TODO: 実際のログインAPI呼び出し
      const testToken = 'test-token-12345';
      localStorage.setItem('token', testToken);
      
      console.log('✅ ログイン成功');
      router.push(`/${locale}/characters`);
      
    } catch (err) {
      console.error('❌ ログインエラー:', err);
      setError('ログインに失敗しました。もう一度お試しください。');
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
      
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center bg-black bg-opacity-30 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
          <button
            onClick={() => handleLanguageSwitch('ja')}
            className={`px-2 py-1 rounded transition-colors ${
              locale === 'ja' ? 'text-pink-400' : 'text-white hover:text-pink-300'
            }`}
          >
            JP
          </button>
          <span className="mx-1 text-white">|</span>
          <button
            onClick={() => handleLanguageSwitch('en')}
            className={`px-2 py-1 rounded transition-colors ${
              locale === 'en' ? 'text-pink-400' : 'text-white hover:text-pink-300'
            }`}
          >
            EN
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Title */}
            <h1 
              className={`${orbitron.className} text-center text-2xl md:text-3xl font-bold mb-8`}
              style={{ color: '#E91E63' }}
            >
              {t('title')}
            </h1>
            
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              
              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ backgroundColor: '#E91E63' }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ログイン中...
                  </div>
                ) : (
                  t('loginButton')
                )}
              </button>
            </form>
            
            {/* Register Link */}
            <div className="text-center mt-6">
              <span className="text-gray-600 text-sm">
                {t('noAccount')} 
              </span>
              <button
                onClick={() => router.push(`/${locale}/register`)}
                className="ml-1 font-bold text-sm hover:opacity-80 transition-colors"
                style={{ color: '#E91E63' }}
              >
                {t('register')}
              </button>
            </div>
          </div>
          
          {/* Back to TOP Link */}
          <div className="text-center mt-6">
            <button
              onClick={() => router.push(`/${locale}`)}
              className="text-white text-sm hover:opacity-80 transition-colors underline"
            >
              {t('backToTop')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}