'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Orbitron } from 'next/font/google';
import Image from 'next/image';

const orbitron = Orbitron({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap'
});

export default function HomePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ja';
  const t = useTranslations('homepage');
  
  // Video state
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoElements, setVideoElements] = useState<HTMLVideoElement[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Chat bubble state
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [leftVisible, setLeftVisible] = useState(false);
  const [rightVisible, setRightVisible] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  const videoSources = useMemo(() => [
    '/video/hero-videos_01.mp4',
    '/video/hero-videos_02.mp4',
    '/video/hero-videos_03.mp4'
  ], []);

  // Fallback images for mobile
  const fallbackImages = useMemo(() => [
    '/images/hero/hero-fallback_01.jpg',
    '/images/hero/hero-fallback_02.jpg', 
    '/images/hero/hero-fallback_03.jpg'
  ], []);
  
  const chatMessages = t.raw('chatMessages') as string[];
  
  // Language switcher
  const handleLanguageSwitch = (newLocale: string) => {
    router.push(`/${newLocale}`);
  };
  
  // Mobile detection
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isMobile]);

  // Mobile image switching effect
  useEffect(() => {
    if (!mounted || !isMobile) return;
    
    let currentIndex = 0;
    
    const switchImage = () => {
      currentIndex = (currentIndex + 1) % fallbackImages.length;
      const heroImage = document.getElementById('hero-image') as HTMLImageElement;
      
      if (heroImage) {
        heroImage.style.opacity = '0';
        setTimeout(() => {
          heroImage.src = fallbackImages[currentIndex];
          heroImage.style.opacity = '1';
        }, 1000);
      }
    };
    
    // Set up image switching interval (6 seconds)
    const interval = setInterval(switchImage, 6000);
    
    return () => {
      clearInterval(interval);
    };
  }, [mounted, isMobile, fallbackImages]);
  
  // Chat bubble animation
  useEffect(() => {
    if (!chatMessages.length) return;
    
    let isLeft = true;
    let messageIndex = 0;
    let leftTimeout: NodeJS.Timeout;
    let rightTimeout: NodeJS.Timeout;
    
    const showLeft = () => {
      if (!chatMessages[messageIndex]) return;
      
      setLeftText('');
      setLeftVisible(true);
      setRightVisible(false);
      
      let charIndex = 0;
      const typeMessage = () => {
        const message = chatMessages[messageIndex];
        setLeftText(message.slice(0, charIndex + 1));
        if (charIndex < message.length - 1) {
          charIndex++;
          leftTimeout = setTimeout(typeMessage, 100); // 100ms per character
        }
      };
      
      typeMessage();
      
      leftTimeout = setTimeout(() => {
        setLeftVisible(false);
        setTimeout(() => {
          messageIndex = (messageIndex + 1) % chatMessages.length;
          setCurrentMessageIndex(messageIndex);
          showRight();
        }, 6000); // 6 second interval
      }, 4000); // 4 second display time
    };
    
    const showRight = () => {
      if (!chatMessages[messageIndex]) return;
      
      setRightText('');
      setLeftVisible(false);
      setRightVisible(true);
      
      let charIndex = 0;
      const typeMessage = () => {
        setRightText(chatMessages[messageIndex].slice(0, charIndex + 1));
        if (charIndex < chatMessages[messageIndex].length - 1) {
          charIndex++;
          rightTimeout = setTimeout(typeMessage, 100);
        }
      };
      
      typeMessage();
      
      rightTimeout = setTimeout(() => {
        setRightVisible(false);
        setTimeout(() => {
          messageIndex = (messageIndex + 1) % chatMessages.length;
          setCurrentMessageIndex(messageIndex);
          showLeft();
        }, 6000); // 6 second interval
      }, 4000); // 4 second display time
    };
    
    // Start with left bubble
    const initialTimeout = setTimeout(showLeft, 3000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(leftTimeout);
      clearTimeout(rightTimeout);
    };
  }, [chatMessages]);
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Video/Image Container */}
      <div className="absolute inset-0 w-full h-full">
        {/* Desktop: Video Background */}
        {mounted && !isMobile && (
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
        {mounted && isMobile && (
          <Image
            id="hero-image"
            src={fallbackImages[0]}
            alt="Hero Background"
            fill
            className="object-cover transition-opacity duration-[2000ms] ease-in-out"
            priority
            sizes="100vw"
          />
        )}
        
        {/* Fallback before mounted */}
        {!mounted && (
          <>
            <video
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out"
              style={{ opacity: 0, zIndex: 0 }}
              muted
              loop
              playsInline
            />
            <video
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out"
              style={{ opacity: 0, zIndex: 0 }}
              muted
              loop
              playsInline
            />
          </>
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
            {t('languageSwitch.jp')}
          </button>
          <span className="mx-1 text-white">|</span>
          <button
            onClick={() => handleLanguageSwitch('en')}
            className={`px-2 py-1 rounded transition-colors ${
              locale === 'en' ? 'text-pink-400' : 'text-white hover:text-pink-300'
            }`}
          >
            {t('languageSwitch.en')}
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="relative text-center w-full max-w-4xl">
          {/* Small Title */}
          <p className="text-white text-sm sm:text-base md:text-lg font-medium mb-4 tracking-wide">
            {t('title')}
          </p>
          
          {/* Main Logo */}
          <h1 
            className={`${orbitron.className} text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6`}
            style={{
              color: '#E95295',
              textShadow: '0 0 20px rgba(233, 82, 149, 0.5), 0 0 40px rgba(233, 82, 149, 0.3)'
            }}
          >
            {t('mainTitle')}
          </h1>
          
          {/* Tagline */}
          <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium mb-8 tracking-wide">
            {t('tagline')}
          </h2>
          
          {/* Description */}
          <p className="text-white text-sm sm:text-base md:text-lg mb-4 leading-relaxed opacity-90 whitespace-pre-line">
            {t('description')}
          </p>
          
          <p className="text-white text-xs sm:text-sm md:text-base mb-12 leading-relaxed opacity-80">
            {t('subDescription')}
          </p>
          
          {/* Login Button */}
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="flex items-center justify-center gap-3 text-white font-bold py-3 md:py-4 px-6 rounded-lg text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-6 mx-auto w-full max-w-xs"
            style={{
              backgroundColor: '#E95295',
              borderRadius: '8px'
            }}
          >
            {t('loginButton')}
            <Image
              src="/icon/arrow.svg"
              alt="Arrow"
              width={20}
              height={20}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </button>
          
          {/* New User Promo */}
          <div className="text-center mt-8 flex flex-col items-center">
            <button
              onClick={() => router.push(`/${locale}/register`)}
              className="text-base md:text-lg font-bold mb-1 hover:opacity-80 transition-colors underline cursor-pointer"
              style={{ color: '#E95295' }}
            >
              {t('newUserPromo')}
            </button>
            <div className="relative">
              <div 
                className="px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-semibold"
                style={{ 
                  color: '#E95295',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {t('tokenGift')}
              </div>
              {/* Speech bubble arrow pointing up to register button */}
              <div 
                className="absolute"
                style={{
                  left: '50%',
                  top: '-6px',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid rgba(255, 255, 255, 0.2)'
                }}
              />
            </div>
          </div>
          
          {/* Chat Bubbles - Desktop only */}
          <div className="hidden lg:block">
            <div
              className={`absolute max-w-sm p-5 bg-white rounded-2xl shadow-xl transition-opacity duration-600 z-20 chat-bubble ${
                leftVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: '540px',
                top: '-46px',
                pointerEvents: leftVisible ? 'auto' : 'none',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div className="text-gray-800 text-lg leading-relaxed font-medium">
                {leftText || '\u00A0'}
              </div>
              {/* Bubble tail */}
              <div 
                className="absolute"
                style={{
                  left: '22px',
                  bottom: '-8px',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid white'
                }}
              />
            </div>
            
            <div
              className={`absolute max-w-sm p-5 bg-white rounded-2xl shadow-xl transition-opacity duration-600 z-20 chat-bubble ${
                rightVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                right: '530px',
                top: '-30px',
                pointerEvents: rightVisible ? 'auto' : 'none',
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div className="text-gray-800 text-lg leading-relaxed font-medium">
                {rightText || '\u00A0'}
              </div>
              {/* Bubble tail */}
              <div 
                className="absolute"
                style={{
                  right: '30px',
                  bottom: '-7px',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid white'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}