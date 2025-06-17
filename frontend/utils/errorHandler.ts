/**
 * エラーハンドリングユーティリティ
 * API エラー、ネットワークエラー、認証エラーなどを統一的に処理
 */

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
  // 制裁関連情報
  sanctionAction?: string;
  sanctionMessage?: string;
  violationCount?: number;
  accountStatus?: string;
  detectedWord?: string;
  violationType?: string;
  // 強制ログアウト
  forceLogout?: boolean;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  message?: string;
  details?: any;
}

/**
 * APIエラーをパース
 */
export function parseApiError(response: Response, errorData?: any): ApiError {
  const baseError: ApiError = {
    code: errorData?.code || 'API_ERROR',
    message: errorData?.error || errorData?.message || 'APIエラーが発生しました',
    status: response.status,
    details: errorData?.details,
    // 制裁関連情報を抽出
    sanctionAction: errorData?.sanctionAction,
    sanctionMessage: errorData?.sanctionMessage,
    violationCount: errorData?.violationCount,
    accountStatus: errorData?.accountStatus,
    detectedWord: errorData?.detectedWord,
    violationType: errorData?.violationType,
    // 強制ログアウト情報を抽出
    forceLogout: errorData?.forceLogout
  };

  // ステータスコード別の処理
  switch (response.status) {
    case 400:
      return {
        ...baseError,
        code: errorData?.code || 'BAD_REQUEST',
        message: errorData?.error || 'リクエストが無効です'
      };
    
    case 401:
      return {
        ...baseError,
        code: errorData?.code || 'UNAUTHORIZED',
        message: errorData?.error || 'ログインが必要です'
      };
    
    case 402:
      return {
        ...baseError,
        code: errorData?.code || 'INSUFFICIENT_TOKENS',
        message: errorData?.error || 'トークンが不足しています'
      };
    
    case 403:
      // 強制ログアウトが必要な場合（BANされたユーザー等）
      if (errorData?.forceLogout) {
        console.log('🚨 Force logout triggered:', {
          accountStatus: errorData?.accountStatus,
          currentUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
          errorData: errorData
        });
        
        // ローカルストレージのトークンをクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // ログインページにリダイレクト
          window.location.href = '/ja/login?reason=account_banned';
        }
      }
      
      return {
        ...baseError,
        code: errorData?.code || 'FORBIDDEN',
        message: errorData?.error || 'アクセスが拒否されました',
        forceLogout: errorData?.forceLogout
      };
    
    case 404:
      return {
        ...baseError,
        code: errorData?.code || 'NOT_FOUND',
        message: errorData?.error || 'リソースが見つかりません'
      };
    
    case 429:
      return {
        ...baseError,
        code: errorData?.code || 'RATE_LIMITED',
        message: errorData?.error || 'リクエストが多すぎます。しばらく待ってから再試行してください'
      };
    
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        ...baseError,
        code: errorData?.code || 'SERVER_ERROR',
        message: errorData?.error || 'サーバーエラーが発生しました。しばらく待ってから再試行してください'
      };
    
    default:
      return baseError;
  }
}

/**
 * フェッチリクエストのエラーハンドリング
 */
export async function handleFetchError(response: Response): Promise<ApiError> {
  let errorData: ErrorResponse | null = null;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = { error: await response.text() };
    }
  } catch (parseError) {
    console.error('Error parsing API error response:', parseError);
  }
  
  return parseApiError(response, errorData);
}

/**
 * 一般的なエラーハンドリング
 */
export function handleGenericError(error: unknown): ApiError {
  if (error instanceof Error) {
    // ネットワークエラー
    if (error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください'
      };
    }
    
    // タイムアウトエラー
    if (error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'リクエストがタイムアウトしました。再試行してください'
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || '予期しないエラーが発生しました'
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: '予期しないエラーが発生しました'
  };
}

/**
 * エラーの重要度判定
 */
export function getErrorSeverity(error: ApiError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.code) {
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      return 'medium';
    
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      return 'high';
    
    case 'SERVER_ERROR':
    case 'UNKNOWN_ERROR':
      return 'critical';
    
    case 'BAD_REQUEST':
    case 'NOT_FOUND':
    case 'RATE_LIMITED':
      return 'low';
    
    case 'INSUFFICIENT_TOKENS':
      return 'medium';
    
    default:
      return 'medium';
  }
}

/**
 * エラーの自動回復可能性判定
 */
export function isRetryableError(error: ApiError): boolean {
  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'RATE_LIMITED'
  ];
  
  return retryableCodes.includes(error.code);
}

/**
 * エラーメッセージの表示用フォーマット
 */
export function formatErrorMessage(error: ApiError): string {
  // 特別なエラーコードの場合はカスタムメッセージ
  switch (error.code) {
    case 'INSUFFICIENT_TOKENS':
      return 'トークンが不足しています。トークンを購入してから再試行してください。';
    
    case 'CONTENT_VIOLATION':
      return formatViolationMessage(error);
    
    case 'RATE_LIMITED':
      return 'リクエストが多すぎます。少し時間をおいてから再試行してください。';
    
    case 'UNAUTHORIZED':
      return 'ログインが必要です。再度ログインしてください。';
    
    default:
      return error.message;
  }
}

/**
 * 制裁情報を含むメッセージをフォーマット
 */
export function formatViolationMessage(error: ApiError): string {
  let message = error.message || 'メッセージが利用規約に違反しています。';
  
  // 違反回数を追加
  if (error.violationCount) {
    message += ` (違反回数: ${error.violationCount}回)`;
  }
  
  // 制裁メッセージがある場合は追加
  if (error.sanctionMessage) {
    message += '\n\n' + error.sanctionMessage;
  }
  
  // 制裁アクションに応じた追加メッセージ
  switch (error.sanctionAction) {
    case 'warning':
      message += '\n⚠️ 警告: 今後気をつけてください。';
      break;
    case 'chat_suspension':
      message += '\n🚫 チャット機能が24時間停止されました。';
      break;
    case 'account_suspension':
      message += '\n⛔ アカウントが7日間停止されました。';
      break;
    case 'ban':
      message += '\n🔒 アカウントが永久停止されました。';
      break;
  }
  
  return message;
}

/**
 * 制裁レベルを判定
 */
export function getSanctionSeverity(error: ApiError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.sanctionAction) {
    case 'record_only':
      return 'low';
    case 'warning':
      return 'medium';
    case 'chat_suspension':
      return 'high';
    case 'account_suspension':
    case 'ban':
      return 'critical';
    default:
      return 'medium';
  }
}

/**
 * 統合エラーハンドリング関数
 * APIレスポンスやエラーオブジェクトを受け取り、統一されたエラー情報を返す
 */
export async function handleApiError(responseOrError: Response | Error | unknown): Promise<ApiError> {
  if (responseOrError instanceof Response) {
    return await handleFetchError(responseOrError);
  }
  
  return handleGenericError(responseOrError);
}