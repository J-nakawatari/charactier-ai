import type { Metadata, Viewport } from 'next';
import { Inter, Marvel, Maven_Pro, Orbitron } from 'next/font/google';
import { ToastProvider } from '@/contexts/ToastContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const marvel = Marvel({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap'
});
const mavenPro = Maven_Pro({ 
  weight: ['900'], 
  subsets: ['latin'],
  display: 'swap'
});
const orbitron = Orbitron({ 
  weight: ['400', '700'], 
  subsets: ['latin'],
  display: 'swap'
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#9333EA',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'Charactier AI - 個性豊かなAIキャラクターとチャット | 24時間365日話し相手',
    template: '%s | Charactier AI'
  },
  description: 'Charactier（キャラクティア）は、あなた好みのAIキャラーと気持ちを共有しながら過ごす新しいコミュニケーション体験です。24時間いつでも話せる、あなただけのAIパートナーを見つけましょう。親密度システムで関係性が深まります。',
  keywords: ['AI チャット', 'AIキャラクター', 'バーチャル友達', 'AI会話', 'チャットボット', 'AI恋愛', 'AIパートナー', '24時間チャット', '親密度システム', 'Charactier'],
  authors: [{ name: 'Charactier AI Team' }],
  creator: 'Charactier AI',
  publisher: 'Charactier AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://charactier-ai.com'),
  openGraph: {
    title: 'Charactier AI - 個性豊かなAIキャラクターとチャット',
    description: '24時間いつでも話せる、あなただけのAIパートナー。親密度が上がるほど深い関係に。',
    url: 'https://charactier-ai.com',
    siteName: 'Charactier AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Charactier AI - AIキャラクターチャットサービス',
      }
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Charactier AI - 個性豊かなAIキャラクターとチャット',
    description: '24時間いつでも話せる、あなただけのAIパートナー',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://charactier-ai.com',
    languages: {
      'ja': 'https://charactier-ai.com/ja',
      'en': 'https://charactier-ai.com/en',
    },
  },
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}