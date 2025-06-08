import type { Metadata } from 'next';
import React from 'react';
// TODO: 再実装時に復活 - import { NextIntlClientProvider } from 'next-intl';
// TODO: 再実装時に復活 - import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Charactier AI - キャラクターAIチャットサービス',
  description: 'AIキャラクターとチャットができるサービス',
};

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = React.use(params);
  const locale = resolvedParams.locale || 'ja';
  // TODO: 再実装時に復活 - const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        {/* TODO: 再実装時に復活 - <NextIntlClientProvider messages={messages}> */}
          {children}
        {/* TODO: 再実装時に復活 - </NextIntlClientProvider> */}
      </body>
    </html>
  );
}