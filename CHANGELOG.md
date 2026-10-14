# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

Breaking release: one value format, React 18+, modern bundles, a native search input. The bundles are about 20% smaller.

### Upgrade notes

- **`value` and `defaultValue` take an array of option values.** The comma separated string and option object forms are gone.
- **`onChange(values, options)`** always gets the selected values and their option objects. A created value's option is `{ label: value, value }`. The hidden form input still posts the values joined by commas.
- **`jsonValue` is removed.** Read the option objects from `onChange`'s second argument.
- **`defaultValue` is read once, on mount**, like an uncontrolled input. To change the selection later, use `value`, or remount with a new `key`.
- **React 18 or 19 is required.**
- **No UMD build and no `dist/index.esm.js`.** Import the package through a bundler. The ES module build is `dist/index.modern.js`, which `module` already points to.
- **No ES5 build.** The bundles use modern syntax and import `react/jsx-runtime`. Transpile them yourself if you target old browsers. Even then, chip delete needs `:focus-visible`: Chrome 86, Firefox 85, Safari 15.4.
- **Types:** `MultiSelectValue`, `MultiSelectBaseProps`, `MultiSelectStringProps` and `MultiSelectJsonProps` are gone. `MultiSelectProps` is a single interface, so `Omit` works on it directly.
- **`label` is a string, and options lose `title`.** For JSX, pass `getLabel={(opt) => <Jsx />}`. Search and the tooltip then use `label`.
- **CSS variables start with `--msl-`**, so they can't clash with an app's own `--border-radius` or `--font-size`: `--input-width` is `--msl-input-width`, and so on for all of them. Rename them in your CSS.
- **The search field is an `<input>`**, not a `contentEditable` div. Rules on `.msl-input::before` no longer reach its placeholder: set the new `--msl-placeholder-color` variable instead. It fits its text through CSS `field-sizing: content`; browsers without that show it at the default input width.
- **Chips render inside a `<div clickable="true" style="display: contents">`**, so DOM snapshots change. It takes no layout room. `.msl-chip` and `.msl-chip-delete` keep their classes, but the `clickable` attribute moves from them to the wrapper, and chips are no longer children of `.msl-input-wrp`: use `.msl-input-wrp .msl-chip`, not `>`.
- **Layout and the arrow flip live in the CSS**, not in inline styles (the chip wrapper's `display: contents` is the one left). `.msl` is a flex row: `.msl-input-wrp` takes the free space (it had an inline `width: calc(100% - 60px)`) and `.msl-actions` sits in the flow instead of `position: absolute`. Recheck custom CSS that sizes `.msl-input-wrp` or positions `.msl-actions`. The open arrow turns through `.msl-active .msl-arrow-btn`, not an inline `transform`, so without the stylesheet it no longer flips.
- **No "Empty" option.** Without `options`, the menu shows `emptyDataLabel`, as it does for `[]`.
- **Empty states are `<div>`s, not `<option>`s**, so they can hold JSX. Use `.msl-option-disable`, not `option.msl-option-disable`.
- **ARIA labels:** the clear button is `Clear` (was `close-menu`), set it with `clearLabel`. The default chip's delete button is `Remove Apple` for an `Apple` chip (was `delete-value`), or `Remove` when the label has no text; translate it through `customChip`. Update tests that query these labels.

```jsx
// v2
<MultiSelect options={options} value='apple,banana' onChange={(csv) => ...} />
<MultiSelect jsonValue options={options} onChange={(opts) => ...} />
<MultiSelect options={[{ label: <b>Apple</b>, title: 'Apple', value: 'apple' }]} />

// v3
<MultiSelect options={options} value={['apple', 'banana']} onChange={(values) => ...} />
<MultiSelect options={options} onChange={(values, opts) => ...} />
<MultiSelect options={[{ label: 'Apple', value: 'apple' }]} getLabel={(opt) => <b>{opt.label}</b>} />
```

### Added

- `clearLabel`, `createLabel(text)` and `customValuesTitle` props, so no built-in text is left untranslatable: ``createLabel={(text) => `Ajouter « ${text} »`}``.
- `emptyDataLabel`, `chipAlternateText` and a group's `title` and `emptyDataLabel` take JSX.
- CSS variables for every color and the menu stacking: `--msl-border-color`, `--msl-hover-border-color`, `--msl-disabled-background`, `--msl-chip-background`, `--msl-chip-delete-background`, `--msl-chip-delete-color`, `--msl-button-hover-background`, `--msl-option-hover-background`, `--msl-option-active-background`, `--msl-option-active-color`, `--msl-option-disabled-color`, `--msl-group-title-background`, `--msl-focus-color`, `--msl-menu-z-index`, `--msl-background` (the closed box) and `--msl-scrollbar-color`. A dark theme is one rule.
- `customChip(props)` prop, to render chips yourself: `customChip={({ label, onDelete }) => <button type='button' onClick={onDelete}>{label} ×</button>}`. It gets `label`, `value`, `option`, `disabled` and `onDelete`, typed as `MultiSelectChipProps`. It is a render function, not a component, so it can't use hooks: return `<MyChip {...props} />` for that.
- `filterOption(option, search)` prop, to replace the search match.
- `getLabel(option)` and `getValue(option)` props. `getLabel` renders options, chips and the single value. Together they read options of any shape, e.g. `{ id, name }` straight from an API. The types infer the shape from `options`, and require `getLabel` or `getValue` when it has no string `label` or `value`. With `customValue`, `onChange`'s options are typed to also hold created `{ label, value }` options.
- `--msl-placeholder-color` CSS variable, for the search field's placeholder and the static one shown with `disableSearch`.

### Changed

- Options that arrive after mount resolve the selection when they render. There is no longer an effect that re-resolves it.
- Values missing from `options` are left out of the display and of `onChange`, unless `customValue` is set. They show up once matching options arrive.
- Search results keep option order. Label matches no longer come before value-only matches.
- The menu's scrollbar thumb no longer darkens on hover in Safari, matching Chrome and Firefox.
- Keys pressed on focusable JSX in the menu, such as a button in `emptyDataLabel` or a group `title`, are left to it: Enter no longer picks the highlighted option or refocuses the search field.
- Long search text scrolls on one line instead of wrapping, and no longer runs under the clear and arrow buttons. A placeholder too long for the input ends in an ellipsis.

## [2.1.0] - 2026-10-12

React 19 support, TypeScript types, keyboard and screen reader support, a controlled `value` prop, and a long list of bug fixes. Existing props, events, CSS variables and class names keep working.

### Upgrade notes

Most apps need no changes. Check these if they apply to you:

- **`MultiSelect.defaultProps` is gone.** React 19 ignores `defaultProps` on function components, so the defaults are now built in. If you changed `MultiSelect.defaultProps` to set app-wide defaults, pass those props instead (or wrap the component).
- **Single select closes after a pick.** It used to close only when the parent fed the value back through `defaultValue`. Pass `closeOnSelect={false}` to keep it open. Multi select still stays open unless `closeOnSelect` is `true`, which now works there too.
- **Keyboard highlight is a class, not focus.** Options no longer take focus; the highlighted one gets `msl-option-focused`. Move custom `.msl-option:focus` styles to `.msl-option-focused`.
- **Tab order.** Options and the down arrow are no longer Tab stops. The chip delete and clear buttons act on Enter and Space only (any key used to trigger them). The menu closes when Tab moves focus out.
- **UMD build** reads `window.React`, the global React's own UMD build sets (it used to read `window.react`).
- **DOM snapshots change**: options, the listbox and the combobox carry ARIA roles and attributes, and stray `undefined` / `false` class names are gone.

### Added

- React 19 support
- TypeScript types, bundled as `dist/index.d.ts`
- `value` prop for a controlled selection, in the same forms as `defaultValue`
- `onClear` event after the clear button empties the value (#10)
- `msl-limit-reached` class on the wrapper once `limit` is reached
- Keyboard: Arrow Up / Down, Home / End to move, Enter to pick, Backspace to remove the last chip, Escape to close
- Accessibility: combobox / listbox / option roles with `aria-expanded`, `aria-activedescendant`, `aria-selected` and `aria-disabled`; groups use `role="group"` named by their title. Name the dropdown with `attr={{ 'aria-label': '...' }}` or `'aria-labelledby'`
- `'use client'` directive in the CJS and ESM bundles, so Next.js App Router Server Components can import it
- Works inside a shadow root (React 17+)

### Changed

- Peer dependencies: `react` and `react-dom` `^16.9.0 || ^17 || ^18 || ^19`
- `closeOnSelect` is unset by default: single select closes, multi select stays open (see upgrade notes)
- `dist/index.css` ships as authored (readable, same rules)
- A disabled dropdown is no longer focusable or keyboard-openable
- The menu opens upward only when there is more room above than below
- Search matches typed text literally (it was a regular expression)
- Pasting into the search inserts plain text

### Fixed

- `closeOnSelect` closes the menu on pick, also in multi select (#9, #11)
- `defaultValue` resolves when options load after mount (#12)
- Typing `(`, `[`, `*` or other regex characters in the search no longer crashes
- Pressing Enter after pasting into the search no longer crashes
- Enter no longer adds a line break to the search field
- Text pasted from the context menu or dropped into the search now filters
- Enter or comma confirming an IME composition (Chinese, Japanese, Korean input) no longer picks an option
- Numeric option values or labels (untyped JS) no longer crash the search
- `onMenuClose` fires on Escape, and only when an open menu closes
- Clicks inside the menu no longer fire `onMenuOpen` again
- Custom `downArrowIcon` / `closeIcon` of any nesting depth toggle and clear correctly
- `customValue`: the chip and `onChange` get the typed text, not `Create "..."`; clicking Create adds the value; double quotes are kept; created values survive a parent re-render with a new `options` array
- `defaultValue` objects not found in `options` (with `customValue`) keep their `value` string, so `onChange` no longer gets `[object Object]`
- Falsy `options` show `emptyDataLabel`
- SSR: aria ids match between server and client (no hydration warning)
- Missing React key on an empty group's placeholder
- CSS: alpha colors and `clip-path` in older Safari

## [2.0.6] - 2022-08-22

### Fixed

- Options update when the `options` prop changes

### Changed

- Softer default menu shadow (`--active-menu-shadow`)

## [2.0.5] - 2022-01-30

### Added

- `clearAll` prop clears the value when it turns `true`
- `disableSearch` prop hides the search input

### Fixed

- `closeOnSelect` in single select
- Placeholder shows when the search is disabled

### Changed

- Peer dependency `react` `>= 16.13.1`

## [2.0.4] - 2020-12-30

### Changed

- CSS variables updated

## [2.0.1] - 2020-12-17

### Added

- Menu open / close events (`onMenuOpen`, `onMenuClose`)
- Menu opens upward at the bottom of the page

### Changed

- Width moved from the `width` prop to the `--input-width` CSS variable

## [2.0.0] - 2020-12-08

### Added

- JSX labels (with a `title` for search and chips)
- Custom values listed in their own group

### Changed

- Search improved

### Fixed

- Single select bugs

[2.1.0]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.1.0
[2.0.6]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.6
[2.0.5]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.5
[2.0.4]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.4
[2.0.1]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.1
[2.0.0]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.0
