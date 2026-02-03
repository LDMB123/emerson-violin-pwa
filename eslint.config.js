export default [
  {
    files: ['src/**/*.js'],
    ignores: ['src/core/wasm/**'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-undef': 'off',
      'no-console': 'off',
    },
  },
];
