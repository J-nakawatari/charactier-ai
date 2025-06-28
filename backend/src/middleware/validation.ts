import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ClientErrorCode, getSafeValidationMessage } from '../utils/errorResponse';
import log from '../utils/logger';
import { getJoiValidationOptions, getFeatureFlags } from '../config/featureFlags';

export interface ValidationOptions {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}

/**
 * 入力検証ミドルウェアファクトリ
 * @param schemas - 検証スキーマ（body, query, params）
 * @returns Express ミドルウェア
 */
export function validate(schemas: ValidationOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Feature Flagに基づいたJoi検証オプションを取得
      const validationOptions = getJoiValidationOptions();
      const flags = getFeatureFlags();
      
      // Body検証
      if (schemas.body) {
        const { error, value, warning } = schemas.body.validate(req.body, validationOptions);

        if (error) {
          // Log detailed validation errors internally
          log.warn('Body validation error', {
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              type: detail.type,
              value: detail.context?.value
            })),
            path: req.path,
            method: req.method,
            body: req.body
          });
        
        // 不明フィールドの警告ログ（Feature Flagが有効な場合）
        if (flags.LOG_UNKNOWN_FIELDS && warning) {
          log.warn('⚠️ Unknown fields detected in request body', {
            path: req.path,
            method: req.method,
            unknownFields: warning.details.map(d => d.path.join('.'))
          });
        }

          // Send safe error message to client
          const safeMessage = getSafeValidationMessage(error.details);
          res.status(400).json({
            error: ClientErrorCode.INVALID_INPUT,
            message: safeMessage
          });
          return;
        }

        req.body = value;
      }

      // Query検証
      if (schemas.query) {
        const { error, value, warning } = schemas.query.validate(req.query, validationOptions);

        if (error) {
          // Log detailed validation errors internally
          log.debug('Query validation error', {
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              type: detail.type,
              value: detail.context?.value
            })),
            path: req.path,
            method: req.method,
            query: req.query
          });
        
        // 不明フィールドの警告ログ（Feature Flagが有効な場合）
        if (flags.LOG_UNKNOWN_FIELDS && warning) {
          log.warn('⚠️ Unknown fields detected in query params', {
            path: req.path,
            method: req.method,
            unknownFields: warning.details.map(d => d.path.join('.'))
          });
        }

          // Send safe error message to client
          const safeMessage = getSafeValidationMessage(error.details);
          res.status(400).json({
            error: ClientErrorCode.INVALID_INPUT,
            message: safeMessage
          });
          return;
        }

        req.query = value;
      }

      // Params検証
      if (schemas.params) {
        const { error, value, warning } = schemas.params.validate(req.params, {
          ...validationOptions,
          stripUnknown: false // paramsは常にstripUnknown: false
        });

        if (error) {
          // Log detailed validation errors internally
          log.debug('Params validation error', {
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            })),
            path: req.path
          });
        
        // 不明フィールドの警告ログ（Feature Flagが有効な場合）
        if (flags.LOG_UNKNOWN_FIELDS && warning) {
          log.warn('⚠️ Unknown fields detected in params', {
            path: req.path,
            method: req.method,
            unknownFields: warning.details.map(d => d.path.join('.'))
          });
        }

          // Send safe error message to client
          const safeMessage = getSafeValidationMessage(error.details);
          res.status(400).json({
            error: ClientErrorCode.INVALID_INPUT,
            message: safeMessage
          });
          return;
        }

        req.params = value;
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Validation error',
        message: '検証処理中にエラーが発生しました'
      });
    }
  };
}

/**
 * MongoDB ObjectId検証ミドルウェア
 * @param paramName - パラメータ名（デフォルト: 'id'）
 */
export function validateObjectId(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      log.debug('Invalid ObjectId', { id, param: paramName });
      res.status(400).json({
        error: ClientErrorCode.INVALID_INPUT,
        message: '無効なIDが指定されました'
      });
      return;
    }
    
    next();
  };
}

/**
 * サニタイズ関数：HTMLとスクリプトを除去
 * @param input - サニタイズする文字列
 * @returns サニタイズされた文字列
 */
export function sanitizeHtml(input: string): string {
  if (!input) return input;
  
  // エンコーディングを正規化
  let sanitized = input;
  
  // URLスキームの危険なプロトコルを除去
  sanitized = sanitized.replace(/(javascript|data|vbscript|blob|file|about):/gi, '');
  
  // scriptタグを完全に除去（スペースや改行を含む場合も対応）
  sanitized = sanitized.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  sanitized = sanitized.replace(/<\s*script[^>]*\/?\s*>/gi, '');
  
  // イベントハンドラ属性を除去（on*=）
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["']?[^"'>]*["']?/gi, '');
  
  // styleタグとstyle属性を除去（XSS防止）
  sanitized = sanitized.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  sanitized = sanitized.replace(/\s*style\s*=\s*["']?[^"'>]*["']?/gi, '');
  
  // その他の危険なタグを除去
  const dangerousTags = ['iframe', 'object', 'embed', 'link', 'meta', 'base'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<\\s*${tag}[^>]*>(?:[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>)?`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // 残りのHTMLタグを除去
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  
  // HTMLエンティティをエスケープ
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized.trim();
}

/**
 * 検索クエリのサニタイズ
 * @param query - 検索クエリ
 * @returns サニタイズされたクエリ
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  // 特殊文字をエスケープ
  return query
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .trim();
}