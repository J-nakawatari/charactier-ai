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
              message: detail.message
            })),
            path: req.path
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
  
  // 基本的なHTMLタグとスクリプトを除去
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
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