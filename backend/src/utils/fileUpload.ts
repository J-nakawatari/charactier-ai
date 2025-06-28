import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

const createUploadDir = (dir: string): string => {
  // プロジェクトルートの uploads ディレクトリを使用
  const projectRoot = path.join(__dirname, '../../../..');
  const uploadDir = path.join(projectRoot, 'uploads', dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = createUploadDir('images');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 透過情報を保持するためPNG形式を使用
    cb(null, file.fieldname + '-' + uniqueSuffix + '.png');
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('画像ファイルのみ許可されています！'));
  }
};

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB制限
});

export const optimizeImage = (width: number = 800, height: number = 800, quality: number = 80) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        next();
        return;
      }

      // Validate and sanitize file path
      const filePath = path.resolve(req.file.path);
      const uploadDir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      
      // Ensure the file is within the expected upload directory
      const expectedUploadDir = path.resolve(path.join(__dirname, '../../../../uploads/images'));
      if (!filePath.startsWith(expectedUploadDir)) {
        return next(new Error('Invalid file path'));
      }
      
      const tmpPath = path.join(uploadDir, fileName + '.tmp');
      
      // 入力画像の形式を確認
      const inputMeta = await sharp(filePath).metadata();
      // log('🔍 Input image metadata:', {
      //   format: inputMeta.format,
      //   channels: inputMeta.channels,
      //   hasAlpha: inputMeta.hasAlpha,
      //   space: inputMeta.space
      // });

      // 透過情報を保持しつつ全ての画像を処理
      const sharpInstance = sharp(filePath)
        .ensureAlpha() // アルファチャンネルを確実に保持
        .resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // 透明な背景を明示的に設定
        });

      // PNGオプション: 最も保守的な設定
      await sharpInstance
        .png({ 
          force: true, // 強制的にPNG形式で出力
          palette: false, // パレットモードを無効化
          compressionLevel: 0, // 圧縮なし（透過情報保持最優先）
          effort: 1 // 互換性重視
        })
        .toFile(tmpPath);

      // 出力画像の形式を確認
      const outputMeta = await sharp(tmpPath).metadata();
      // log('🔍 Output image metadata:', {
      //   format: outputMeta.format,
      //   channels: outputMeta.channels,
      //   hasAlpha: outputMeta.hasAlpha,
      //   space: outputMeta.space
      // });
        
      // Final path validation before rename
      const sanitizedTmpPath = path.normalize(path.resolve(tmpPath));
      const sanitizedFinalPath = path.normalize(path.resolve(filePath));
      
      // Both paths must be within upload directory
      if (!sanitizedTmpPath.startsWith(expectedUploadDir) || 
          !sanitizedFinalPath.startsWith(expectedUploadDir)) {
        throw new Error('Invalid file path');
      }
      
      await fs.promises.rename(sanitizedTmpPath, sanitizedFinalPath);
      next();
    } catch (err) {
      next(err);
    }
  };