import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

const createUploadDir = (dir: string): string => {
  const uploadDir = path.join(__dirname, '../../../../uploads', dir);
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

      // 透過PNG画像の場合は処理をスキップして元ファイルをそのまま使用
      if (req.file.mimetype === 'image/png') {
        console.log('透過PNG画像検出: 最適化をスキップして元ファイルを保持');
        next();
        return;
      }

      const tmpPath = req.file.path + '.tmp';
      
      // PNG以外の画像のみ処理
      await sharp(req.file.path)
        .resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .png()
        .toFile(tmpPath);
        
      await fs.promises.rename(tmpPath, req.file.path);
      next();
    } catch (err) {
      next(err);
    }
  };