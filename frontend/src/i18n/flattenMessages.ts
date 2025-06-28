/**
 * ネストされたメッセージオブジェクトをフラットなキー形式に変換
 * 例: { foo: { bar: "baz" } } -> { "foo.bar": "baz" }
 */
export function flattenMessages(
  messages: Record<string, any>,
  prefix = ''
): Record<string, string> {
  const flattened: Record<string, string> = {};

  Object.keys(messages).forEach((key) => {
    const value = messages[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      flattened[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(flattened, flattenMessages(value, newKey));
    }
  });

  return flattened;
}

/**
 * メッセージの存在を検証
 */
export function validateMessages(
  messages: Record<string, any>,
  requiredKeys: string[]
): { valid: boolean; missing: string[] } {
  const flattened = flattenMessages(messages);
  const missing: string[] = [];

  requiredKeys.forEach((key) => {
    if (!(key in flattened)) {
      missing.push(key);
    }
  });

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * デバッグ用: すべてのキーをログ出力
 */
export function logAllKeys(messages: Record<string, any>, locale: string): void {
  const flattened = flattenMessages(messages);
  console.log(`[i18n] Available keys for locale "${locale}":`, Object.keys(flattened).sort());
}