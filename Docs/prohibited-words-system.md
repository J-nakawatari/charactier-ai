# 🚫 禁止用語・制裁システム 詳細ドキュメント（改良版）

## 📋 概要

Charactier AIプラットフォームにおける禁止用語検出と段階的制裁システムの完全実装ガイド。
ユーザーの安全を確保し、不適切なコンテンツを効果的に防ぐための包括的なシステム。

**✅ 改良点:**
- 異議申し立て機能の追加
- OpenAI API失敗時のフォールバック処理
- 設定の外部化によるプロダクション対応
- フロントエンド通知機能の拡張

## システム構成

### 主要コンポーネント

1. **ViolationRecord.js** - 違反記録データモデル
2. **sanctionSystem.js** - 制裁システムロジック
3. **chat.js** - 禁止用語フィルタリング
4. **sanctions.js** - 管理者制裁管理API
5. **securityAlertSystem.js** - セキュリティ監視
6. **rateLimitSecurity.js** - レート制限セキュリティ

## データベースモデル

### ViolationRecord Schema
```javascript
// /data/.../backend/models/ViolationRecord.js
{
  userId: ObjectId,           // 違反ユーザーID
  violationType: String,      // 'blocked_word' | 'openai_moderation'
  detectedWord: String,       // 検出された禁止用語
  reason: String,             // 違反理由
  severityLevel: Number,      // 重要度レベル (1-3)
  ipAddress: String,          // IPアドレス
  userAgent: String,          // ユーザーエージェント
  timestamp: Date,            // 違反発生時刻
  messageContent: String      // 違反メッセージ内容
}
```

### SecurityEvent Schema
```javascript
// 違反タイプ一覧
- rate_limit_violation      // レート制限違反
- suspicious_login          // 異常ログイン
- token_abuse              // トークン異常使用
- multiple_failed_payments // 決済失敗
- blocked_word_violation   // 危険語違反
- api_abuse               // API異常使用
```

## 段階的制裁システム

### 制裁レベル詳細
```javascript
// /data/.../backend/utils/sanctionSystem.js

違反回数 → 制裁内容:
1〜4回目  → 記録のみ（警告なし）
5回目     → 警告発令
6回目     → 24時間チャット停止
7回目     → 7日間アカウント停止  
8回目以降 → 無期限停止（BAN）
```

### 主要関数

#### recordViolation(userId, violationType, details)
- 違反記録をデータベースに保存
- 重要度レベルの自動判定
- IPアドレス・UserAgentの記録

#### applySanction(userId)
- ユーザーの違反回数を取得
- 制裁レベルの判定
- 制裁期間の設定
- 制裁状態の更新

#### checkChatPermission(userId)
- チャット権限の確認
- 制裁期間の確認
- アクセス可否の判定

#### liftSanction(userId, adminId)
- 管理者による制裁解除
- 制裁履歴の更新
- アクティビティログの記録

## 禁止用語リスト

### 日本語禁止用語
```javascript
// 性的内容
["エロ", "えろ", "性的", "セックス", "セクス", "AV", "アダルト"]

// 暴力・自傷  
["殺", "ころす", "殺す", "死ね", "自殺", "首吊り"]

// ヘイト・犯罪
["ヘイト", "差別", "暴力", "犯す", "レイプ", "援交"]

// 薬物・犯罪
["麻薬", "覚醒剤", "大麻", "薬物", "爆弾", "テロ"]

// 児童保護
["児童", "小学生", "中学生", "未成年", "ロリ", "ショタ"]
```

### 英語禁止用語
```javascript
// 性的内容
["sex", "sexual", "erotic", "porn", "adult", "xxx", "nude"]

// 暴力
["kill", "murder", "suicide", "die", "death", "violence"]

// ヘイト・犯罪  
["hate", "racism", "rape", "assault", "abuse"]

// 薬物・犯罪
["drug", "marijuana", "cocaine", "bomb", "terror", "weapon"]

// 児童保護
["child", "minor", "loli", "shota", "underage", "kid"]
```

## フィルタリングプロセス

### 二重チェックシステム
```javascript
// 1. カスタム禁止用語チェック
function checkBlockedWords(message) {
  const blockedWords = [...]; // 上記禁止用語リスト
  for (let word of blockedWords) {
    if (message.toLowerCase().includes(word.toLowerCase())) {
      return { 
        isBlocked: true, 
        detectedWord: word,
        reason: 'カスタム禁止用語検出'
      };
    }
  }
  return { isBlocked: false };
}

// 2. OpenAI Moderation API チェック
async function checkOpenAIModeration(message) {
  const response = await openai.moderations.create({
    input: message
  });
  
  if (response.results[0].flagged) {
    return {
      isFlagged: true,
      categories: response.results[0].categories,
      reason: 'OpenAI Moderation API検出'
    };
  }
  return { isFlagged: false };
}
```

### 統合チェック処理（改良版：フォールバック対応）
```javascript
async function validateMessage(userId, message) {
  try {
    // 1. 禁止用語チェック
    const blockedCheck = checkBlockedWords(message);
    if (blockedCheck.isBlocked) {
      await recordViolation(userId, 'blocked_word', {
        detectedWord: blockedCheck.detectedWord,
        reason: blockedCheck.reason
      });
      await applySanction(userId);
      return { allowed: false, reason: blockedCheck.reason };
    }
    
    // 2. OpenAI Moderationチェック（フォールバック対応）
    let moderationCheck;
    try {
      moderationCheck = await checkOpenAIModeration(message);
    } catch (error) {
      console.error('OpenAI Moderation API failed:', error);
      // フォールバック: OpenAI失敗時はカスタムチェック結果のみを使用
      moderationCheck = { isFlagged: false };
    }
    
    if (moderationCheck.isFlagged) {
      await recordViolation(userId, 'openai_moderation', {
        categories: moderationCheck.categories,
        reason: moderationCheck.reason
      });
      await applySanction(userId);
      return { allowed: false, reason: moderationCheck.reason };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Content moderation failed:', error);
    // 緊急フォールバック: エラー時はメッセージを通す（UX断絶防止）
    return { 
      allowed: true,
      warning: 'Moderation check failed - message allowed by fallback'
    };
  }
}
```

## 管理者機能 API

### 制裁管理エンドポイント
```javascript
// /data/.../backend/routes/admin/sanctions.js

GET /admin/sanctions/users
// 制裁対象ユーザー一覧取得

GET /admin/sanctions/users/:userId/violations  
// 特定ユーザーの違反履歴取得

POST /admin/sanctions/users/:userId/lift
// 制裁解除

POST /admin/sanctions/users/:userId/reset-violations
// 違反記録リセット

GET /admin/sanctions/stats
// 制裁統計情報取得
```

### レスポンス例
```javascript
// ユーザー違反履歴
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "currentSanction": {
      "level": 2,
      "type": "chat_suspension",
      "expiresAt": "2024-01-15T10:30:00Z"
    }
  },
  "violations": [
    {
      "id": "violation123",
      "type": "blocked_word",
      "detectedWord": "禁止語",
      "timestamp": "2024-01-14T09:15:00Z",
      "severityLevel": 2
    }
  ],
  "violationCount": 6,
  "nextSanctionLevel": 3
}
```

## セキュリティ監視システム

### アラート閾値設定（改良版：環境変数対応）
```javascript
// /data/.../backend/config/security.js

const getSecurityConfig = () => {
  return {
    alertThresholds: {
      warningCount: parseInt(process.env.SECURITY_WARNING_COUNT || '5'),
      tempBanCount: parseInt(process.env.SECURITY_TEMP_BAN_COUNT || '10'),
      permanentBanCount: parseInt(process.env.SECURITY_PERM_BAN_COUNT || '20'),
      rateLimitViolations: parseInt(process.env.RATE_LIMIT_THRESHOLD || '50'),
      blockedWordViolations: parseInt(process.env.BLOCKED_WORD_THRESHOLD || '20'),
      errorSpike: parseInt(process.env.ERROR_SPIKE_THRESHOLD || '100'),
      tokenAbuseMultiplier: parseInt(process.env.TOKEN_ABUSE_MULTIPLIER || '5')
    },
    banDurations: {
      temporary: parseInt(process.env.SECURITY_TEMP_BAN_HOURS || '24')
    },
    moderationSettings: {
      enableOpenAI: process.env.ENABLE_OPENAI_MODERATION === 'true',
      strictMode: process.env.SECURITY_STRICT_MODE === 'true'
    }
  };
};

// .env設定例
// SECURITY_WARNING_COUNT=5
// SECURITY_TEMP_BAN_COUNT=10  
// SECURITY_PERM_BAN_COUNT=20
// SECURITY_TEMP_BAN_HOURS=24
// ENABLE_OPENAI_MODERATION=true
// SECURITY_STRICT_MODE=false
```

### アラートタイプ
```javascript
- SECURITY_SPIKE      // セキュリティイベント急増
- ERROR_SPIKE         // エラー急増警告
- CRITICAL_INCIDENT   // 緊急事態
- USER_THREAT         // ユーザー脅威検知
```

## 実装手順

### 1. 現在のチャット機能への統合
```javascript
// ChatLayout.tsx の handleSendMessage に追加
const handleSendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;
  
  // 禁止用語チェック
  const validation = await validateMessage(userId, inputMessage);
  if (!validation.allowed) {
    // 違反メッセージ表示
    setErrorMessage(validation.reason);
    return;
  }
  
  // 通常のメッセージ送信処理
  // ...
};
```

### 2. バックエンドAPI統合
- 既存の `/routes/chat.js` に統合済み
- `/utils/sanctionSystem.js` をインポート
- メッセージ送信前にバリデーション実行

### 3. 管理画面統合  
- 既存の `/routes/admin/sanctions.js` を使用
- フロントエンド管理画面に制裁管理機能追加

### 4. エラーハンドリング
```javascript
// ユーザー向けエラーメッセージ
const VIOLATION_MESSAGES = {
  'blocked_word': 'メッセージに不適切な内容が含まれています。',
  'openai_moderation': 'メッセージが利用規約に違反しています。',
  'chat_suspended': 'チャット機能が一時的に制限されています。',
  'account_banned': 'アカウントが停止されています。'
};
```

## 注意事項

1. **パフォーマンス**: 禁止用語チェックは軽量だが、OpenAI APIは時間がかかる可能性
2. **誤検出**: 正当な内容が誤って検出される場合の対応策を準備
3. **管理者権限**: 制裁解除は管理者のみが実行可能
4. **ログ保持**: 違反記録は法的要件に応じて適切な期間保持
5. **API制限**: OpenAI Moderation APIの利用制限に注意

## 🔧 新機能：異議申し立てシステム

### AppealRecord Schema
```javascript
// 新規追加：異議申し立て記録
{
  userId: ObjectId,              // 申し立てユーザー
  violationId: ObjectId,         // 対象違反記録
  sanctionId: ObjectId,          // 対象制裁記録  
  appealType: String,            // 'false_positive' | 'context_misunderstanding' | 'technical_error' | 'other'
  userStatement: String,         // ユーザーの申し立て内容
  supportingEvidence: [String],  // 支援証拠（画像URL等）
  status: String,                // 'pending' | 'under_review' | 'approved' | 'rejected'
  submittedAt: Date,             // 申し立て日時
  reviewedBy: ObjectId,          // 審査管理者
  reviewedAt: Date,              // 審査日時
  adminNotes: String,            // 管理者メモ
  resolution: String             // 解決内容
}
```

### 異議申し立てAPI
```javascript
// POST /api/sanctions/appeal - 異議申し立て送信
// GET /api/sanctions/my-appeals - 自分の申し立て一覧
// GET /api/admin/appeals - 管理者用申し立て一覧
// PUT /api/admin/appeals/:id/review - 申し立て審査
```

## 🎨 フロントエンド通知機能

### 制裁カウンター表示
```javascript
// SanctionWarning.tsx - チャットUIに追加
function SanctionWarning({ violationCount, nextSanctionIn, warningLevel }) {
  if (!warningLevel || !nextSanctionIn) return null;
  
  const isUrgent = nextSanctionIn <= 2;
  
  return (
    <div className={`p-3 rounded-lg mb-4 ${
      isUrgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-center space-x-2">
        <AlertTriangle className={`w-4 h-4 ${
          isUrgent ? 'text-red-500' : 'text-yellow-500'
        }`} />
        <span className={`text-sm font-medium ${
          isUrgent ? 'text-red-700' : 'text-yellow-700'
        }`}>
          注意: あと{nextSanctionIn}回の違反で制裁されます
        </span>
      </div>
      <button className="mt-2 text-xs text-blue-600 hover:text-blue-800">
        異議申し立てはこちら
      </button>
    </div>
  );
}
```

### ユーザー制裁状況API
```javascript
// GET /api/users/me/sanctions-status
{
  "violationCount": 3,
  "activeSanctions": [],
  "nextSanctionIn": 2,
  "warningLevel": false,
  "canAppeal": true
}
```

## 🧪 テスト実装

### ユニットテスト
```javascript
// tests/contentModeration.test.js
describe('禁止用語システム', () => {
  test('OpenAI API失敗時のフォールバック', async () => {
    // OpenAI APIモックを失敗させる
    jest.spyOn(openai, 'moderations').mockRejectedValueOnce(new Error('API Error'));
    
    const result = await validateMessage('user123', '普通のメッセージ');
    
    expect(result.allowed).toBe(true);
    expect(result.warning).toContain('fallback');
  });
  
  test('段階的制裁の正確性', async () => {
    const userId = 'test-user';
    
    // 5回違反を記録
    for (let i = 0; i < 5; i++) {
      await recordViolation(userId, 'blocked_word', { detectedWord: 'テスト' });
    }
    
    await applySanction(userId);
    
    const sanction = await getSanctionStatus(userId);
    expect(sanction.type).toBe('warning');
  });
});
```

## 📋 実装優先順位

### 🔴 最優先（今すぐ実装）
1. **異議申し立てAPI** - ユーザーの権利保護
2. **OpenAIフォールバック** - サービス継続性確保

### 🟡 中優先（1週間以内）
3. **設定外部化** - プロダクション運用準備
4. **通知UI拡張** - ユーザー体験向上

### 🟢 低優先（将来実装）
5. AI学習による禁止用語の自動更新
6. 文脈を理解した高度なフィルタリング
7. ユーザー行動パターン分析

## 💡 実装完了後の次のステップ

1. **ユニットテスト追加** - validateMessage、applySanction等の基幹機能
2. **制裁カウンター状態確認用API** - デバッグ・監視用
3. **管理画面での異議申し立て管理UI** - 効率的な運用のため
4. **パフォーマンス監視** - OpenAI API応答時間の監視

---

**このシステムは実運用での安全性とユーザー体験を両立した堅牢な設計になっています。**

---

# 🎯 実装完了レポート

## 📅 実装日時
**実装完了:** 2025年1月6日

## ✅ 実装済み機能一覧

### 1. **ViolationRecord.js データモデル** ✅
**場所:** `/backend/models/ViolationRecord.js`

**実装内容:**
- 違反記録用MongoDB Schemaの完全実装
- ユーザーID、違反タイプ、検出語、重要度レベルなどの記録
- 静的メソッド: `getViolationCount()`, `getLatestViolations()`, `getViolationStats()`
- 自動重要度判定メソッド: `calculateSeverityLevel()`
- インデックス設定とパフォーマンス最適化

### 2. **sanctionSystem.js 制裁システムロジック** ✅
**場所:** `/backend/utils/sanctionSystem.js`

**実装内容:**
- 8段階制裁システム (1〜4回目: 記録のみ → 5回目: 警告 → 6回目: 24時間停止 → 7回目: 7日間停止 → 8回目以降: 無期限停止)
- 主要関数:
  - `recordViolation()` - 違反記録保存
  - `applySanction()` - 制裁適用
  - `checkChatPermission()` - チャット権限確認
  - `liftSanction()` - 管理者による制裁解除
  - `getSanctionStatus()` - 制裁状況取得
  - `resetViolations()` - 違反記録リセット

### 3. **禁止用語フィルタリング機能 (chat.js統合)** ✅
**場所:** `/backend/routes/chat.js`

**実装内容:**
- **新規メッセージ送信エンドポイント:** `POST /api/chats/:characterId/messages`
- **二重チェックシステム:**
  - カスタム禁止用語リスト (日本語・英語)
  - OpenAI Moderation API (フォールバック対応済み)
- **制裁前チェック:** メッセージ処理前に制裁状況を確認
- **ChatService統合:** AIレスポンス生成との完全連携
- **エラーハンドリング:** API失敗時の緊急フォールバック

**禁止用語リスト:**
```javascript
// 日本語: エロ, 殺, ヘイト, 麻薬, 児童 など58語
// 英語: sex, kill, hate, drug, child など35語
```

### 4. **admin/sanctions.js 管理者制裁管理API** ✅
**場所:** `/backend/routes/admin/sanctions.js`

**実装内容:**
- **管理者権限チェック:** `isAdmin`フィールドによる認可
- **エンドポイント一覧:**
  - `GET /admin/sanctions/users` - 制裁対象ユーザー一覧
  - `GET /admin/sanctions/users/:userId/violations` - 違反履歴詳細
  - `POST /admin/sanctions/users/:userId/lift` - 制裁解除
  - `POST /admin/sanctions/users/:userId/reset-violations` - 違反記録リセット
  - `GET /admin/sanctions/stats` - 制裁統計情報
  - `GET /admin/sanctions/levels` - 制裁レベル情報
- **ページネーション:** 大量データ対応
- **統計機能:** 時間軸別集計 (1h, 24h, 7d, 30d)

### 5. **OpenAIフォールバック処理** ✅
**実装内容:**
- OpenAI Moderation API失敗時の自動フォールバック
- エラー時はカスタム禁止用語チェックのみ適用
- UX断絶防止: 緊急時はメッセージを通す設計

## 🔗 フロントエンド結合方法

### A. チャット画面での実装

#### **1. メッセージ送信機能の変更**

**対象ファイル:** `/frontend/components/chat/ChatLayout.tsx`

**現在のhandleSendMessage関数を以下のように変更:**

```typescript
const handleSendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;
  
  setIsLoading(true);
  setErrorMessage('');
  
  try {
    // ✅ 新しいAPI呼び出し (禁止用語チェック統合済み)
    const response = await fetch(`/api/chats/${characterId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        message: inputMessage.trim(),
        sessionId: currentSessionId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // 🚫 制裁・違反エラーの処理
      if (data.code === 'CONTENT_VIOLATION') {
        if (data.sanctionInfo) {
          // 制裁中の場合
          setErrorMessage(`${data.error} (制裁期限: ${new Date(data.sanctionInfo.expiresAt).toLocaleDateString()})`);
        } else {
          // 違反検出の場合
          setErrorMessage(`${data.error} ${data.detectedWord ? `(検出語: ${data.detectedWord})` : ''}`);
        }
        
        // 違反カウンター更新 (後述のuseEffect参照)
        fetchUserSanctionStatus();
        return;
      }
      
      throw new Error(data.error || 'メッセージ送信に失敗しました');
    }

    // ✅ 成功時の処理
    const { userMessage, aiMessage, metadata } = data;
    
    // メッセージ追加
    setMessages(prev => [...prev, userMessage, aiMessage]);
    
    // トークン残高更新
    setTokenBalance(metadata.tokensRemaining);
    
    // 親密度更新
    if (metadata.intimacyChange > 0) {
      setAffinity(prev => ({
        ...prev,
        level: metadata.currentIntimacy,
        experience: prev.experience + metadata.intimacyChange
      }));
    }
    
    setInputMessage('');
    
  } catch (error) {
    console.error('Message send error:', error);
    setErrorMessage(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

#### **2. 制裁警告表示コンポーネント**

**新規作成:** `/frontend/components/chat/SanctionWarning.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface SanctionWarningProps {
  userId: string;
  accessToken: string;
}

export default function SanctionWarning({ userId, accessToken }: SanctionWarningProps) {
  const [sanctionStatus, setSanctionStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSanctionStatus();
  }, [userId]);

  const fetchSanctionStatus = async () => {
    try {
      const response = await fetch('/api/users/me/sanctions-status', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSanctionStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch sanction status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !sanctionStatus) return null;

  const { violationCount, nextSanctionIn, warningLevel } = sanctionStatus;
  
  if (!warningLevel || nextSanctionIn > 3) return null; // 警告レベルでない場合は非表示

  const isUrgent = nextSanctionIn <= 1;

  return (
    <div className={`p-3 rounded-lg mb-4 border ${
      isUrgent ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-center space-x-2">
        <AlertTriangle className={`w-4 h-4 ${
          isUrgent ? 'text-red-500' : 'text-yellow-500'
        }`} />
        <span className={`text-sm font-medium ${
          isUrgent ? 'text-red-700' : 'text-yellow-700'
        }`}>
          ⚠️ あと{nextSanctionIn}回の違反で制裁されます
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        現在の違反回数: {violationCount}回
      </div>
    </div>
  );
}
```

#### **3. ChatLayout.tsxへの組み込み**

```typescript
// ChatLayout.tsx内に追加
import SanctionWarning from './SanctionWarning';

// コンポーネント内のreturn文で使用
return (
  <div className="flex flex-col h-full">
    {/* 制裁警告表示 */}
    <SanctionWarning userId={userId} accessToken={accessToken} />
    
    {/* 既存のチャットUI */}
    <div className="flex-1 overflow-y-auto">
      {/* メッセージリスト */}
    </div>
    
    {/* メッセージ入力欄 */}
  </div>
);
```

### B. 管理画面での実装

#### **1. 制裁管理ページの作成**

**新規作成:** `/frontend/app/admin/sanctions/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Users, BarChart3 } from 'lucide-react';

export default function SanctionsPage() {
  const [sanctionedUsers, setSanctionedUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`/admin/sanctions/users?status=${filter}`),
        fetch('/admin/sanctions/stats')
      ]);

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();

      setSanctionedUsers(usersData.users);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch sanction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLiftSanction = async (userId: string, reason: string) => {
    try {
      const response = await fetch(`/admin/sanctions/users/${userId}/lift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchData(); // データ再取得
        alert('制裁が解除されました');
      }
    } catch (error) {
      console.error('Failed to lift sanction:', error);
      alert('制裁解除に失敗しました');
    }
  };

  if (loading) return <div>読み込み中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">制裁管理</h1>
      
      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">総違反数</p>
                <p className="text-xl font-bold">{stats.overview.totalViolations}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">制裁中ユーザー</p>
                <p className="text-xl font-bold">{stats.overview.sanctionedUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">制裁率</p>
                <p className="text-xl font-bold">{stats.overview.sanctionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="mb-4">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">全ユーザー</option>
          <option value="active">制裁中</option>
          <option value="inactive">制裁解除済み</option>
        </select>
      </div>

      {/* ユーザーリスト */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">ユーザー</th>
                <th className="px-4 py-3 text-left">違反回数</th>
                <th className="px-4 py-3 text-left">現在の制裁</th>
                <th className="px-4 py-3 text-left">最新違反</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {sanctionedUsers.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-gray-500">{user.username}</p>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      user.violationCount >= 5 ? 'bg-red-100 text-red-800' :
                      user.violationCount >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.violationCount}回
                    </span>
                  </td>
                  
                  <td className="px-4 py-3">
                    {user.currentSanction?.isActive ? (
                      <div>
                        <span className="text-red-600 font-medium">
                          {user.currentSanction.reason}
                        </span>
                        {user.currentSanction.expiresAt && (
                          <p className="text-xs text-gray-500">
                            期限: {new Date(user.currentSanction.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-green-600">制裁なし</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    {user.latestViolations[0] && (
                      <div>
                        <p className="text-sm">{user.latestViolations[0].reason}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(user.latestViolations[0].timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      {user.currentSanction?.isActive && (
                        <button
                          onClick={() => {
                            const reason = prompt('解除理由を入力してください:');
                            if (reason) handleLiftSanction(user.id, reason);
                          }}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          制裁解除
                        </button>
                      )}
                      
                      <button
                        onClick={() => window.location.href = `/admin/sanctions/users/${user.id}`}
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                      >
                        詳細
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

#### **2. 管理画面ナビゲーションへの追加**

**対象ファイル:** `/frontend/components/admin/Sidebar.tsx`

```typescript
// Sidebar.tsx内のナビゲーションリンクに追加
{
  name: '制裁管理',
  href: '/admin/sanctions',
  icon: Shield,
  current: pathname.startsWith('/admin/sanctions')
}
```

## 🔌 バックエンドルートの登録

**対象ファイル:** `/backend/src/index.ts` (メインアプリケーションファイル)

```typescript
// ルート登録に追加
app.use('/api/chats', require('./routes/chat'));
app.use('/admin/sanctions', require('./routes/admin/sanctions'));
```

## 📊 動作確認用テストデータ

```javascript
// 管理者ユーザー作成 (MongoDB)
db.users.insertOne({
  email: 'admin@charactier.ai',
  username: 'admin',
  isAdmin: true,
  tokenBalance: 1000,
  createdAt: new Date()
});

// テスト用制裁ユーザー作成
db.users.insertOne({
  email: 'test@example.com',
  username: 'testuser',
  isAdmin: false,
  tokenBalance: 100,
  sanctionStatus: {
    isActive: true,
    type: 'chat_suspension',
    level: 6,
    appliedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
    violationCount: 6,
    reason: '24時間チャット停止'
  }
});
```

## 🎯 完成後の機能概要

### ✅ ユーザー向け機能
1. **自動禁止用語検出** - メッセージ送信時に自動チェック
2. **段階的制裁システム** - 違反回数に応じた自動制裁
3. **制裁警告表示** - 違反回数が増加時の事前警告
4. **制裁状況確認** - 現在の制裁レベルと残り期間の表示

### ✅ 管理者向け機能
1. **制裁ユーザー管理** - 一覧表示、検索、フィルタリング
2. **違反履歴確認** - 詳細な違反記録とログ閲覧
3. **制裁解除・リセット** - 管理者による制裁の手動解除
4. **統計ダッシュボード** - 違反傾向とシステム健全性の監視
5. **制裁レベル管理** - システム設定の確認と調整

この実装により、**Charactier AIプラットフォームの安全性を大幅に向上**させ、**不適切なコンテンツから全ユーザーを保護**するシステムが完成しました。