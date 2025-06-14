# 🚫 禁止用語・制裁システム実装計画

## 📋 実装タスク一覧

### 🔴 Phase 1: 最優先実装（Day 1）

#### Task 1.1: OpenAI API フォールバック機能
**ファイル**: `backend/utils/contentModeration.js`
**優先度**: 🔴 最優先
**所要時間**: 2-3時間

**実装内容**:
```javascript
// 新規作成: backend/utils/contentModeration.js
async function validateMessage(userId, message) {
  try {
    // 1. カスタム禁止用語チェック
    const blockedCheck = checkBlockedWords(message);
    if (blockedCheck.isBlocked) {
      await recordViolation(userId, 'blocked_word', blockedCheck);
      await applySanction(userId);
      return { allowed: false, reason: blockedCheck.reason };
    }
    
    // 2. OpenAI Moderationチェック（フォールバック対応）
    let moderationCheck;
    try {
      moderationCheck = await checkOpenAIModeration(message);
    } catch (error) {
      console.error('OpenAI Moderation API failed:', error);
      moderationCheck = { isFlagged: false };
    }
    
    if (moderationCheck.isFlagged) {
      await recordViolation(userId, 'openai_moderation', moderationCheck);
      await applySanction(userId);
      return { allowed: false, reason: moderationCheck.reason };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Content moderation failed:', error);
    return { 
      allowed: true,
      warning: 'Moderation check failed - message allowed by fallback'
    };
  }
}
```

**検証テスト**:
- OpenAI API モック失敗テスト
- 通常フロー動作確認
- カスタム禁止用語検出テスト

---

#### Task 1.2: 異議申し立てAPI実装
**ファイル**: 
- `backend/models/AppealRecord.js`
- `backend/routes/sanctions.js`
**優先度**: 🔴 最優先
**所要時間**: 4-5時間

**実装内容**:

1. **AppealRecord モデル作成**
```javascript
// backend/models/AppealRecord.js
const AppealRecordSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true },
  violationId: { type: ObjectId, ref: 'ViolationRecord', required: true },
  sanctionId: { type: ObjectId, ref: 'SanctionRecord' },
  appealType: { 
    type: String, 
    enum: ['false_positive', 'context_misunderstanding', 'technical_error', 'other'],
    required: true 
  },
  userStatement: { type: String, required: true, maxlength: 1000 },
  supportingEvidence: [String],
  status: { 
    type: String, 
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending' 
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: ObjectId, ref: 'User' },
  reviewedAt: Date,
  adminNotes: { type: String, maxlength: 500 },
  resolution: { type: String, maxlength: 500 }
});
```

2. **ユーザー向け異議申し立てAPI**
```javascript
// backend/routes/sanctions.js に追加

// POST /api/sanctions/appeal - 異議申し立て送信
router.post('/appeal', auth, async (req, res) => {
  const { violationId, appealType, userStatement, supportingEvidence } = req.body;
  
  // バリデーション
  if (!violationId || !appealType || !userStatement) {
    return res.status(400).json({ error: '必須項目が不足しています' });
  }
  
  // 既存申し立てチェック
  const existingAppeal = await AppealRecord.findOne({
    userId: req.user.id,
    violationId,
    status: { $in: ['pending', 'under_review'] }
  });
  
  if (existingAppeal) {
    return res.status(400).json({ error: '既に異議申し立て中です' });
  }
  
  // 新規申し立て作成
  const appeal = new AppealRecord({
    userId: req.user.id,
    violationId,
    appealType,
    userStatement,
    supportingEvidence
  });
  
  await appeal.save();
  
  // 管理者通知
  await notifyAdmins('new_appeal', { appealId: appeal._id });
  
  res.json({ success: true, appealId: appeal._id });
});

// GET /api/sanctions/my-appeals - 自分の申し立て一覧
router.get('/my-appeals', auth, async (req, res) => {
  const appeals = await AppealRecord.find({ userId: req.user.id })
    .populate('violationId')
    .sort({ submittedAt: -1 });
  
  res.json(appeals);
});
```

**検証テスト**:
- 異議申し立て送信テスト
- 重複申し立て防止テスト
- 申し立て一覧取得テスト

---

### 🟡 Phase 2: 中優先実装（Day 2）

#### Task 2.1: 設定外部化
**ファイル**: 
- `backend/config/security.js`
- `backend/.env`
**優先度**: 🟡 中優先
**所要時間**: 2-3時間

**実装内容**:
```javascript
// backend/config/security.js
export const getSecurityConfig = () => {
  return {
    alertThresholds: {
      warningCount: parseInt(process.env.SECURITY_WARNING_COUNT || '5'),
      tempBanCount: parseInt(process.env.SECURITY_TEMP_BAN_COUNT || '10'),
      permanentBanCount: parseInt(process.env.SECURITY_PERM_BAN_COUNT || '20')
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
```

**環境変数設定**:
```env
# backend/.env に追加
SECURITY_WARNING_COUNT=5
SECURITY_TEMP_BAN_COUNT=10
SECURITY_PERM_BAN_COUNT=20
SECURITY_TEMP_BAN_HOURS=24
ENABLE_OPENAI_MODERATION=true
SECURITY_STRICT_MODE=false
```

---

#### Task 2.2: ユーザー制裁状況確認API
**ファイル**: `backend/routes/user.js`
**優先度**: 🟡 中優先
**所要時間**: 2-3時間

**実装内容**:
```javascript
// GET /api/users/me/sanctions-status
router.get('/me/sanctions-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 違反回数カウント
    const violationCount = await ViolationRecord.countDocuments({ 
      userId,
      processed: true 
    });
    
    // アクティブな制裁
    const activeSanctions = await SanctionRecord.find({
      userId,
      isActive: true,
      $or: [
        { endDate: null }, // 永久BAN
        { endDate: { $gt: new Date() } } // 有効期限内
      ]
    });
    
    // 設定値取得
    const config = getSecurityConfig();
    
    // 次の制裁までの回数計算
    let nextSanctionIn = null;
    if (violationCount < config.alertThresholds.warningCount) {
      nextSanctionIn = config.alertThresholds.warningCount - violationCount;
    } else if (violationCount < config.alertThresholds.tempBanCount) {
      nextSanctionIn = config.alertThresholds.tempBanCount - violationCount;
    } else if (violationCount < config.alertThresholds.permanentBanCount) {
      nextSanctionIn = config.alertThresholds.permanentBanCount - violationCount;
    }
    
    res.json({
      violationCount,
      activeSanctions,
      nextSanctionIn,
      warningLevel: violationCount >= config.alertThresholds.warningCount,
      canAppeal: violationCount > 0
    });
  } catch (error) {
    res.status(500).json({ error: 'システムエラーが発生しました' });
  }
});
```

---

### 🎨 Phase 3: フロントエンド実装（Day 3）

#### Task 3.1: 制裁カウンター表示コンポーネント
**ファイル**: `frontend/components/chat/SanctionWarning.tsx`
**優先度**: 🟡 中優先
**所要時間**: 3-4時間

**実装内容**:
```typescript
// frontend/components/chat/SanctionWarning.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SanctionWarningProps {
  violationCount: number;
  nextSanctionIn: number | null;
  warningLevel: boolean;
  onAppealClick: () => void;
}

export const SanctionWarning: React.FC<SanctionWarningProps> = ({
  violationCount,
  nextSanctionIn,
  warningLevel,
  onAppealClick
}) => {
  if (!warningLevel || !nextSanctionIn) return null;
  
  const isUrgent = nextSanctionIn <= 2;
  
  return (
    <div className={`p-3 rounded-lg mb-4 border ${
      isUrgent 
        ? 'bg-red-50 border-red-200' 
        : 'bg-yellow-50 border-yellow-200'
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
      <p className={`text-xs mt-1 ${
        isUrgent ? 'text-red-600' : 'text-yellow-600'
      }`}>
        適切な言葉遣いでのチャットをお願いします
      </p>
      <button 
        onClick={onAppealClick}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
      >
        過去の違反について異議申し立てする
      </button>
    </div>
  );
};
```

---

#### Task 3.2: 異議申し立てモーダル
**ファイル**: `frontend/components/modals/AppealModal.tsx`
**優先度**: 🟡 中優先
**所要時間**: 4-5時間

**実装内容**:
```typescript
// frontend/components/modals/AppealModal.tsx
interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ViolationRecord[];
}

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  onClose,
  violations
}) => {
  const [selectedViolation, setSelectedViolation] = useState<string>('');
  const [appealType, setAppealType] = useState<string>('');
  const [userStatement, setUserStatement] = useState<string>('');
  
  const handleSubmit = async () => {
    const response = await fetch('/api/sanctions/appeal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token
      },
      body: JSON.stringify({
        violationId: selectedViolation,
        appealType,
        userStatement
      })
    });
    
    if (response.ok) {
      toast.success('異議申し立てを送信しました');
      onClose();
    } else {
      toast.error('送信に失敗しました');
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">異議申し立て</h2>
        
        {/* 違反選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            異議申し立てする違反を選択
          </label>
          <select
            value={selectedViolation}
            onChange={(e) => setSelectedViolation(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">選択してください</option>
            {violations.map((violation) => (
              <option key={violation._id} value={violation._id}>
                {violation.timestamp} - {violation.reason}
              </option>
            ))}
          </select>
        </div>
        
        {/* 申し立てタイプ */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            申し立て理由
          </label>
          <select
            value={appealType}
            onChange={(e) => setAppealType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">選択してください</option>
            <option value="false_positive">誤検出（適切な内容だった）</option>
            <option value="context_misunderstanding">文脈の誤解</option>
            <option value="technical_error">技術的エラー</option>
            <option value="other">その他</option>
          </select>
        </div>
        
        {/* 申し立て内容 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            詳細な説明
          </label>
          <textarea
            value={userStatement}
            onChange={(e) => setUserStatement(e.target.value)}
            className="w-full p-2 border rounded h-32"
            placeholder="具体的な状況や理由を説明してください..."
            maxLength={1000}
          />
          <div className="text-right text-xs text-gray-500 mt-1">
            {userStatement.length}/1000
          </div>
        </div>
        
        {/* ボタン */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedViolation || !appealType || !userStatement.trim()}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            申し立てする
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

---

### 🛠️ Phase 4: 管理者機能（Day 4）

#### Task 4.1: 管理者用異議申し立て管理API
**ファイル**: `backend/routes/admin/appeals.js`
**優先度**: 🟡 中優先
**所要時間**: 3-4時間

**実装内容**:
```javascript
// backend/routes/admin/appeals.js

// GET /api/admin/appeals - 異議申し立て一覧
router.get('/appeals', adminAuth, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const filter = status ? { status } : {};
  const appeals = await AppealRecord.find(filter)
    .populate('userId', 'name email')
    .populate('violationId')
    .sort({ submittedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));
  
  const total = await AppealRecord.countDocuments(filter);
  
  res.json({
    appeals,
    pagination: {
      current: Number(page),
      total: Math.ceil(total / Number(limit)),
      count: total
    }
  });
});

// PUT /api/admin/appeals/:id/review - 異議申し立て審査
router.put('/appeals/:id/review', adminAuth, async (req, res) => {
  const { status, adminNotes, resolution } = req.body;
  
  const appeal = await AppealRecord.findById(req.params.id);
  if (!appeal) {
    return res.status(404).json({ error: '異議申し立てが見つかりません' });
  }
  
  appeal.status = status;
  appeal.adminNotes = adminNotes;
  appeal.resolution = resolution;
  appeal.reviewedBy = req.user.id;
  appeal.reviewedAt = new Date();
  
  await appeal.save();
  
  // 承認された場合は制裁を解除
  if (status === 'approved') {
    await reverseViolation(appeal.violationId, appeal.userId);
  }
  
  // ユーザーに結果通知
  await notifyUser(appeal.userId, 'appeal_result', {
    status,
    resolution
  });
  
  res.json({ success: true });
});
```

---

#### Task 4.2: 管理画面UI実装
**ファイル**: `frontend/app/admin/appeals/page.tsx`
**優先度**: 🟡 中優先
**所要時間**: 4-5時間

**実装内容**:
- 異議申し立て一覧表示
- フィルタリング機能（ステータス別）
- 審査モーダル
- ページネーション

---

### 🧪 Phase 5: テスト実装（Day 5）

#### Task 5.1: ユニットテスト
**ファイル**: `backend/tests/contentModeration.test.js`
**優先度**: 🟢 低優先
**所要時間**: 3-4時間

**実装内容**:
```javascript
describe('禁止用語システム', () => {
  test('OpenAI API失敗時のフォールバック', async () => {
    jest.spyOn(openai, 'moderations').mockRejectedValueOnce(new Error('API Error'));
    
    const result = await validateMessage('user123', '普通のメッセージ');
    
    expect(result.allowed).toBe(true);
    expect(result.warning).toContain('fallback');
  });
  
  test('段階的制裁の正確性', async () => {
    const userId = 'test-user';
    
    for (let i = 0; i < 5; i++) {
      await recordViolation(userId, 'blocked_word', { detectedWord: 'テスト' });
    }
    
    await applySanction(userId);
    
    const sanction = await getSanctionStatus(userId);
    expect(sanction.type).toBe('warning');
  });
  
  test('異議申し立てAPI', async () => {
    const response = await request(app)
      .post('/api/sanctions/appeal')
      .set('x-auth-token', testToken)
      .send({
        violationId: testViolationId,
        appealType: 'false_positive',
        userStatement: 'これは誤検出です'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 📊 実装スケジュール

| Day | Phase | タスク | 所要時間 | 担当者 |
|-----|-------|--------|----------|--------|
| 1 | Phase 1 | OpenAI フォールバック | 2-3h | バックエンド |
| 1 | Phase 1 | 異議申し立てAPI | 4-5h | バックエンド |
| 2 | Phase 2 | 設定外部化 | 2-3h | バックエンド |
| 2 | Phase 2 | 制裁状況API | 2-3h | バックエンド |
| 3 | Phase 3 | フロントエンド実装 | 7-9h | フロントエンド |
| 4 | Phase 4 | 管理者機能 | 7-9h | フルスタック |
| 5 | Phase 5 | テスト実装 | 3-4h | 全員 |

**総所要時間**: 約27-36時間（5日間）

---

## 🔧 必要な準備

### 環境変数
```env
# backend/.env に追加
SECURITY_WARNING_COUNT=5
SECURITY_TEMP_BAN_COUNT=10
SECURITY_PERM_BAN_COUNT=20
SECURITY_TEMP_BAN_HOURS=24
ENABLE_OPENAI_MODERATION=true
SECURITY_STRICT_MODE=false
OPENAI_API_KEY=your_openai_api_key
```

### 依存関係
```bash
# 新規追加は特になし（既存プロジェクトで使用可能）
npm install openai  # OpenAI API用（既にあるかもしれない）
```

---

## ✅ 完了判定基準

### Phase 1 完了条件
- [ ] OpenAI API失敗時にエラーでメッセージが止まらない
- [ ] 異議申し立てAPIが正常動作する
- [ ] ユニットテストがpass

### Phase 2 完了条件
- [ ] 環境変数から設定値が読み込まれる
- [ ] 制裁状況APIが正確な値を返す

### Phase 3 完了条件
- [ ] チャット画面に制裁カウンターが表示される
- [ ] 異議申し立てモーダルが動作する

### Phase 4 完了条件
- [ ] 管理者が異議申し立てを審査できる
- [ ] 承認時に制裁が正しく解除される

### Phase 5 完了条件
- [ ] 全ての主要機能にテストが存在する
- [ ] テストカバレッジ80%以上

---

## 🚨 リスク・注意事項

1. **OpenAI API制限**: 使用量に応じた課金発生
2. **パフォーマンス**: 大量のメッセージ処理時の負荷
3. **誤検出対応**: 初期運用では調整が必要
4. **管理者負荷**: 異議申し立ての手動審査

---

**この計画に沿って実装すれば、堅牢で運用しやすい禁止用語・制裁システムが完成します。**