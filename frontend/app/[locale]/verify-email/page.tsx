'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/libs/constants';

function VerifyEmailContent({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage(locale === 'ja' 
          ? '無効なリンクです。' 
          : 'Invalid verification link.');
        return;
      }

      try {
        // 一時的にバックエンドに直接アクセス（プロキシの問題を回避）
        const backendUrl = process.env.NODE_ENV === 'production' 
          ? 'https://charactier-ai.com' 
          : 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/api/v1/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(locale === 'ja' 
            ? 'メールアドレスが確認されました！' 
            : 'Email verified successfully!');
          
          // トークンを保存
          if (data.tokens) {
            localStorage.setItem('accessToken', data.tokens.accessToken);
            localStorage.setItem('refreshToken', data.tokens.refreshToken);
            
            // ユーザー情報を取得
            try {
              const userResponse = await fetch(`${API_BASE_URL}/user/profile`, {
                headers: {
                  'Authorization': `Bearer ${data.tokens.accessToken}`
                }
              });
              
              if (userResponse.ok) {
                const userData = await userResponse.json();
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('✅ User data saved:', userData);
              } else {
                console.error('❌ Failed to fetch user profile');
              }
            } catch (error) {
              console.error('❌ Error fetching user profile:', error);
            }
          }
          
          // カウントダウン開始
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                router.push(`/${locale}/setup`);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        } else {
          setStatus('error');
          setMessage(data.message || (locale === 'ja' 
            ? '認証に失敗しました。' 
            : 'Verification failed.'));
        }
      } catch (error) {
        setStatus('error');
        setMessage(locale === 'ja' 
          ? 'エラーが発生しました。' 
          : 'An error occurred.');
      }
    };

    verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, locale]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* ステータスアイコン */}
          <div className="flex justify-center mb-6">
            {status === 'loading' && (
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          {/* メッセージ */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
            {status === 'loading' && (locale === 'ja' ? '確認中...' : 'Verifying...')}
            {status === 'success' && (locale === 'ja' ? '認証完了！' : 'Verified!')}
            {status === 'error' && (locale === 'ja' ? '認証エラー' : 'Verification Error')}
          </h1>

          <p className="text-center text-gray-600 mb-6">
            {message}
          </p>

          {/* 成功時のカウントダウン */}
          {status === 'success' && countdown > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                {locale === 'ja' 
                  ? `${countdown}秒後にセットアップ画面に移動します...` 
                  : `Redirecting to setup in ${countdown} seconds...`}
              </p>
              <Link
                href={`/${locale}/setup`}
                className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                {locale === 'ja' ? '今すぐセットアップを開始' : 'Start Setup Now'}
              </Link>
            </div>
          )}

          {/* エラー時のアクション */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  {locale === 'ja' 
                    ? 'リンクが無効か、有効期限が切れている可能性があります。' 
                    : 'The link may be invalid or expired.'}
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Link
                  href={`/${locale}/register`}
                  className="w-full text-center py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  {locale === 'ja' ? '新規登録画面へ' : 'Back to Registration'}
                </Link>
                
                <Link
                  href={`/${locale}/login`}
                  className="w-full text-center py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  {locale === 'ja' ? 'ログイン画面へ' : 'Go to Login'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage({ 
  params
}: { 
  params: Promise<{ locale: string }>
}) {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    }>
      <VerifyEmailWrapper params={params} />
    </Suspense>
  );
}

function VerifyEmailWrapper({ params }: { params: Promise<{ locale: string }> }) {
  const [locale, setLocale] = useState<string>('ja');
  
  useEffect(() => {
    params.then(p => setLocale(p.locale));
  }, [params]);
  
  return <VerifyEmailContent locale={locale} />;
}