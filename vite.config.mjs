import { playwright } from '@vitest/browser-playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const bundles = ['index.js', 'index.modern.js']

// Ships the stylesheet and the hand-written public types (why hand-written: see the file) byte for byte:
// Vite's CSS pipeline would add a marker comment. The JS never imports the CSS; users import dist/index.css themselves
const asIs = {
  name: 'as-is',
  apply: 'build',
  buildStart() {
    for (const [file, fileName] of [
      ['src/styles.css', 'index.css'],
      ['src/index.d.ts', 'index.d.ts']
    ]) {
      this.addWatchFile(file)
      this.emitFile({
        type: 'asset',
        fileName,
        source: readFileSync(file, 'utf8')
      })
    }
  }
}

export default defineConfig({
  plugins: [asIs],
  build: {
    lib: { entry: 'src/MultiSelect.tsx' },
    sourcemap: true,
    rolldownOptions: {
      external: ['react', 'react/jsx-runtime'],
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
    exclude: ['**/node_modules/**'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      thresholds: { 100: true }
    },
    // the behavior suite also runs against every published bundle, so a build change can't silently alter behavior
    projects: [
      { extends: true, test: { name: 'src', exclude: ['test/browser/**'] } },
      {
        // real Chromium + real CSS: layout, focus, typing (things jsdom fakes).
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
