module.exports = {
  env: {
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:prettier/recommended'
  ],
  plugins: ['import', 'prettier'],
  rules: {
    'no-unused-vars': 'off',
    'import/no-cycle': 2,
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'none',
        semi: true,
        tabWidth: 2,
        endOfLine: require('os').EOL === '\r\n' ? 'crlf' : 'lf'
      }
    ]
  }
};
