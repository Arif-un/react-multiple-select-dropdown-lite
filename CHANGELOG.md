# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `searchInMenu` prop: the search field sits at the top of the open menu instead of after the values, so the closed control shows only the values (or `placeholder`) and no search placeholder next to the chips. Single select and `disableChip` can then search with a value selected. The field's box is `.msl-search` (`classNames.search`), and its placeholder is the new `searchPlaceholder` prop (`'Search...'`).
- `deleteOnBackspace` prop (`true`): set it to `false` so Backspace in the empty search field leaves the chips, and only their delete buttons remove them.
- Collapsible groups: `collapsible: true` on a group makes its title show and hide its options, on a click or Enter. `collapsed: true` starts it closed. The open state lasts from one menu open to the next. The title is an option with `aria-expanded` that the arrow keys reach, styled through `.msl-grp-title[aria-expanded]` (`classNames.groupTitle`, Tailwind's `aria-expanded:`). Its childs sit in `.msl-grp-body` (`classNames.groupBody`) after the title, in one inner `<div>`, so select them with `.msl-grp .msl-option`, not `>`. A grid row of that `<div>` from `0fr` to `1fr` animates the height.
- Submenus: `{ type: 'submenu', title, childs }` is a row that opens its `childs` in a popover beside the menu. It opens on a short pause over it, a click, Enter or Arrow Right, and closes on Arrow Left or Escape with the highlight in it. A pause over another row closes it, so crossing rows on the way in leaves it open. Arrow keys stay inside the submenu that has the highlight. Submenus nest to any depth and can hold groups, and search lists their options flat. The popover is `.msl-submenu` (`classNames.submenu`), a `role="group"` in the listbox named by its title, which is an option with `aria-expanded`. It shows in the top layer, and the stylesheet places it with CSS anchor positioning: beside its title, on the other side or above where there is no room, and over its title where neither side has room. A browser without CSS anchor positioning gets it under its title, in the menu, not in the top layer. Right-to-left pages get it on the left, where Arrow Left opens it and Arrow Right closes it: right to left by a `dir="rtl"` attribute, which the stylesheet reads with `:dir()`, not by CSS `direction` alone. Like `'group'`, `type: 'submenu'` is reserved: options of yours can't have it.
- Exit animations: whatever closes stays until the CSS animations and transitions that its `data-closing` attribute starts have ended. That is the open box (`.msl[data-closing]`, still `.msl-active` and `data-open`), a copy of a closed submenu where it was (`.msl-submenu[data-closing]`), and a copy of a collapsed group's body where it was (`.msl-grp-body[data-closing]`). Tailwind reaches them with `data-closing:` and `in-data-closing:`. Without exit CSS things close at once, and transitions already running, such as an option's hover background, don't hold them. While closing, the menu and the copies are inert, focus leaves the menu, and `onMenuClose` has fired. Opening again mid animation brings the same menu back. Enter animations already worked through `@starting-style`; the docs have examples of both, in CSS and in Tailwind: the open box grows and shrinks with its content, and collapsible groups slide open and shut.
- The dropdown keeps the control's height while CSS animates the open box's height: it measures the control to the menu's edge, not the box less the menu.
- `renderList` prop, for long lists through the virtual list library of your choice (react-window, TanStack Virtual, ...), which you install yourself: the package still has no dependencies. It gets the open list's rows as `{ count, row(index), activeIndex }`, the new `MultiSelectListProps` type. Only the rows the library renders get built, so 100,000 options open at once. Each row comes in a `display: contents` box, so a focused row (a click focuses one) the library unmounts as it scrolls leaves focus in the listbox, where keys still work. Groups are flattened into the rows, each row in a `msl-grp` box per group around it so it indents as in the group, with no `role="group"` around them. A collapsible group's title is a row, and its rows come and go as it opens and closes. An open submenu's rows go through `renderList` too, as a list of their own in its popover. The listbox and the submenus get `data-custom`, which the stylesheet makes flex columns, so the library's scroller shrinks to the menu's height. Options carry `aria-posinset` and `aria-setsize`, as only the rows in view are there for screen readers to count. A submenu is then as wide as `--msl-input-width`, as its rows have no width of their own: give `.msl-submenu` a length if that is a percentage, which would size it from the room beside its title. Position rows with `top`, not `transform`: Firefox places a submenu where its title would be without the transforms around it. Recipes are in the [virtual lists guide](https://arif-un.github.io/react-multiple-select-dropdown-lite/virtual-lists/).
- Collapsible groups, submenus, exit animations and `renderList` grow the JS bundle about 2.1 kB gzipped (4.7 to 6.8 kB), and the stylesheet about 0.4 kB (1.7 to 2.0 kB).

### Changed

- **`type: 'submenu'` is reserved, as `'group'` is.** An option of yours with that `type` now reads as a submenu, and without `childs` it throws on render. Rename that field, or map your data to options without it.
- **Options render inside a `<div style="display: contents">` in `.msl-options`** (not with `renderList`), so DOM snapshots change. It takes no layout room, but options are no longer children of `.msl-options`: select them with `.msl-options .msl-option`, not `>`, and style them through `classNames.option`, as child utilities on `classNames.menu` (`*:`, `space-y-*`, `divide-y`) no longer reach them. Each search's options go in at once, in a new box: Safari froze for minutes when a long list came back after a search (a pick, or the search cleared) on a page with a `:has(~ …)` rule, as Starlight docs have, as WebKit rechecks such a rule for every option added to the open list, one at a time.
- The registered `--msl-menu-room` has an initial value, `100vh`, so the menu is capped before it first measures the room, for a virtual list that measures itself on mount. Without the stylesheet, add `initial-value: 100vh;` to your `@property --msl-menu-room`.

## [3.0.0-beta.1] - 2026-10-16

Breaking release: one value format, React 18+, modern bundles, a native search input, and an open menu that is one box in the top layer. The JS bundles are about 19% smaller, about 6% smaller gzipped. The stylesheet grew from 1.4 to 1.7 kB gzipped.

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
- **Chips render inside a `<div data-clickable="true" style="display: contents">`**, so DOM snapshots change. It takes no layout room. `.msl-chip` and `.msl-chip-delete` keep their classes, but the clickable attribute moves from them to the wrapper, and chips are no longer children of `.msl-input-wrp`: use `.msl-input-wrp .msl-chip`, not `>`.
- **The `clickable` and `dropdown-handle` attributes are now `data-clickable` and `data-handle`**, valid HTML. Update selectors and DOM snapshots that use the old names.
- **No `data-msl` attribute.** It marked internal elements and multi select options, and nothing read it. Update DOM snapshots and selectors that use it: `.msl-option` and the other `msl-*` classes stay.
- **Layout and the arrow flip live in the CSS**, not in inline styles. Left inline: the chip wrapper's `display: contents` and, while open, the dropdown's `min-height` and the open box's position (see below). `.msl` is a grid: `.msl-input-wrp` takes the free space (it had an inline `width: calc(100% - 60px)`), `.msl-actions` sits in the flow instead of `position: absolute`, and the options span both columns. Recheck custom CSS that sizes `.msl-input-wrp` or positions `.msl-actions`. The open arrow turns through `rotate` on `.msl-active .msl-arrow-btn`, not an inline `transform`, so without the stylesheet it no longer flips.
- **No "Empty" option.** Without `options`, the menu shows `emptyDataLabel`, as it does for `[]`.
- **Empty states are `<div>`s, not `<option>`s**, so they can hold JSX. Use `.msl-option-disable`, not `option.msl-option-disable`.
- **The open menu is one box, a popover over the dropdown.** While open, `.msl` (the input box, now with the options attached: one border and shadow) is a `popover="manual"` in the top layer, over the dropdown, which keeps its height. It stays in place in the DOM, inside a new unstyled `<div>` around `.msl`, so your CSS reaches it through its ancestors and it inherits the text look there, while `overflow: hidden` parents, stacking contexts and z-indexes no longer clip or cover it. This needs the Popover API: Chrome 114, Firefox 125, Safari 17. Check:
  - `.msl-active` / `.msl-active-up` mark the open box, which holds the options after the values (before them, opening upward). The seam rules are gone (clip-path, the stripped border, the radius transitions), as are `.msl-options { position: absolute; max-height: 0 }` and `.msl-wrp { position: relative }`.
  - The open box is as wide as the dropdown and clips the options, so a wider `width` or `min-width` on `.msl-options` is cut off. Widen the open box instead: `.msl-active { min-width: 400px }`.
  - While open, the box follows the dropdown every animation frame. With fake timers that fake `requestAnimationFrame` (Jest's, Vitest's), `runAllTimers()` never runs dry: close the menu first, or use `advanceTimersByTime()`.
  - In the top layer, transforms on the dropdown's ancestors don't apply to the open box. It copies their scale (a zoomable canvas), not a rotation or skew.
  - Without the Popover API (jsdom, for one), the box is a plain element in the dropdown, so tests that query the container keep working.
- **A new default look, and a rewritten stylesheet.** `--msl-font-size` is `14px` (was `16px`), options and group titles pad `4px 8px` (was `7px 5px`), the selected option's background is a grey `hsl(209.49deg 10.01% 93.31%)` (was `#e6f4fa`), the chip delete button stays transparent until hovered (`--msl-chip-delete-background`, was `rgb(218, 218, 218)`), and the open menu has a softer shadow, a faded border (`--msl-active-menu-border-color`) and a divider between the input and the options (`--msl-divider-color`). Set the variables back, and `.msl-option, .msl-grp-title { padding: 7px 5px }`, for the old look. The stylesheet uses native CSS nesting (Chrome 120, Firefox 117, Safari 17.2) and logical properties, so chip and input spacing follow right-to-left text. Option rules no longer go through `.msl-options`, so a lone `.msl-option` or `.msl-option-focused` rule of yours matches their specificity. The arrow turns with `rotate`, not `transform`. One class with the same state overrides any rule: the closed box's hover border no longer outranks it, and `.msl-disabled`'s `pointer-events: none` is no longer `!important`. The line height is set on `.msl-wrp` and inherited, not forced on every element inside, so a class on a part sets it for the part's content too, and your markup in labels or chips (a `<button>`) keeps its own. Keep `--msl-line-height` unitless: a `%` or `em` value is worked out once, against the wrapper's font size.
- **`largeData` is removed**: options always render only while the menu is open. Delete the prop.
- **`clearAll` is removed.** To clear the value, pass `value={[]}` to a controlled select, or remount it with a new `key`.
- **`width` is removed from the types.** It has done nothing since 2.0.1, and TypeScript now rejects it: set the `--msl-input-width` CSS variable instead.
- **Tab closes the menu** and moves on in page order. It used to step through the chips and the clear button with the menu still open. Focusable JSX in the menu (a button in `emptyDataLabel` or a group `title`) is still a Tab stop: while the menu has any, Tab steps through the open box in page order, chips and the clear button included, and focus leaving it closes the menu.
- **Closing the menu clears the search text.**
- **Markup for utility CSS.** Options sit right inside `.msl-options` (the `<div>` around them is gone), and the open box stacks by DOM order (with `msl-active-up` the options come before the input).
- **No `msl-flx` class.** `.msl-btn` and `.msl-actions` center their content themselves. Move rules on `.msl-flx` to those classes.
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
- CSS variables for every color: `--msl-border-color`, `--msl-hover-border-color`, `--msl-disabled-background`, `--msl-chip-background`, `--msl-chip-delete-background`, `--msl-chip-delete-color`, `--msl-button-hover-background`, `--msl-option-hover-background`, `--msl-option-active-background`, `--msl-option-active-color`, `--msl-option-disabled-color`, `--msl-group-title-background`, `--msl-focus-color`, `--msl-background` (the closed box), `--msl-scrollbar-color`, `--msl-active-menu-border-color` and `--msl-divider-color` (the line between the input and the open menu). A dark theme is one rule.
- `customChip(props)` prop, to render chips yourself: `customChip={({ label, onDelete }) => <button type='button' onClick={onDelete}>{label} ×</button>}`. It gets `label`, `value`, `option`, `disabled` and `onDelete`, typed as `MultiSelectChipProps`. It is a render function, not a component, so it can't use hooks: return `<MyChip {...props} />` for that.
- `filterOption(option, search)` prop, to replace the search match.
- `getLabel(option)` and `getValue(option)` props. `getLabel` renders options, chips and the single value. Together they read options of any shape, e.g. `{ id, name }` straight from an API. The types infer the shape from `options`, and require `getLabel` or `getValue` when it has no string `label` or `value`. With `customValue`, `onChange`'s options are typed to also hold created `{ label, value }` options.
- `classNames` prop: classes for each part (`control`, `values`, `input`, `singleValue`, `chip`, `chipDelete`, `actions`, `clearButton`, `arrowButton`, `menu`, `group`, `groupTitle`, `option`, `empty`), to style the select with Tailwind or other utility CSS and no stylesheet. `customChip` gets them in its props. A Tailwind page in the docs has a full example.
- State attributes for utility variants: `data-focused` on the highlighted option (next to `aria-selected` and `aria-disabled`), `data-open` and `data-up` on the open box, `data-disabled` on the wrapper.
- Group options are indented one step per level, nested groups included, with the group's title at the level of the group: `--msl-group-offset` (`12px`, `0` for flat). Groups carry an `msl-grp` class.
- `--msl-placeholder-color` CSS variable, for the search field's placeholder and the static one shown with `disableSearch`.

### Changed

- The open menu follows the dropdown as the page or a parent scrolls, the window resizes or the dropdown grows, and closes once a scrolling parent hides the dropdown. In a scaled part of the page (`transform: scale()`) it scales as the dropdown does. Scrolling past the end of the options doesn't scroll the page.
- The menu is no taller than the room left in the viewport, as well as `--msl-menu-max-height`. The room is `--msl-menu-room` on `.msl-options`, registered non-inherited, so your own CSS can cap the menu with it.
- Without a listbox to point at, the closed combobox has no `aria-controls`.
- All `aria-*` in `attr` reach the combobox, not only `aria-label` and `aria-labelledby`: an `aria-describedby` error or `aria-invalid` stays announced in the search field.
- The open and close radius transitions are gone.
- A disabled select ignores clicks without the stylesheet too: it no longer leaned on `pointer-events: none` to stay closed and keep its value. Disabling a select with its menu open closes the menu, and focus moves from it to the dropdown.
- `onMenuOpen` runs once the open menu is in the DOM and focused, after a click as after a key. It used to run before the open rendered.
- The Escape that closes the menu is canceled and stops at the select, so a surrounding `<dialog>`, popover or modal library's dialog (MUI's) stays open. With the menu closed, Escape is theirs.
- Options that arrive after mount resolve the selection when they render. There is no longer an effect that re-resolves it.
- Values missing from `options` are left out of the display and of `onChange`, unless `customValue` is set. They show up once matching options arrive. With `customValue` they are listed under Custom Values only while selected: once deselected they leave the menu (v2 kept them listed), unlike values created by typing.
- Once `limit` is reached, unselected options get `aria-disabled="true"` and `msl-option-disable`, and the keyboard highlight skips them. Picking one only calls `onChange`, the value unchanged: a Create item no longer adds the typed text to Custom Values, and the search text and the menu stay. Single select ignores `limit`: its wrapper no longer gets `msl-limit-reached`.
- Enter and comma pick the first search result that isn't `disabled`, no longer a `disabled` one.
- While the select is disabled, the chip delete and clear buttons have `aria-disabled="true"`, so screen readers announce them unavailable.
- Search results keep option order. Label matches no longer come before value-only matches.
- The menu's scrollbar thumb no longer darkens on hover in Safari, matching Chrome and Firefox.
- Keys pressed on focusable JSX in the menu, such as a button in `emptyDataLabel` or a group `title`, are left to it: Enter no longer picks the highlighted option or refocuses the search field.
- Long search text scrolls on one line instead of wrapping, and no longer runs under the clear and arrow buttons. A placeholder too long for the input ends in an ellipsis.
- `react-dom` is no longer a peer dependency: the component doesn't import it.

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

[3.0.0-beta.1]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/3.0.0-beta.1
[2.1.0]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.1.0
[2.0.6]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.6
[2.0.5]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.5
[2.0.4]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.4
[2.0.1]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.1
[2.0.0]: https://www.npmjs.com/package/react-multiple-select-dropdown-lite/v/2.0.0
