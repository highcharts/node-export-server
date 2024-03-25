module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  root: true,
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
    'no-unused-vars': 0,
    'import/no-cycle': 2,
    'prettier/prettier': [
      'error',
      {
        endOfLine: require('os').EOL === '\r\n' ? 'crlf' : 'lf'
      }
    ]
  }
};
