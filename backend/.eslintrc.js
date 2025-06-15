module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'custom-api-rules'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    
    // カスタムルール: API重複検出
    'custom-api-rules/no-duplicate-routes': 'error',
    'custom-api-rules/use-route-registry': 'warn'
  }
}