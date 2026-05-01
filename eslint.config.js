import os from 'node:os';

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: false
    }
  },
  {
    ignores: ['node_modules/**', 'dist/**']
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin
    },
    rules: {
      'no-unused-vars': 0,
      'no-useless-assignment': 0,
      'import/no-cycle': ['error', { ignoreExternal: true }],
      'import/no-unresolved': ['error', { ignore: ['^uuid$'] }],
      'prettier/prettier': [
        'error',
        {
          endOfLine: os.EOL === '\r\n' ? 'crlf' : 'lf'
        }
      ]
    }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    }
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  }
];
