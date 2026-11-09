export default {
  testEnvironment: 'jest-environment-node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  moduleNameMapper: {
    // See tests/unit/__shims__/jsdom.cjs
    '^jsdom$': '<rootDir>/tests/unit/__shims__/jsdom.cjs'
  },
  transform: {
    // '^.+\\.test.js?$': 'babel-jest'
  }
};
