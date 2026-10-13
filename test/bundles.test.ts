// Guards the parts of the published build that behavior tests can't see
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const read = (file: string) => readFileSync(file, 'utf8') // vitest runs from the project root

it.each(['index.js', 'index.modern.js'])(
  "dist/%s starts with 'use client' for React Server Components",
  (file) => {
    expect(read(`dist/${file}`)).toMatch(/^'use client';\n/)
  }
)

it('ships CSS exactly as authored', () => {
  expect(read('dist/index.css')).toBe(read('src/styles.css'))
})

it('ships the public types exactly as written', () => {
  expect(read('dist/index.d.ts')).toBe(read('src/index.d.ts'))
})
