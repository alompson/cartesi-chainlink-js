export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@chainlink/contracts/abi/v0.8/(.*)$': '<rootDir>/__mocks__/@chainlink/contracts/index.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['jest-extended/all'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { 
      useESM: true,
      tsconfig: {
        module: 'ESNext'
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
}; 