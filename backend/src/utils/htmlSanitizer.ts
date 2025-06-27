import sanitizeHtml from 'sanitize-html';

// 厳格なサニタイザー設定（XSS対策）
const strictOptions: sanitizeHtml.IOptions = {
  allowedTags: [], // すべてのHTMLタグを削除
  allowedAttributes: {},
  textFilter: (text) => text // テキストはそのまま保持
};

// チャットメッセージ用のサニタイザー設定
const chatOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'br'],
  allowedAttributes: {},
  allowedSchemes: [], // URLスキームを許可しない
  disallowedTagsMode: 'discard'
};

// メール用のサニタイザー設定
const emailOptions: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'a'],
  allowedAttributes: {
    a: ['href']
  },
  allowedSchemes: ['https', 'mailto'],
  allowedSchemesByTag: {
    a: ['https', 'mailto']
  },
  transformTags: {
    a: (tagName, attribs) => {
      // 外部リンクにはrel="noopener noreferrer"を追加
      return {
        tagName: 'a',
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: '_blank'
        }
      };
    }
  }
};

// HTMLサニタイザーを作成
export function createHtmlSanitizer(
  options: 'strict' | 'chat' | 'email' = 'strict'
): (html: string) => string {
  let sanitizeOptions: sanitizeHtml.IOptions;
  
  switch (options) {
    case 'chat':
      sanitizeOptions = chatOptions;
      break;
    case 'email':
      sanitizeOptions = emailOptions;
      break;
    case 'strict':
    default:
      sanitizeOptions = strictOptions;
      break;
  }

  return (html: string): string => {
    if (!html || typeof html !== 'string') {
      return '';
    }
    return sanitizeHtml(html, sanitizeOptions);
  };
}

// エクスポート：汎用エスケープ関数
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// チャットメッセージのサニタイズ
export function sanitizeChatMessage(message: string): string {
  const sanitizer = createHtmlSanitizer('chat');
  return sanitizer(message);
}

// メール本文のサニタイズ
export function sanitizeEmailContent(content: string): string {
  const sanitizer = createHtmlSanitizer('email');
  return sanitizer(content);
}