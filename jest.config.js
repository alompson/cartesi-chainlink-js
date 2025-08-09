export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@chainlink/contracts/(.*)$': '<rootDir>/__mocks__/@chainlink/contracts/index.js'
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