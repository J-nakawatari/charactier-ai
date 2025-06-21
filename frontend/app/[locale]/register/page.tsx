'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Orbitron } from 'next/font/google';
import Image from 'next/image';
import { API_BASE_URL } from '@/lib/api-config';
import { TermsModal } from '@/components/TermsModal';
import { PrivacyModal } from '@/components/PrivacyModal';
import { CommercialTransactionModal } from '@/components/CommercialTransactionModal';

const orbitron = Orbitron({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap'
});

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string || 'ja';
  const t = useTranslations('register');
  const tFooter = useTranslations('footer');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showCommercialModal, setShowCommercialModal] = useState(false);
  
  const videoSources = [
    '/video/hero-videos_01.mp4',
    '/video/hero-videos_02.mp4',
    '/video/hero-videos_03.mp4'
  ];

  const fallbackImages = [
    '/images/hero/hero-fallback_01.png',
    '/images/hero/hero-fallback_02.png', 
    '/images/hero/hero-fallback_03.png'
  ];

  // Language switcher
  const handleLanguageSwitch = (newLocale: string) => {
    router.push(`/${newLocale}/register`);
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
    
    // Initialize first video
    activeVideo.src = videoSources[0];
    activeVideo.style.opacity = '1';
    activeVideo.style.zIndex = '1';
    activeVideo.load();
    activeVideo.play().catch(() => {
      // Ignore play errors
    });
    
    const switchVideo = () => {
      currentIndex = (currentIndex + 1) % videoSources.length;
      
      // Prepare next video
      nextVideo.src = videoSources[currentIndex];
      nextVideo.style.opacity = '0';
      nextVideo.style.zIndex = '2';
      nextVideo.load();
      
      nextVideo.addEventListener('canplay', () => {
        nextVideo.play().catch(() => {
          // Ignore play errors
        });
        
        // Smooth transition without DOM manipulation
        nextVideo.style.opacity = '1';
        activeVideo.style.opacity = '0';
        
        setTimeout(() => {
          // Swap videos
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isMobile]);

  const validateForm = () => {
    const errors = {
      email: '',
      password: '',
      confirmPassword: ''
    };
    
    let hasErrors = false;
    
    // Email validation
    if (!email.trim()) {
      errors.email = t('errors.required');
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t('errors.invalidEmail');
      hasErrors = true;
    }
    
    // Password validation
    if (!password) {
      errors.password = t('errors.required');
      hasErrors = true;
    } else if (password.length < 6) {
      errors.password = 'パスワードは6文字以上で入力してください';
      hasErrors = true;
    }
    
    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = t('errors.required');
      hasErrors = true;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('errors.passwordMismatch');
      hasErrors = true;
    }
    
    setFieldErrors(errors);
    
    if (hasErrors) {
      setError('入力内容に誤りがあります。各項目をご確認ください。');
      return false;
    }
    
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    // バリデーション成功時にエラーをクリア
    setFieldErrors({
      email: '',
      password: '',
      confirmPassword: ''
    });
    
    setIsLoading(true);

    try {
      console.log('🔐 新規登録実行中...');
      
      // バックエンドの登録APIを呼び出し（名前は一時的に空文字で登録）
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '登録に失敗しました');
      }
      
      // JWTトークンを保存
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('✅ 新規登録成功');
      // 初回セットアップ画面に遷移
      router.push(`/${locale}/setup`);
      
    } catch (err: any) {
      console.error('❌ 新規登録エラー:', err);
      setError(err.message || '登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
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
      <div className="relative z-10 flex items-center justify-center min-h-dvh px-4 py-8">
        <div className="w-full max-w-md">
          {/* Register Card */}
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Title */}
            <h1 
              className={`${orbitron.className} text-center text-2xl md:text-3xl font-bold mb-4`}
              style={{ color: '#E95295' }}
            >
              {t('title')}
            </h1>
            
            {/* Subtitle */}
            <p 
              className="text-center text-sm mb-6 font-medium"
              style={{ color: '#E95295' }}
            >
              {t('subtitle')}
            </p>
            
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            {/* Register Form */}
            <form onSubmit={handleRegister} noValidate className="space-y-5">
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
                  className={`w-full px-4 py-3 bg-gray-100 border rounded-lg outline-none text-gray-900 ${
                    fieldErrors.email ? 'border-pink-500' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.email && (
                  <div className="mt-2 p-3 rounded-lg shadow-lg relative" style={{ backgroundColor: '#E95295' }}>
                    <p className="text-white text-sm font-medium">{fieldErrors.email}</p>
                    <div 
                      className="absolute left-4 -top-2 w-0 h-0"
                      style={{
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '8px solid #E95295'
                      }}
                    />
                  </div>
                )}
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
                  className={`w-full px-4 py-3 bg-gray-100 border rounded-lg outline-none text-gray-900 ${
                    fieldErrors.password ? 'border-pink-500' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.password && (
                  <div className="mt-2 p-3 rounded-lg shadow-lg relative" style={{ backgroundColor: '#E95295' }}>
                    <p className="text-white text-sm font-medium">{fieldErrors.password}</p>
                    <div 
                      className="absolute left-4 -top-2 w-0 h-0"
                      style={{
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '8px solid #E95295'
                      }}
                    />
                  </div>
                )}
              </div>
              
              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmPasswordPlaceholder')}
                  className={`w-full px-4 py-3 bg-gray-100 border rounded-lg outline-none text-gray-900 ${
                    fieldErrors.confirmPassword ? 'border-pink-500' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.confirmPassword && (
                  <div className="mt-2 p-3 rounded-lg shadow-lg relative" style={{ backgroundColor: '#E95295' }}>
                    <p className="text-white text-sm font-medium">{fieldErrors.confirmPassword}</p>
                    <div 
                      className="absolute left-4 -top-2 w-0 h-0"
                      style={{
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '8px solid #E95295'
                      }}
                    />
                  </div>
                )}
              </div>
              
              
              {/* Terms Agreement */}
              <div className="text-xs text-gray-600 leading-relaxed">
                {t('terms')}
                <button
                  type="button"
                  className="underline hover:opacity-80 transition-colors"
                  style={{ color: '#E95295' }}
                  onClick={() => setShowTermsModal(true)}
                >
                  {t('termsOfService')}
                </button>
                {t('and')}
                <button
                  type="button"
                  className="underline hover:opacity-80 transition-colors ml-1"
                  style={{ color: '#E95295' }}
                  onClick={() => setShowPrivacyModal(true)}
                >
                  {t('privacyPolicy')}
                </button>
                {t('termsAccept')}
              </div>
              
              {/* Register Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 sm:py-3 px-4 rounded-lg text-white font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
                style={{ backgroundColor: '#E95295' }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    登録中...
                  </div>
                ) : (
                  t('registerButton')
                )}
              </button>
            </form>
            
            {/* Login Link */}
            <div className="text-center mt-6">
              <span className="text-gray-600 text-sm">
                {t('hasAccount')} 
              </span>
              <button
                onClick={() => router.push(`/${locale}/login`)}
                className="ml-1 font-bold text-sm hover:opacity-80 transition-colors"
                style={{ color: '#E95295' }}
              >
                {t('login')}
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
      
      {/* Footer with Commercial Transaction Act link */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-20">
        <button
          onClick={() => setShowCommercialModal(true)}
          className="text-white text-sm hover:opacity-80 transition-opacity underline"
        >
          {tFooter('commercialTransaction')}
        </button>
      </div>
      
      {/* Modals */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <CommercialTransactionModal 
        isOpen={showCommercialModal} 
        onClose={() => setShowCommercialModal(false)} 
      />
    </div>
  );
}