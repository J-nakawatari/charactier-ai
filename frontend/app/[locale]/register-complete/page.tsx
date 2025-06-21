'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function RegisterCompletePage({ 
  params: { locale }
}: { 
  params: { locale: string } 
}) {
  const t = useTranslations('registerComplete');
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    // 登録時のメールアドレスを取得
    const pendingEmail = sessionStorage.getItem('pendingEmail');
    if (!pendingEmail) {
      // メールアドレスがない場合は登録画面に戻る
      router.push(`/${locale}/register`);
      return;
    }
    setEmail(pendingEmail);
  }, [locale, router]);

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage('');
    setResendError('');

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
        }
        throw new Error(data.message || '再送信に失敗しました');
      }

      setResendMessage('確認メールを再送信しました');
    } catch (err: any) {
      setResendError(err.message || '再送信に失敗しました');
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
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
            {locale === 'ja' ? '確認メールを送信しました' : 'Verification Email Sent'}
          </h1>

          {/* 説明 */}
          <div className="space-y-4 text-gray-600">
            <p className="text-center">
              {locale === 'ja' 
                ? `${email} に確認メールを送信しました。` 
                : `We've sent a verification email to ${email}.`}
            </p>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">
                {locale === 'ja' ? '次のステップ' : 'Next Steps'}
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>{locale === 'ja' ? 'メールボックスを確認してください' : 'Check your email inbox'}</li>
                <li>{locale === 'ja' ? '確認リンクをクリックしてください' : 'Click the verification link'}</li>
                <li>{locale === 'ja' ? 'アカウントが有効になります' : 'Your account will be activated'}</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-800 mb-1">
                    {locale === 'ja' ? 'メールが届かない場合' : "Didn't receive the email?"}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li>{locale === 'ja' ? '迷惑メールフォルダをご確認ください' : 'Check your spam folder'}</li>
                    <li>{locale === 'ja' ? 'メールアドレスが正しいかご確認ください' : 'Verify your email address is correct'}</li>
                    <li>{locale === 'ja' ? '数分お待ちください' : 'Wait a few minutes'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 再送信ボタン */}
          <div className="mt-6">
            <button
              onClick={handleResend}
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

            {/* 再送信メッセージ */}
            {resendMessage && (
              <div className="mt-3 flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">{resendMessage}</span>
              </div>
            )}

            {/* エラーメッセージ */}
            {resendError && (
              <div className="mt-3 flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{resendError}</span>
              </div>
            )}
          </div>

          {/* リンク */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm">
            <p className="text-gray-600">
              {locale === 'ja' ? 'アカウントをお持ちの方は' : 'Already have an account?'}
              <Link 
                href={`/${locale}/login`}
                className="ml-1 text-purple-600 hover:text-purple-700 font-medium"
              >
                {locale === 'ja' ? 'ログイン' : 'Login'}
              </Link>
            </p>
          </div>
        </div>

        {/* 有効期限の注記 */}
        <p className="mt-4 text-center text-sm text-gray-500">
          {locale === 'ja' 
            ? '確認リンクは24時間有効です' 
            : 'The verification link expires in 24 hours'}
        </p>
      </div>
    </div>
  );
}