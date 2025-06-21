'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ResendVerificationPage({ 
  params: { locale }
}: { 
  params: { locale: string } 
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // ログイン時に保存したメールアドレスを取得
    const pendingEmail = sessionStorage.getItem('pendingEmail');
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError(locale === 'ja' 
        ? 'メールアドレスを入力してください' 
        : 'Please enter your email address');
      return;
    }

    setIsResending(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          locale 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(data.message || '再送信制限に達しました。しばらくお待ちください。');
        } else if (response.status === 400) {
          throw new Error(data.message || 'このメールアドレスは既に認証されています。');
        }
        throw new Error(data.message || '再送信に失敗しました');
      }

      setMessage(locale === 'ja' 
        ? '確認メールを再送信しました。メールボックスをご確認ください。' 
        : 'Verification email resent. Please check your inbox.');
      
      // 成功したらメールアドレスを保存
      sessionStorage.setItem('pendingEmail', email);
      
      // 3秒後に登録完了画面へ
      setTimeout(() => {
        router.push(`/${locale}/register-complete`);
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || '再送信に失敗しました');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* アイコン */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            {locale === 'ja' ? '確認メールの再送信' : 'Resend Verification Email'}
          </h1>
          
          <p className="text-center text-gray-600 mb-6">
            {locale === 'ja' 
              ? 'メールアドレスを入力して確認メールを再送信してください' 
              : 'Enter your email address to resend the verification email'}
          </p>

          {/* フォーム */}
          <form onSubmit={handleResend} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'ja' ? 'メールアドレス' : 'Email Address'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={locale === 'ja' ? 'example@email.com' : 'example@email.com'}
                required
              />
            </div>

            {/* 再送信ボタン */}
            <button
              type="submit"
              disabled={isResending}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{locale === 'ja' ? '送信中...' : 'Sending...'}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>{locale === 'ja' ? '確認メールを再送信' : 'Resend Verification Email'}</span>
                </>
              )}
            </button>

            {/* 成功メッセージ */}
            {message && (
              <div className="flex items-start space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{message}</span>
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </form>

          {/* リンク */}
          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3 text-center text-sm">
            <p className="text-gray-600">
              {locale === 'ja' ? 'アカウントをお持ちでない方は' : "Don't have an account?"}
              <Link 
                href={`/${locale}/register`}
                className="ml-1 text-purple-600 hover:text-purple-700 font-medium"
              >
                {locale === 'ja' ? '新規登録' : 'Sign up'}
              </Link>
            </p>
            
            <p className="text-gray-600">
              {locale === 'ja' ? 'すでに認証済みの方は' : 'Already verified?'}
              <Link 
                href={`/${locale}/login`}
                className="ml-1 text-purple-600 hover:text-purple-700 font-medium"
              >
                {locale === 'ja' ? 'ログイン' : 'Login'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}