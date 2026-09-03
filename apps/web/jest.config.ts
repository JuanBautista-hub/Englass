import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node'],
  },
  globalSetup: 'jest-preset-angular/global-setup',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    '^@engclass/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^canvas$': '<rootDir>/src/test-helpers/canvas.cjs',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/main.ts',
    '!src/environments/**',
    '!src/test-helpers/**',
  ],
  coverageThreshold: {
    global: {
      statements: 25,
      functions: 25,
      branches: 25,
      lines: 25,
    },
  },
  coverageReporters: ['text', 'text-summary'],
};

export default config;