import globals from 'globals';

export default [
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser, __VERSAO__: 'readonly' } },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-dupe-keys': 'error', 'no-unreachable': 'warn' },
  },
];