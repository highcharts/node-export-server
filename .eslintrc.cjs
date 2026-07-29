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
