const { UserModel: User } = require('../dist/src/models/UserModel');
const UserTokenPack = require('../models/UserTokenPack');
const TokenUsage = require('../models/TokenUsage');
const { calcTokensToGive, validateModel, logTokenConfig } = require('../dist/src/config/tokenConfig');
const log = require('../dist/src/utils/logger').default;

/**
 * トークンサービス（利益率94%）
 * 94%利益保証を確実に実現するシンプルなトークン管理システム
 */
class TokenService {
  
  /**
   * トークン付与数の計算（モデル別対応版）
   * @param {number} purchaseAmountYen - 購入金額（円）
   * @param {string} model - 使用モデル名
   * @returns {Promise<number>} 付与トークン数
   */
  static async calculateTokensToGive(purchaseAmountYen, model = 'gpt-4o-mini') {
    // モデルの妥当性チェック
    if (!validateModel(model)) {
      throw new Error(`Invalid model: ${model}`);
    }
    
    const tokensToGive = await calcTokensToGive(purchaseAmountYen, model);
    
    log.info('トークン付与計算', {
      purchaseAmountYen,
      model,
      tokensToGive,
      profitMargin: '94%保証'
    });
    
    return tokensToGive;
  }
  
  /**
   * Stripe決済完了後のトークン付与
   * @param {string} userId - ユーザーID
   * @param {string} stripeSessionId - StripeセッションID
   * @param {number} purchaseAmountYen - 購入金額（円）
   * @param {string} model - 使用モデル名
   * @returns {Promise<Object>} 付与結果
   */
  static async grantTokens(userId, stripeSessionId, purchaseAmountYen, model = 'gpt-4o-mini') {
    try {
      // 1. 付与トークン数を計算
      const tokensToGive = await this.calculateTokensToGive(purchaseAmountYen, model);
      
      // 2. 重複チェック（同じセッションIDでの二重付与防止）
      const existingPack = await UserTokenPack.findOne({ stripeSessionId });
      if (existingPack) {
        log.warn('重複付与防止', { stripeSessionId, message: '既に処理済み' });
        return {
          success: false,
          reason: 'Already processed',
          tokensGranted: 0,
          newBalance: await this.getUserTokenBalance(userId)
        };
      }
      
      // 3. UserTokenPack レコード作成
      const tokenPack = new UserTokenPack({
        userId,
        stripeSessionId,
        purchaseAmountYen,
        tokensPurchased: tokensToGive,
        tokensRemaining: tokensToGive,  // 初期状態では全て残っている
        isActive: true,
        purchaseDate: new Date()
      });
      
      await tokenPack.save();
      
      // 4. User.tokenBalance を更新
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenBalance: tokensToGive }
      }, { new: true });
      
      console.log(`✅ ユーザー ${userId} に ${tokensToGive} トークンを付与しました`);
      console.log(`💳 Stripeセッション: ${stripeSessionId}`);
      console.log(`💰 購入金額: ${purchaseAmountYen}円`);
      
      return {
        success: true,
        tokensGranted: tokensToGive,
        newBalance: await this.getUserTokenBalance(userId),
        purchaseAmountYen,
        profitMargin: 0.90,
        model: model
      };
      
    } catch (error) {
      console.error('❌ トークン付与エラー:', error);
      throw error;
    }
  }
  
  /**
   * トークン使用処理
   * @param {string} userId - ユーザーID
   * @param {string} characterId - キャラクターID
   * @param {number} tokensUsed - 使用トークン数
   * @param {string} messageContent - メッセージ内容
   * @returns {Promise<Object>} 使用結果
   */
  static async useTokens(userId, characterId, tokensUsed, messageContent = '') {
    try {
      // 1. ユーザーの残高確認
      const currentBalance = await this.getUserTokenBalance(userId);
      
      if (currentBalance < tokensUsed) {
        throw new Error(`トークン不足: 残高${currentBalance}, 必要${tokensUsed}`);
      }
      
      // 2. User.tokenBalance から減算
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenBalance: -tokensUsed }
      });
      
      // 3. TokenUsage レコード作成（使用履歴）
      const tokenUsage = new TokenUsage({
        userId,
        characterId,
        tokensUsed,
        messageContent: messageContent.substring(0, 2000), // 最大2000文字まで
        timestamp: new Date()
      });
      
      await tokenUsage.save();
      
      // 4. UserTokenPack の tokensRemaining を更新（FIFO方式）
      await this.updateTokenPackRemaining(userId, tokensUsed);
      
      console.log(`📉 ユーザー ${userId} が ${tokensUsed} トークンを使用`);
      console.log(`💬 キャラクター: ${characterId}`);
      console.log(`📝 メッセージ長: ${messageContent.length}文字`);
      
      return {
        success: true,
        tokensUsed,
        newBalance: currentBalance - tokensUsed,
        characterId
      };
      
    } catch (error) {
      console.error('❌ トークン使用エラー:', error);
      throw error;
    }
  }
  
  /**
   * UserTokenPack の tokensRemaining を更新（FIFO方式）
   * @param {string} userId - ユーザーID
   * @param {number} tokensUsed - 使用トークン数
   */
  static async updateTokenPackRemaining(userId, tokensUsed) {
    const tokenPacks = await UserTokenPack.find({
      userId,
      isActive: true,
      tokensRemaining: { $gt: 0 }
    }).sort({ purchaseDate: 1 });  // 古い順（FIFO）
    
    let remainingToDeduct = tokensUsed;
    
    for (const pack of tokenPacks) {
      if (remainingToDeduct <= 0) break;
      
      const deductFromThisPack = Math.min(pack.tokensRemaining, remainingToDeduct);
      
      pack.tokensRemaining -= deductFromThisPack;
      remainingToDeduct -= deductFromThisPack;
      
      if (pack.tokensRemaining === 0) {
        pack.isActive = false;  // 使い切ったパックは非アクティブ
        console.log(`🏁 トークンパック完了: ${pack.stripeSessionId} (${pack.tokensPurchased}トークン)`);
      }
      
      await pack.save();
    }
    
    if (remainingToDeduct > 0) {
      log.warn('トークン残高不整合', { remainingToDeduct, message: 'トークン分が不足' });
    }
  }
  
  /**
   * ユーザーの現在のトークンバランス取得
   * @param {string} userId - ユーザーID
   * @returns {Promise<number>} トークンバランス
   */
  static async getUserTokenBalance(userId) {
    try {
      const user = await User.findById(userId).select('tokenBalance');
      return user ? user.tokenBalance : 0;
    } catch (error) {
      console.error('❌ トークンバランス取得エラー:', error);
      return 0;
    }
  }
  
  /**
   * ユーザーのトークン購入履歴取得
   * @param {string} userId - ユーザーID
   * @param {number} limit - 取得件数
   * @returns {Promise<Array>} 購入履歴
   */
  static async getUserTokenHistory(userId, limit = 10) {
    try {
      const tokenPacks = await UserTokenPack.find({ userId })
        .sort({ purchaseDate: -1 })
        .limit(limit)
        .select('purchaseAmountYen tokensPurchased tokensRemaining isActive purchaseDate stripeSessionId');
        
      return tokenPacks.map(pack => ({
        id: pack._id,
        purchaseAmountYen: pack.purchaseAmountYen,
        tokensPurchased: pack.tokensPurchased,
        tokensRemaining: pack.tokensRemaining,
        isActive: pack.isActive,
        purchaseDate: pack.purchaseDate,
        stripeSessionId: pack.stripeSessionId,
        usageRate: ((pack.tokensPurchased - pack.tokensRemaining) / pack.tokensPurchased * 100).toFixed(1)
      }));
    } catch (error) {
      console.error('❌ トークン履歴取得エラー:', error);
      return [];
    }
  }
  
  /**
   * ユーザーのトークン使用履歴取得
   * @param {string} userId - ユーザーID
   * @param {number} limit - 取得件数
   * @returns {Promise<Array>} 使用履歴
   */
  static async getUserTokenUsage(userId, limit = 20) {
    try {
      const usageHistory = await TokenUsage.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('characterId', 'name')
        .select('tokensUsed messageContent timestamp characterId');
        
      return usageHistory.map(usage => ({
        id: usage._id,
        tokensUsed: usage.tokensUsed,
        messageLength: usage.messageContent ? usage.messageContent.length : 0,
        timestamp: usage.timestamp,
        characterName: usage.characterId?.name?.ja || usage.characterId?.name || 'Unknown'
      }));
    } catch (error) {
      console.error('❌ トークン使用履歴取得エラー:', error);
      return [];
    }
  }
  
  /**
   * システム全体のトークン統計取得（管理者用）
   * @param {number} days - 集計期間（日数）
   * @returns {Promise<Object>} 統計情報
   */
  static async getSystemTokenStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const [
        totalRevenue,
        totalTokensSold,
        totalTokensUsed,
        activeUsers,
        recentPurchases
      ] = await Promise.all([
        UserTokenPack.aggregate([
          { $match: { purchaseDate: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$purchaseAmountYen' } } }
        ]),
        UserTokenPack.aggregate([
          { $match: { purchaseDate: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$tokensPurchased' } } }
        ]),
        TokenUsage.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$tokensUsed' } } }
        ]),
        User.countDocuments({ tokenBalance: { $gt: 0 } }),
        UserTokenPack.find({ purchaseDate: { $gte: startDate } })
          .sort({ purchaseDate: -1 })
          .limit(10)
          .populate('userId', 'email username')
      ]);
      
      const revenue = totalRevenue[0]?.total || 0;
      const tokensSold = totalTokensSold[0]?.total || 0;
      const tokensUsed = totalTokensUsed[0]?.total || 0;
      
      // 利益計算
      const estimatedCost = tokensUsed * parseFloat(process.env.TOKEN_COST_PER_UNIT || '0.0003');
      const estimatedProfit = revenue - estimatedCost;
      const profitMargin = revenue > 0 ? (estimatedProfit / revenue * 100).toFixed(2) : '0.00';
      
      return {
        period: `${days}日間`,
        revenue: revenue,
        tokensSold: tokensSold,
        tokensUsed: tokensUsed,
        tokensRemaining: tokensSold - tokensUsed,
        estimatedCost: estimatedCost.toFixed(2),
        estimatedProfit: estimatedProfit.toFixed(2),
        profitMargin: `${profitMargin}%`,
        activeUsers: activeUsers,
        recentPurchases: recentPurchases.map(purchase => ({
          id: purchase._id,
          userEmail: purchase.userId?.email || 'Unknown',
          amount: purchase.purchaseAmountYen,
          tokens: purchase.tokensPurchased,
          date: purchase.purchaseDate
        }))
      };
    } catch (error) {
      console.error('❌ システム統計取得エラー:', error);
      return null;
    }
  }
  
  /**
   * トークン料金プラン計算
   * @returns {Promise<Array>} 料金プラン配列
   */
  static async getTokenPlans() {
    const tokenCostPerUnit = parseFloat(process.env.TOKEN_COST_PER_UNIT || '0.0003');
    const profitMargin = parseFloat(process.env.PROFIT_MARGIN || '0.8');
    
    const plans = [
      { priceYen: 500, name: 'スターター', description: '軽くチャットを楽しみたい方向け' },
      { priceYen: 1000, name: 'レギュラー', description: '日常的にチャットを楽しむ方向け' },
      { priceYen: 2000, name: 'プレミアム', description: 'たくさんチャットしたい方向け' },
      { priceYen: 5000, name: 'ヘビーユーザー', description: '本格的にご利用の方向け' }
    ];
    
    return Promise.all(plans.map(async plan => {
      const tokensGiven = await this.calculateTokensToGive(plan.priceYen);
      return {
        ...plan,
        tokensGiven: tokensGiven,
        tokensPerYen: (tokensGiven / plan.priceYen).toFixed(3),
        estimatedMessages: Math.floor(tokensGiven / 150), // 1メッセージ約150トークンと仮定
        profitGuaranteed: `${profitMargin * 100}%`
      };
    }));
  }
}

module.exports = TokenService;