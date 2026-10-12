import js from '@eslint/js'
import react from 'eslint-plugin-react'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // docs: Astro site, type-checked by `astro check`
  { ignores: ['dist', 'coverage', 'test/example', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'off',
      // clickable / dropdown-handle / value are intentional DOM attributes
      'react/no-unknown-property': 'off',
      // `cond && call()` is how this codebase branches
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true }
      ]
    }
  }
]
