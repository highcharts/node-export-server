/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  transform: {
    // '^.+\\.test.js?$': 'babel-jest'
  }
};

export default config;
