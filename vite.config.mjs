import { playwright } from '@vitest/browser-playwright'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const bundles = ['index.js', 'index.modern.js']

// Copies imported CSS to dist/index.css byte for byte. Vite's CSS pipeline would add a marker comment.
// The JS never imports it; users import dist/index.css themselves.
const cssAsIs = {
  name: 'css-as-is',
  apply: 'build',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source.endsWith('.css'))
      return '\0css:' + resolve(dirname(importer), source)
  },
  load(id) {
    if (!id.startsWith('\0css:')) return
    const file = id.slice(5)
    // the \0 id is virtual, so `vite build --watch` only sees the real file if told
    this.addWatchFile(file)
    this.emitFile({
      type: 'asset',
      fileName: 'index.css',
      source: readFileSync(file, 'utf8')
    })
    return ''
  }
}

// ships the hand-written public types as dist/index.d.ts (why hand-written: see the file)
const typesAsIs = {
  name: 'types-as-is',
  apply: 'build',
  buildStart() {
    this.addWatchFile('src/index.d.ts')
    this.emitFile({
      type: 'asset',
      fileName: 'index.d.ts',
      source: readFileSync('src/index.d.ts', 'utf8')
    })
  }
}

export default defineConfig({
  plugins: [cssAsIs, typesAsIs],
  build: {
    lib: { entry: 'src/MultiSelect.tsx' },
    sourcemap: true,
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: [
        // 'use client': Next.js App Router can import it from a Server Component
        {
          format: 'cjs',
          entryFileNames: 'index.js',
          exports: 'default',
          postBanner: "'use client';"
        },
        {
          format: 'es',
          entryFileNames: 'index.modern.js',
          postBanner: "'use client';",
          // Vite skips whitespace minification for ES libs by default
          minify: true
        }
      ]
    }
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', 'test/example/**'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      thresholds: { 100: true }
    },
    // the behavior suite also runs against every published bundle, so a build change can't silently alter behavior
    projects: [
      { extends: true, test: { name: 'src', exclude: ['test/browser/**'] } },
      {
        // real Chromium + real CSS: layout, focus, contentEditable typing (things jsdom fakes).
        // Runs without coverage (see test script): Vite's dev-server interop adds branches that aren't in src.
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }]
          }
        }
      },
      ...bundles.map((file) => ({
        extends: true,
        test: {
          name: `dist/${file}`,
          include: ['test/MultiSelect.test.tsx'],
          // let Node load the CJS bundle as-is
          server: {
            deps: { external: file.endsWith('.modern.js') ? [] : [/\/dist\//] }
          }
        },
        resolve: {
          alias: [
            {
              find: /^.*\/src\/MultiSelect$/,
              replacement: fileURLToPath(
                new URL(`./dist/${file}`, import.meta.url)
              )
            }
          ]
        }
      }))
    ]
  }
})
