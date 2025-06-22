import Script from 'next/script';

interface GoogleAnalyticsProps {
  measurementId: string;
}

/**
 * Google Analyticsスクリプト（SSR対応）
 * サーバーサイドでレンダリングされ、view-sourceで確認可能
 */
export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  return (
    <>
      {/* Google tag (gtag.js) */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname
          });
        `}
      </Script>
    </>
  );
}