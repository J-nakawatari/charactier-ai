'use client';

import { useState, useEffect } from 'react';
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
  
  // Chat bubble state
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [leftVisible, setLeftVisible] = useState(false);
  const [rightVisible, setRightVisible] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  const videoSources = [
    '/video/hero-videos_01.mp4',
    '/video/hero-videos_02.mp4',
    '/video/hero-videos_03.mp4'
  ];
  
  const chatMessages = t.raw('chatMessages') as string[];
  
  // Language switcher
  const handleLanguageSwitch = (newLocale: string) => {
    router.push(`/${newLocale}`);
  };
  
  // Video switching effect
  useEffect(() => {
    const video1 = document.getElementById('video1') as HTMLVideoElement;
    const video2 = document.getElementById('video2') as HTMLVideoElement;
    
    if (!video1 || !video2) return;
    
    setVideoElements([video1, video2]);
    
    let currentIndex = 0;
    let activeVideo = video1;
    let nextVideo = video2;
    
    // Initialize first video
    activeVideo.src = videoSources[0];
    activeVideo.style.opacity = '1';
    activeVideo.style.zIndex = '1';
    activeVideo.load();
    activeVideo.play();
    
    const switchVideo = () => {
      currentIndex = (currentIndex + 1) % videoSources.length;
      setCurrentVideoIndex(currentIndex);
      
      // Prepare next video
      nextVideo.src = videoSources[currentIndex];
      nextVideo.style.opacity = '0';
      nextVideo.style.zIndex = '2';
      nextVideo.load();
      
      nextVideo.addEventListener('canplay', () => {
        nextVideo.play();
        
        // Fade transition
        nextVideo.style.opacity = '1';
        activeVideo.style.opacity = '0';
        
        setTimeout(() => {
          // Swap videos
          const temp = activeVideo;
          activeVideo = nextVideo;
          nextVideo = temp;
          
          activeVideo.style.zIndex = '1';
          nextVideo.style.zIndex = '0';
        }, 2000); // 2s fade duration
      }, { once: true });
    };
    
    const interval = setInterval(switchVideo, 7000); // 7s interval
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
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
      {/* Background Video Container */}
      <div className="absolute inset-0 w-full h-full">
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
        <div className="relative text-center" style={{ width: '50rem' }}>
          {/* Small Title */}
          <p className="text-white text-lg font-medium mb-4 tracking-wide">
            {t('title')}
          </p>
          
          {/* Main Logo */}
          <h1 
            className={`${orbitron.className} text-6xl md:text-8xl font-bold mb-6`}
            style={{
              color: '#E91E63',
              textShadow: '0 0 20px rgba(233, 30, 99, 0.5), 0 0 40px rgba(233, 30, 99, 0.3)'
            }}
          >
            {t('mainTitle')}
          </h1>
          
          {/* Tagline */}
          <h2 className="text-white text-2xl md:text-3xl font-medium mb-8 tracking-wide">
            {t('tagline')}
          </h2>
          
          {/* Description */}
          <p className="text-white text-base md:text-lg mb-4 leading-relaxed opacity-90 whitespace-pre-line">
            {t('description')}
          </p>
          
          <p className="text-white text-sm md:text-base mb-12 leading-relaxed opacity-80">
            {t('subDescription')}
          </p>
          
          {/* Login Button */}
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="flex items-center justify-center gap-3 text-white font-bold py-4 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl mb-6 mx-auto"
            style={{
              backgroundColor: '#E91E63',
              borderRadius: '8px',
              width: '320px'
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
              className="text-lg font-bold mb-1 hover:opacity-80 transition-colors underline cursor-pointer"
              style={{ color: '#E91E63' }}
            >
              {t('newUserPromo')}
            </button>
            <div className="relative">
              <div 
                className="px-4 py-2 rounded-lg text-base font-semibold"
                style={{ 
                  color: '#E91E63',
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
          
          {/* Chat Bubbles - Hidden on mobile for better UX */}
          <div className="hidden md:block">
            <div
              className={`absolute max-w-sm p-5 bg-white rounded-2xl shadow-xl transition-opacity duration-600 z-20 chat-bubble ${
                leftVisible ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: '499px',
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
                right: '490px',
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