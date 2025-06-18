import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { getActiveGAId } from '@/lib/ga-settings';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export async function generateStaticParams() {
  return [
    { locale: 'ja' },
    { locale: 'en' }
  ];
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  
  // サーバーサイドでGA設定を取得
  const gaId = await getActiveGAId();

  return (
    <html lang={locale}>
      <head>
        {/* SSRでGAタグを出力（view-sourceで確認可能） */}
        {gaId && <GoogleAnalytics measurementId={gaId} />}
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}