/**
 * ユーザー名の安全変換ユーティリティ
 * バックエンドとフロントエンド両方で一貫した処理を保証
 */
export function ensureUserNameString(nameField: any): string {
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'object' && nameField?.name) return nameField.name;
  if (typeof nameField === 'object' && nameField?.ja) return nameField.ja;
  if (typeof nameField === 'object' && nameField?.en) return nameField.en;
  return 'Unknown User';
}

/**
 * ユーザー名の型ガード
 */
export function isValidUserName(nameField: any): nameField is string {
  return typeof nameField === 'string' && nameField.trim().length > 0;
}