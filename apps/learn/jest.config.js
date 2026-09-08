/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|js|mjs)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: false,
        isolatedModules: true,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@angular|rxjs|@engclass|tslib|zone\\.js))',
    '\\.pnpm/(?!(@angular|rxjs|@engclass|tslib|zone\\.js))',
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  verbose: true,
};
