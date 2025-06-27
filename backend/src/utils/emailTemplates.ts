import * as Handlebars from 'handlebars';
import { createHtmlSanitizer } from './htmlSanitizer';

// HTML サニタイザーのインスタンス
const sanitizer = createHtmlSanitizer();

// Handlebars ヘルパー登録
Handlebars.registerHelper('escapeHtml', (str: string) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
});

// URL用の安全なヘルパー（スラッシュをエスケープしない）
Handlebars.registerHelper('escapeUrl', (url: string) => {
  if (typeof url !== 'string') return '';
  // URLの基本的な検証
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    return '';
  }
  // URLエンコーディングは不要（既に適切な形式のURL）
  return url;
});

// JSON を安全に文字列化するヘルパー
Handlebars.registerHelper('safeJson', (obj: any) => {
  if (!obj) return '{}';
  // JSON.stringify 後、スクリプトタグを無効化
  const json = JSON.stringify(obj);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027');
});

// メール認証結果ページテンプレート
const emailVerificationTemplate = Handlebars.compile(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{escapeHtml title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f3f4f6;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: {{escapeHtml iconColor}};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      fill: white;
    }
    h1 {
      margin: 0 0 1rem;
      font-size: 1.875rem;
      color: #111827;
    }
    p {
      margin: 0 0 2rem;
      color: #6b7280;
      line-height: 1.5;
    }
    .button {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #7c3aed;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
      transition: background 0.2s;
    }
    .button:hover {
      background: #6d28d9;
    }
    .redirect-message {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: #9ca3af;
    }
  </style>
  {{#if includeSuccessScript}}
  <script>
    // 安全にユーザー情報を保存
    (function() {
      try {
        // サーバーから渡されたデータ（エスケープ済み）
        const userData = {{{safeJson userInfo}}};
        const accessToken = '{{escapeHtml accessToken}}';
        const refreshToken = '{{escapeHtml refreshToken}}';
        
        // localStorageに保存
        if (userData && Object.keys(userData).length > 0) {
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
      } catch (error) {
        console.error('Failed to save authentication data');
      }
    })();
    
    // リダイレクト処理
    window.onload = function() {
      const redirectUrl = '{{escapeUrl redirectUrl}}';
      if (redirectUrl) {
        setTimeout(function() {
          window.location.href = redirectUrl;
        }, 3000);
      }
    };
  </script>
  {{/if}}
</head>
<body>
  <div class="container">
    <div class="icon">
      {{#if isSuccess}}
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      {{else if isError}}
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
      {{else}}
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>
      {{/if}}
    </div>
    <h1>{{escapeHtml title}}</h1>
    <p>{{escapeHtml message}}</p>
    {{#if buttonUrl}}
    <a href="{{escapeUrl buttonUrl}}" class="button">{{escapeHtml buttonText}}</a>
    {{/if}}
    {{#if showRedirectMessage}}
    <p class="redirect-message">{{escapeHtml redirectMessage}}</p>
    {{/if}}
  </div>
</body>
</html>`);

// メール認証HTML生成関数（XSS対策済み）
export function generateEmailVerificationHTML(
  type: 'success' | 'error' | 'already-verified' | 'expired' | 'server-error',
  locale: 'ja' | 'en',
  userData?: {
    userInfo?: any;
    accessToken?: string;
    refreshToken?: string;
    frontendUrl?: string;
  }
): string {
  const messages = {
    success: {
      title: locale === 'ja' ? '認証完了！' : 'Verified!',
      message: locale === 'ja' ? 'メールアドレスが確認されました。' : 'Your email has been verified successfully.',
      buttonText: locale === 'ja' ? '今すぐセットアップを開始' : 'Start Setup Now',
      redirectMessage: locale === 'ja' ? '3秒後にセットアップ画面に移動します...' : 'Redirecting to setup in 3 seconds...',
      iconColor: '#10b981'
    },
    error: {
      title: locale === 'ja' ? 'エラー' : 'Error',
      message: locale === 'ja' ? '無効なリクエストです。' : 'Invalid request.',
      buttonText: locale === 'ja' ? 'ホームに戻る' : 'Back to Home',
      redirectMessage: '',
      iconColor: '#f59e0b'
    },
    'already-verified': {
      title: locale === 'ja' ? '認証済み' : 'Already Verified',
      message: locale === 'ja' ? 'このメールアドレスは既に認証されています。' : 'This email address has already been verified.',
      buttonText: locale === 'ja' ? 'セットアップページへ' : 'Go to Setup',
      redirectMessage: '',
      iconColor: '#f59e0b'
    },
    expired: {
      title: locale === 'ja' ? '認証エラー' : 'Verification Error',
      message: locale === 'ja' ? 'リンクが無効か、有効期限が切れています。' : 'The link is invalid or has expired.',
      buttonText: locale === 'ja' ? '新規登録画面へ' : 'Back to Registration',
      redirectMessage: '',
      iconColor: '#ef4444'
    },
    'server-error': {
      title: locale === 'ja' ? 'サーバーエラー' : 'Server Error',
      message: locale === 'ja' ? '申し訳ございません。エラーが発生しました。時間をおいて再度お試しください。' : 'Sorry, an error occurred. Please try again later.',
      buttonText: locale === 'ja' ? 'ホームに戻る' : 'Back to Home',
      redirectMessage: '',
      iconColor: '#6b7280'
    }
  };

  const config = messages[type];
  const frontendUrl = userData?.frontendUrl || (process.env.NODE_ENV === 'production' 
    ? 'https://charactier-ai.com' 
    : 'http://localhost:3000');

  // ボタンURLの設定
  let buttonUrl = `${frontendUrl}/${locale}`;
  if (type === 'success' || type === 'already-verified') {
    buttonUrl = `${frontendUrl}/${locale}/setup`;
  } else if (type === 'expired') {
    buttonUrl = `${frontendUrl}/${locale}/register`;
  }

  // テンプレートデータ
  const templateData = {
    title: config.title,
    message: config.message,
    buttonText: config.buttonText,
    buttonUrl: buttonUrl,
    iconColor: config.iconColor,
    isSuccess: type === 'success',
    isError: type === 'error' || type === 'expired',
    includeSuccessScript: type === 'success' && userData,
    showRedirectMessage: type === 'success',
    redirectMessage: config.redirectMessage || '',
    redirectUrl: type === 'success' ? `${frontendUrl}/${locale}/setup` : '',
    // ユーザーデータ（成功時のみ）
    userInfo: userData?.userInfo || {},
    accessToken: userData?.accessToken || '',
    refreshToken: userData?.refreshToken || ''
  };

  return emailVerificationTemplate(templateData);
}