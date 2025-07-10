import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from '@eslint/config-helpers';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([
  globalIgnores(['**/node_modules/', '**/dist/']),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {}
    },
    plugins: {
      import: fixupPluginRules(importPlugin),
      prettier: fixupPluginRules(prettierPlugin)
    },
    extends: fixupConfigRules(
      compat.extends(
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:prettier/recommended'
      )
    ),
    rules: {
      'no-unused-vars': 'off',
      'import/namespace': 'off',
      'import/no-cycle': 'error',
      'import/no-named-as-default': 'off'
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
]);
