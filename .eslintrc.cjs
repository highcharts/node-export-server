module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2024: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  ],
  overrides: [
    {
      files: ['*.test.js', '*.spec.js'],
      env: {
        jest: true
      }
    }
  ],
  rules: {
    'no-unused-vars': 'off',
    'import/no-cycle': 'error'
  }
};
