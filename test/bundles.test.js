// Guards the parts of the published build that behavior tests can't see
import { parse } from 'acorn'
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const read = (file) => readFileSync(file, 'utf8') // vitest runs from the project root

it.each(['index.js', 'index.esm.js', 'index.modern.js', 'index.umd.js'])(
  'dist/%s is ES5, like every release up to v2.0.6',
  (file) => {
    const code = read(`dist/${file}`).replace(
      /^import[^;]+;|export\s*\{[^}]*\};?/gm,
      ''
    )
    expect(() => parse(code, { ecmaVersion: 5 })).not.toThrow()
  }
)

it('UMD keeps everything inside its wrapper', () => {
  expect(read('dist/index.umd.js')).toMatch(/^!function\(/)
})

it('UMD finds React on window.React, where React UMD puts it', () => {
  expect(read('dist/index.umd.js')).toMatch(/\(\w+\.React\)\}/)
})

it('ships CSS exactly as authored', () => {
  expect(read('dist/index.css')).toBe(read('src/styles.css'))
})
