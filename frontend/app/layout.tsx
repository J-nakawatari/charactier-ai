import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'Charactier AI - キャラクターAIチャットサービス',
  description: 'AIキャラクターとチャットができるサービス',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}