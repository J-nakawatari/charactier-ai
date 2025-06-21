import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

// SendGrid初期化（環境変数から読み込み）
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️ SENDGRID_API_KEY is not set');
}

/**
 * メールアドレス認証用のメールを送信
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  locale: 'ja' | 'en' = 'ja'
): Promise<void> {
  // フロントエンドのURLを環境変数から取得（末尾のスラッシュを除去）
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const verifyUrl = `${frontendUrl}/${locale}/verify-email?token=${token}`;

  // デバッグ情報を出力
  console.log('📧 Preparing to send verification email:', {
    to: email,
    locale: locale,
    verifyUrl: verifyUrl,
    isJapanese: locale === 'ja',
    isEnglish: locale === 'en',
    nodeEnv: process.env.NODE_ENV,
    hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    hasFromEmail: !!process.env.SENDGRID_FROM_EMAIL,
    hasTemplateId: !!process.env.SENDGRID_VERIFICATION_TEMPLATE_ID
  });

  // 開発環境では実際に送信しない
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 [DEV] Verification URL:', verifyUrl);
    console.log('🎫 [DEV] Token:', token);
    return;
  }

  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@charactier-ai.com',
        name: 'Charactier AI'
      },
      // コード内で直接件名を設定（Dynamic Templateの件名設定を上書き）
      subject: locale === 'ja' 
        ? '【Charactier AI】メールアドレスの確認をお願いします'
        : '[Charactier AI] Please verify your email address',
      templateId: process.env.SENDGRID_VERIFICATION_TEMPLATE_ID,
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        }
      },
      dynamicTemplateData: {
        // 言語切り替え用
        locale: locale,
        isJapanese: locale === 'ja',
        isEnglish: locale === 'en',
        
        // 共通データ
        verifyUrl: verifyUrl,
        
        // 日本語テキスト
        subjectJa: '【Charactier AI】メールアドレスの確認をお願いします',
        titleJa: 'Charactier AIへようこそ！',
        bodyJa: 'アカウントの登録を完了するには、以下のボタンをクリックしてメールアドレスを確認してください。',
        buttonJa: 'メールアドレスを確認する',
        expireJa: 'このリンクは24時間有効です。',
        ignoreJa: '心当たりがない場合は、このメールを無視してください。',
        
        // 英語テキスト
        subjectEn: '[Charactier AI] Please verify your email address',
        titleEn: 'Welcome to Charactier AI!',
        bodyEn: 'Please click the button below to verify your email address.',
        buttonEn: 'Verify Email',
        expireEn: 'This link expires in 24 hours.',
        ignoreEn: 'If you did not request this, please ignore this email.'
      }
    };

    await sgMail.send(msg);
    console.log('✅ Verification email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    // エラーでも処理を続行（セキュリティ上、ユーザーには成功したように見せる）
    throw error;
  }
}

/**
 * ランダムな認証トークンを生成
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 使い捨てメールアドレスかどうかをチェック
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'trashmail.com',
  'yopmail.com',
  'throwawaymail.com',
  'maildrop.cc',
  'mintemail.com',
  'temp-mail.org'
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  return DISPOSABLE_EMAIL_DOMAINS.some(disposableDomain => 
    domain === disposableDomain || domain.endsWith(`.${disposableDomain}`)
  );
}