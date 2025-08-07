export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@chainlink/contracts/abi/v0.8/(.*)$': '<rootDir>/__mocks__/@chainlink/contracts/index.js',
  },
  setupFilesAfterEnv: ['jest-extended/all'],
}; 