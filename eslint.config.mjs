import baseConfig from '@derpierre65/eslint-config/base';
import vue3Config from '@derpierre65/eslint-config/vue3';
import tsConfig from '@derpierre65/eslint-config/ts';

export default [
  ...baseConfig,
  ...tsConfig,
  ...vue3Config,
  {
    ignores: [ '.quasar/*', ],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',

      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  },
];
