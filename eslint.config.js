import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

// Base ESLint language options configuration
const baseLanguageOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  globals: {
    ...globals.browser,
    ...globals.node
  }
};

// Base ESLint plugins configuration
const basePlugins = {
  prettier: prettier
};

// Add ESLint configuration
export default [
  // Ignore
  {
    ignores: ['**/node_modules/', '**/dist/', '**/.cache/', '**/tmp/']
  },

  // JS Linting
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ...baseLanguageOptions
    },
    plugins: {
      ...basePlugins
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettier.configs.recommended.rules
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
    plugins: {
      ...basePlugins
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettier.configs.recommended.rules
    }
  }
];
