import { Response } from 'express';
import log from './logger';

/**
 * Standard error response structure
 */
interface ErrorResponse {
  error: string;
  message: string;
  requestId?: string;
}

/**
 * Error codes that are safe to expose to clients
 */
export enum ClientErrorCode {
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Generic errors
  OPERATION_FAILED = 'OPERATION_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * Safe error messages for production
 */
const ERROR_MESSAGES: Record<ClientErrorCode, string> = {
  [ClientErrorCode.AUTH_FAILED]: '認証に失敗しました',
  [ClientErrorCode.TOKEN_EXPIRED]: 'トークンの有効期限が切れています',
  [ClientErrorCode.INSUFFICIENT_PERMISSIONS]: '権限が不足しています',
  [ClientErrorCode.INVALID_INPUT]: '入力内容が正しくありません',
  [ClientErrorCode.MISSING_REQUIRED_FIELD]: '必須項目が入力されていません',
  [ClientErrorCode.VALIDATION_ERROR]: '入力内容に問題があります',
  [ClientErrorCode.NOT_FOUND]: 'リソースが見つかりません',
  [ClientErrorCode.ALREADY_EXISTS]: '既に存在します',
  [ClientErrorCode.RATE_LIMIT_EXCEEDED]: 'リクエスト数が制限を超えています',
  [ClientErrorCode.OPERATION_FAILED]: '操作に失敗しました',
  [ClientErrorCode.SERVICE_UNAVAILABLE]: 'サービスが一時的に利用できません'
};

/**
 * Send standardized error response
 * Logs detailed error internally while sending safe message to client
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number,
  errorCode: ClientErrorCode,
  internalError?: any,
  requestId?: string
): void {
  // Log detailed error internally
  if (internalError) {
    log.error('API Error', internalError, {
      statusCode,
      errorCode,
      requestId,
      path: (res as any).req?.path,
      method: (res as any).req?.method
    });
  }

  // Send safe error to client
  const response: ErrorResponse = {
    error: errorCode,
    message: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ClientErrorCode.OPERATION_FAILED]
  };

  if (requestId) {
    response.requestId = requestId;
  }

  // In development, include more details (but still no stack traces)
  if (process.env.NODE_ENV === 'development' && internalError) {
    (response as any).debug = {
      type: internalError.name || 'Error',
      code: internalError.code
    };
  }

  res.status(statusCode).json(response);
}

/**
 * Map common errors to safe client error codes
 */
export function mapErrorToClientCode(error: any): ClientErrorCode {
  // MongoDB duplicate key error
  if (error.code === 11000) {
    return ClientErrorCode.ALREADY_EXISTS;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return ClientErrorCode.INVALID_INPUT;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ClientErrorCode.AUTH_FAILED;
  }
  if (error.name === 'TokenExpiredError') {
    return ClientErrorCode.TOKEN_EXPIRED;
  }

  // Default
  return ClientErrorCode.OPERATION_FAILED;
}

/**
 * Extract safe validation error message
 * Removes internal field paths and technical details
 */
export function getSafeValidationMessage(errors: any[]): string {
  if (!errors || errors.length === 0) {
    return ERROR_MESSAGES[ClientErrorCode.INVALID_INPUT];
  }

  // Count errors by type
  const fieldCount = errors.filter(e => e.path).length;
  
  // 一時的に詳細なエラー情報を返す（デバッグ用）
  if (process.env.NODE_ENV !== 'production' && errors.length > 0) {
    const fieldErrors = errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return `バリデーションエラー: ${fieldErrors}`;
  }
  
  if (fieldCount > 0) {
    return `${fieldCount}個の項目に問題があります`;
  }

  return ERROR_MESSAGES[ClientErrorCode.INVALID_INPUT];
}