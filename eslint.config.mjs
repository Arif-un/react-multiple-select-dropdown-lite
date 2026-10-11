import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import globals from 'globals'

export default [
  { ignores: ['dist', 'coverage', 'test/example'] },
  js.configs.recommended,
  react.configs.flat.recommended,
  prettier,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'off',
      // clickable / dropdown-handle / value are intentional DOM attributes
      'react/no-unknown-property': 'off'
    }
  }
]
