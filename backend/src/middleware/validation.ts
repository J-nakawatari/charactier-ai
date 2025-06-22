import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

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
      // Body検証
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));

          res.status(400).json({
            error: 'Validation failed',
            message: '入力内容に誤りがあります',
            errors
          });
          return;
        }

        req.body = value;
      }

      // Query検証
      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));

          res.status(400).json({
            error: 'Validation failed',
            message: 'クエリパラメータに誤りがあります',
            errors
          });
          return;
        }

        req.query = value;
      }

      // Params検証
      if (schemas.params) {
        const { error, value } = schemas.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: false,
          convert: true
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }));

          res.status(400).json({
            error: 'Validation failed',
            message: 'パラメータに誤りがあります',
            errors
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
      res.status(400).json({
        error: 'Invalid ID',
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