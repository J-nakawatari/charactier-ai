#!/usr/bin/env ts-node
/**
 * XSSマイグレーションスクリプト
 * 既存のチャットメッセージをサニタイズする
 * 
 * 使用方法:
 * ts-node scripts/xss_migrate.ts [--dry-run] [--batch-size=100]
 */

import mongoose from 'mongoose';
import { ChatModel } from '../src/models/ChatModel';
import { sanitizeChatMessage } from '../src/utils/htmlSanitizer';
import log from '../src/utils/logger';

// コマンドライン引数の解析
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100;

async function migrateChats(): Promise<void> {
  try {
    // MongoDB接続
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/charactier';
    await mongoose.connect(mongoUri);
    log.info('Connected to MongoDB');

    // 統計情報
    let totalChats = 0;
    let totalMessages = 0;
    let sanitizedMessages = 0;
    let errors = 0;

    // すべてのチャットを取得（バッチ処理）
    const totalCount = await ChatModel.countDocuments();
    log.info(`Total chats to process: ${totalCount}`);

    for (let skip = 0; skip < totalCount; skip += batchSize) {
      const chats = await ChatModel.find()
        .skip(skip)
        .limit(batchSize)
        .lean();

      log.info(`Processing batch ${skip / batchSize + 1}/${Math.ceil(totalCount / batchSize)}`);

      for (const chat of chats) {
        totalChats++;
        let hasChanges = false;
        const updatedMessages = [];

        // 各メッセージをチェック
        for (const message of chat.messages || []) {
          totalMessages++;
          
          try {
            // HTMLタグが含まれているかチェック
            const originalContent = message.content || '';
            const sanitizedContent = sanitizeChatMessage(originalContent);
            
            if (originalContent !== sanitizedContent) {
              sanitizedMessages++;
              hasChanges = true;
              
              log.info(`Sanitizing message in chat ${chat._id}:`, {
                role: message.role,
                original: originalContent.substring(0, 50) + '...',
                sanitized: sanitizedContent.substring(0, 50) + '...'
              });
              
              updatedMessages.push({
                ...message,
                content: sanitizedContent
              });
            } else {
              updatedMessages.push(message);
            }
          } catch (error) {
            errors++;
            log.error(`Error sanitizing message in chat ${chat._id}:`, error);
            updatedMessages.push(message); // エラーの場合は元のメッセージを保持
          }
        }

        // 変更がある場合のみ更新
        if (hasChanges && !isDryRun) {
          try {
            await ChatModel.findByIdAndUpdate(
              chat._id,
              { messages: updatedMessages },
              { runValidators: false } // バリデーションをスキップ（高速化）
            );
            log.info(`Updated chat ${chat._id} with ${sanitizedMessages} sanitized messages`);
          } catch (error) {
            errors++;
            log.error(`Error updating chat ${chat._id}:`, error);
          }
        }
      }

      // 進捗表示
      const progress = Math.round((skip + chats.length) / totalCount * 100);
      log.info(`Progress: ${progress}% (${skip + chats.length}/${totalCount})`);
    }

    // 結果サマリー
    log.info('=== XSS Migration Summary ===');
    log.info(`Total chats processed: ${totalChats}`);
    log.info(`Total messages processed: ${totalMessages}`);
    log.info(`Messages sanitized: ${sanitizedMessages}`);
    log.info(`Errors encountered: ${errors}`);
    log.info(`Dry run: ${isDryRun}`);

    if (isDryRun) {
      log.info('This was a dry run. No changes were made to the database.');
    } else {
      log.info('Migration completed successfully!');
    }

  } catch (error) {
    log.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// メイン実行
log.info('Starting XSS migration script...');
log.info(`Dry run: ${isDryRun}`);
log.info(`Batch size: ${batchSize}`);

migrateChats()
  .then(() => process.exit(0))
  .catch(error => {
    log.error('Unexpected error:', error);
    process.exit(1);
  });