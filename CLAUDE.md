# CLAUDE.md

`react-multiple-select-dropdown-lite`: a React select component. One component, single or multi select.

## Goal

A **lightweight** select that has every feature a select/multiselect should have, and is **convertible**, **headless** and **fully customizable**. Every change is judged against these:

1. **Lite first.** This is the main focus. Zero runtime dependencies (React is a peer). Bundle size is a feature: compare `dist/index.modern.js` size before and after a change. A feature has to earn its bytes. Prefer CSS and native platform behavior over JS.
2. **Feature complete.** Everything users expect from a select: single and multi select, search, creating values (`customValue`), groups, limit, clear, disabled options, keyboard navigation, form submission (`name`), ARIA combobox/listbox, SSR safe, large lists (options render only while open).
3. **Convertible.** The same component switches between single and multi (`singleSelect`), controlled and uncontrolled (`value` / `defaultValue`), and works with any option shape (`getLabel` / `getValue`). New features must work in every mode.
4. **Headless.** Behavior is separate from looks. All styling lives in `src/styles.css`, shipped as `dist/index.css`, which the JS never imports: skip it and the markup is unstyled. Direction: expose state and behavior so users can render their own UI. Don't hard-code visual decisions in TSX.
5. **Fully customizable.** Every visual is reachable: CSS variables (`--msl-input-width`, `--msl-placeholder-color`, ...), `msl-*` class names, per-part `classNames` (Tailwind; state as `aria-*` / `data-*` attributes), icon props, `getLabel` rendering, `attr` spread. For a visual knob, prefer a CSS variable over a new prop.

## Commands

```bash
pnpm build       # vite build -> dist/
pnpm test        # build, jsdom suite (src + both bundles, 100% coverage), then the real-browser suite (Chromium, WebKit, Firefox)
pnpm lint
pnpm typecheck
pnpm fmt         # oxfmt; CI runs fmt:check
```

Docs site: `docs/` (Astro Starlight), `cd docs && pnpm dev`. It imports the committed `dist/`.

## Rules

- **`dist/` is committed.** Run `pnpm build` after any `src/` change and commit `dist/`. CI fails if it is stale.
- **Public types are hand-written** in `src/index.d.ts` and copied verbatim to `dist/index.d.ts` (the CJS bundle is `module.exports = MultiSelect`, which only `export =` describes). Update it with every prop change.
- `src/styles.css` ships byte for byte as `dist/index.css`, comments too: keep them to the variable group labels. Selectors stay single-class, so one user class overrides any rule; nesting only adds states and pseudo-elements.
- **100% coverage gate** on `src/`. `test/MultiSelect.test.tsx` runs against src and both bundles. Layout, focus and real typing go in `test/browser/` (Chromium, WebKit and Firefox via Playwright).
- **React 18 and 19** are both supported (CI matrix). Use parameter defaults, not `defaultProps` (React 19 ignores them on function components).
- Bundles start with `'use client';` for React Server Components.
- Formatting: no semicolons, single quotes, no trailing commas (oxfmt). `cond && call()` branching is allowed.
- Commits: Conventional Commits (`feat!:`, `fix:`, `docs:`, `build:`, `test:`).

### Changing a prop

Touch all of: `src/MultiSelect.tsx`, `src/index.d.ts`, tests, README props table, `docs/src/content/docs/api.md`, `CHANGELOG.md` (`[Unreleased]`, with upgrade notes if breaking), then `pnpm build`.
