module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'custom-api-rules'],
  ignorePatterns: [
    'src/scripts/**/*',
    'dist/**/*',
    'node_modules/**/*',
    '*.js'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    
    // カスタムルール: API重複検出
    'custom-api-rules/no-duplicate-routes': 'error',
    'custom-api-rules/use-route-registry': 'warn'
  }
}