module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((@react-native|react-native|react-native-svg|lucide-react-native|@react-navigation|@op-engineering)/))',
  ],
  // Jest resolves lucide deep imports to ESM .mjs files, which the RN preset does not
  // transform. Point them at the package's CommonJS build instead.
  moduleNameMapper: {
    '^lucide-react-native/icons/(.*)$': '<rootDir>/../../node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
};
