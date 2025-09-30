import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from '@eslint/config-helpers';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// A compatibility utils for ESLint configs
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended
});

// Base ESLint language options configuration
const baseLanguageOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  globals: {
    ...globals.browser,
    ...globals.node
  }
};

// Base ESLint settings configuration
const baseSettings = {
  'import/resolver': {
    node: {
      extensions: ['.js', '.cjs', '.mjs', '.json']
    }
  },

  // Prevent eslint-plugin-import from traversing ignored dirs
  'import/ignore': ['node_modules', 'dist', '.cache', 'tmp']
};

// Base ESLint plugins configuration
const basePlugins = {
  import: fixupPluginRules(importPlugin),
  prettier: fixupPluginRules(prettierPlugin)
};

// Base ESLint extends configuration
const baseExtends = fixupConfigRules(
  compat.extends(
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  )
);

// Base ESLint rules configuration
const baseRules = {
  'import/no-cycle': 'error',
  'import/no-unresolved': [
    'error',
    {
      ignore: ['uuid']
    }
  ]
};

// Function to add ESLint configuration
export default defineConfig([
  // Ignore
  globalIgnores(['**/node_modules', '**/dist', '**/.cache', '**/tmp']),

  // JS Linting
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ...baseLanguageOptions
    },
    settings: {
      ...baseSettings
    },
    plugins: {
      ...basePlugins
    },
    extends: [...baseExtends],
    rules: {
      ...baseRules
    }
  },

  // Jest Linting
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      ...baseLanguageOptions,
      globals: {
        ...baseLanguageOptions.globals,
        ...globals.jest
      }
    },
    settings: {
      ...baseSettings
    },
    plugins: {
      ...basePlugins
    },
    extends: [...baseExtends],
    rules: {
      ...baseRules
    }
  }
]);
