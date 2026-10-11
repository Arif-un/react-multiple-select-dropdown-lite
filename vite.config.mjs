import babel, { getBabelOutputPlugin } from '@rollup/plugin-babel'
import { playwright } from '@vitest/browser-playwright'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const bundles = ['index.js', 'index.esm.js', 'index.modern.js', 'index.umd.js']
const es5 = { targets: { ie: '11' }, loose: true }

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

export default defineConfig({
  // classic runtime: react/jsx-runtime does not exist before React 16.14
  oxc: { jsx: { runtime: 'classic' } },
  // Babel (not Oxc) compiles the bundles to reproduce what microbundle-crl shipped up to v2.0.6:
  // ES5 everywhere, loose mode (array spread becomes concat, see MultiSelect.jsx)
  plugins: [
    cssAsIs,
    {
      // inline, not bundled: Rolldown can't tree-shake Babel's bundled helper module
      ...babel({
        babelHelpers: 'inline',
        babelrc: false,
        configFile: false,
        extensions: ['.js', '.jsx'],
        presets: [['@babel/preset-env', es5]]
      }),
      apply: 'build'
    },
    {
      // lowers Rolldown's own CJS interop helpers (arrow functions, let); needs no Babel helpers,
      // so nothing lands outside the UMD wrapper (guarded by test/bundles.test.js)
      ...getBabelOutputPlugin({
        presets: [['@babel/preset-env', es5]],
        allowAllFormats: true
      }),
      apply: 'build'
    }
  ],
  build: {
    lib: { entry: 'src/MultiSelect.jsx' },
    sourcemap: true,
    minify: 'terser',
    rolldownOptions: {
      external: ['react'],
      output: [
        { format: 'cjs', entryFileNames: 'index.js', exports: 'default' },
        { format: 'es', entryFileNames: 'index.esm.js' },
        { format: 'es', entryFileNames: 'index.modern.js' },
        {
          format: 'umd',
          entryFileNames: 'index.umd.js',
          name: 'reactMultipleSelectDropdownLite',
          globals: { react: 'React' } // React's own UMD build sets window.React (v2.0.6 read window.react)
        }
      ].map((output) => ({ ...output, generatedCode: { preset: 'es5' } }))
    }
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', 'test/example/**'],
    coverage: {
      include: ['src/**/*.{js,jsx}'],
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
          include: ['test/browser/**/*.test.jsx'],
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
          include: ['test/MultiSelect.test.jsx'],
          // let Node load CJS/UMD bundles as-is
          server: {
            deps: { external: file.match(/esm|modern/) ? [] : [/\/dist\//] }
          }
        },
        resolve: {
          alias: [
            {
              find: /^.*\/src\/MultiSelect\.jsx$/,
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
