module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      // Phase 1: 基本的なルール（warning-only）
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off', // 開発中はconsole.logを許可
      
      // コード品質向上
      'prefer-const': 'warn',
      'no-var': 'warn',
      'eqeqeq': 'warn'
    }
  }
];