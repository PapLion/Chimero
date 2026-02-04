/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: false,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'out/',
    '*.cjs',
    'drizzle/',
    'coverage/',
    '**/electron.vite.config.ts',
    '**/tailwind.config.js',
    '**/postcss.config.js',
  ],
  overrides: [
    {
      files: ['apps/electron/src/renderer/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['electron', 'electron/*'],
                message: 'Renderer must not import electron directly. Use window.api (IPC) instead.',
              },
              {
                group: ['**/main/**', '**/main/*'],
                message: 'Renderer must not import from main process. Use window.api instead.',
              },
              {
                group: ['**/packages/db/src/database', '**/db/src/database'],
                message: 'Renderer must not import database. Use types from db package and window.api for data.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['apps/electron/src/preload/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['apps/electron/src/main/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'placeholder'], location: 'start' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-empty-function': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'react/prop-types': 'off',
  },
}
