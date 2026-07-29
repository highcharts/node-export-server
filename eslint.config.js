import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import { EOL } from 'os';

export default [
  // Replaces .eslintignore, which flat config does not read
  {
    ignores: [
      'dist/**',
      '.cache/**',
      'tmp/**',
      'log/**',
      'tests/**/_results/**'
    ]
  },

  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  prettierRecommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },

    settings: {
      // NOTE: import/no-unresolved cannot see these. Both declare their entry
      //       points through a package.json "exports" map with conditional keys,
      //       and the resolver eslint-plugin-import uses does not implement
      //       "exports" - Node resolves them without trouble, and they work at
      //       runtime and under test.
      //
      //       Listing them here keeps the rule doing its job everywhere else,
      //       rather than turning it off or taking on a resolver that is still
      //       pre-release. Add to this only for packages verified to resolve
      //       correctly at runtime.
      'import/core-modules': ['uuid', 'https-proxy-agent']
    },

    rules: {
      'no-unused-vars': 0,
      'import/no-cycle': 2,
      'prettier/prettier': [
        'error',
        {
          endOfLine: EOL === '\r\n' ? 'crlf' : 'lf'
        }
      ]
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
