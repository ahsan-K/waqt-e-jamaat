// Security-rules tests against the RTDB emulator (npm run test:rules).
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/rules-tests'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  testTimeout: 20000,
};
