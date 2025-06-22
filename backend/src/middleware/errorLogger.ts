import { Request, Response, NextFunction } from 'express';
import { APIErrorModel } from '../models/APIError';
import log from '../utils/logger';
import { sendErrorResponse, mapErrorToClientCode } from '../utils/errorResponse';

// 拡張されたRequestインターフェース
interface ErrorRequest extends Request {
  user?: any;
  startTime?: number;
}

/**
 * エラーロギングミドルウェア
 * APIエラーを自動的にデータベースに記録
 */
export const errorLoggingMiddleware = (
  err: Error,
  req: ErrorRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = req.startTime || Date.now();
  const responseTime = Date.now() - startTime;
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  // エラータイプの判定
  let errorType = 'unknown';
  if (statusCode === 400) errorType = 'validation';
  else if (statusCode === 401) errorType = 'authentication';
  else if (statusCode === 403) errorType = 'authorization';
  else if (statusCode === 404) errorType = 'not_found';
  else if (statusCode === 429) errorType = 'rate_limit';
  else if (statusCode >= 500) errorType = 'server_error';

  // MongoDB関連エラーの検出
  if (err.name === 'MongoError' || err.name === 'ValidationError' || err.message.includes('E11000')) {
    errorType = 'database_error';
  }

  // タイムアウトエラーの検出
  if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
    errorType = 'timeout';
  }

  // APIエラーをログに記録（非同期、エラーは無視）
  (APIErrorModel as any).logError({
    endpoint: req.originalUrl || req.url,
    method: req.method,
    statusCode,
    errorType,
    errorMessage: err.message || 'Unknown error',
    userId: req.user?._id?.toString(),
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip || req.connection?.remoteAddress,
    requestBody: undefined, // Don't log request body for security
    stackTrace: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    responseTime
  }).catch(logError => {
    log.error('Failed to log API error to database', logError);
  });

  // エラーレスポンスの送信（安全なメッセージのみ）
  if (!res.headersSent) {
    const clientErrorCode = mapErrorToClientCode(err);
    sendErrorResponse(res, statusCode, clientErrorCode, err, req.headers['x-request-id'] as string);
  }
};

/**
 * レスポンス時間計測ミドルウェア
 */
export const responseTimeMiddleware = (
  req: ErrorRequest,
  res: Response,
  next: NextFunction
): void => {
  req.startTime = Date.now();
  next();
};

/**
 * 成功レスポンスでもエラーステータスをチェック
 */
export const statusCodeLoggerMiddleware = (
  req: ErrorRequest,
  res: Response,
  next: NextFunction
): void => {
  const originalSend = res.send;
  const originalJson = res.json;

  // res.send をフック
  res.send = function(body) {
    logIfError(req, res, body);
    return originalSend.call(this, body);
  };

  // res.json をフック
  res.json = function(body) {
    logIfError(req, res, body);
    return originalJson.call(this, body);
  };

  next();
};

// エラーレスポンスのログ記録
function logIfError(req: ErrorRequest, res: Response, body: any): void {
  const statusCode = res.statusCode;
  
  // 4xx, 5xxエラーの場合のみログ記録
  if (statusCode >= 400) {
    const startTime = req.startTime || Date.now();
    const responseTime = Date.now() - startTime;

    let errorType = 'unknown';
    if (statusCode === 400) errorType = 'validation';
    else if (statusCode === 401) errorType = 'authentication';
    else if (statusCode === 403) errorType = 'authorization';
    else if (statusCode === 404) errorType = 'not_found';
    else if (statusCode === 429) errorType = 'rate_limit';
    else if (statusCode >= 500) errorType = 'server_error';

    let errorMessage = 'Unknown error';
    if (typeof body === 'string') {
      errorMessage = body;
    } else if (body && typeof body === 'object') {
      errorMessage = body.message || body.error || JSON.stringify(body);
    }

    // 非同期でエラーログを記録
    (APIErrorModel as any).logError({
      endpoint: req.originalUrl || req.url,
      method: req.method,
      statusCode,
      errorType,
      errorMessage,
      userId: req.user?._id?.toString(),
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection?.remoteAddress,
      requestBody: undefined, // Don't log request body for security
      responseTime
    }).catch(logError => {
      log.error('Failed to log API error to database', logError);
    });
  }
}