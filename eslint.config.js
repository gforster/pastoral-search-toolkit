import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist/**', 'node_modules/**', 'test-results/**', '**/*.ts'] },
  { files: ['src/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, axe:'readonly', registeredTools:'readonly' } },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}], 'no-empty':['error',{allowEmptyCatch:true}] }
  }
];
