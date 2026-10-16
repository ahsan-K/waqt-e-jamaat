// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    rules: {
      // i18next's default export is the idiomatic API (i18n.use / i18n.changeLanguage).
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    ignores: ['dist/*', 'ios/*', 'android/*', 'design/*', '.emulator-data/*'],
  },
]);
