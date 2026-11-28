import js from '@eslint/js';
import globals from 'globals';
import pluginSecurity from 'eslint-plugin-security';
// This is the ESLint configuration file for the server-side code. It sets up the linting rules and environment settings to ensure code quality and security best practices are followed.
export default [
  js.configs.recommended,
  pluginSecurity.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^(next|_)' }],
      'no-console': 'off',
    },
  },
  // Test files — add vitest globals
  {
    files: ['src/tests/**/*.js', 'src/tests/**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
];
