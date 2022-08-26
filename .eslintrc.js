module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended' // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourcetype: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
  rules: {
    'prettier/prettier': 'error',
    'object-shorthand': ['error', 'properties'],
    'unused-imports/no-unused-imports-ts': 2
  }
};
