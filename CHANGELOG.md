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
- `groupIcon` and `submenuIcon` props: the icon after a collapsible group's title and a submenu's. Both sit in a `<span class="msl-expand-icn" aria-hidden="true">` (`classNames.groupIcon`, `classNames.submenuIcon`), which the stylesheet holds at the end of the title with `margin-inline-start: auto` and turns: down while its group is open, to the left right to left, so draw yours pointing to the inline end. By default it holds the arrow button's chevron SVG, `.msl-chevron-icn`, which the stylesheet sizes, thickens (`stroke-width`) and turns to point to the end; yours goes in a `<bdo dir="ltr">`, so right to left the browser doesn't mirror a text arrow such as `›` that the stylesheet turns. `order: -1; margin-inline-start: 0` puts it before the title. See [Expand icons](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/#expand-icons).
- `renderGroupTitle` prop: renders the title row of a group or a submenu, in place of its `title` and icon, from `{ group, title, total, selected, open, icon }`, the new `MultiSelectGroupTitleProps` type. `total` counts the options in it, those in nested groups and submenus and disabled ones too, `selected` how many of those are picked, `open` whether a collapsible group shows its childs or a submenu is open (`true` for a plain group), and `icon` is the `.msl-expand-icn` span to place or leave out (`null` for a plain group): `({ title, selected, total, icon }) => <>{title} {selected}/{total}{icon}</>`. The row keeps its box and attributes.
- Fixed values: `fixed: true` on an option keeps it once selected. Its chip has no delete button, Backspace in the empty search field removes the last chip that isn't fixed, the clear button keeps fixed values (and shows only while there is another to remove), and in the menu a selected fixed option is `aria-disabled`, so a click, Enter or the highlight leave it. In single select a fixed value locks the selection: the other options are disabled, as past a `limit` (without `msl-limit-reached`), picking one only calls `onChange`, the value unchanged, and the combobox has `aria-readonly`. An unselected fixed option can still be picked. A value that repeats in the options is fixed or not as its selected option is, in every row. A fixed value's default chip has `data-fixed` (Tailwind's `data-fixed:` on `classNames.chip`) and takes its background from the new `--msl-chip-fixed-background` variable, the chip background by default. `customChip` gets a `fixed` prop, and `onDelete` does nothing for one. It grows the JS bundle about 90 bytes gzipped.
- Collapsible groups, submenus, their icons and titles, exit animations and `renderList` grow the JS bundle about 2.3 kB gzipped (4.7 to 7.0 kB), and the stylesheet about 0.4 kB (1.7 to 2.1 kB).
- `loadOptions` prop: loads the options from your server. It gets `{ search, next, signal }` (the new `MultiSelectLoadRequest` type) and returns, or resolves to, the options, or `{ options, next }` while there are more (`MultiSelectLoaded`): it may be async or not (`MultiSelectLoader`). The menu's list loads as the menu first opens, not on mount, so nothing loads on the server. Each search text loads its own list, searched by your server: the dropdown filters nothing, and `filterOption` is unused. The next part loads as the list's end scrolls into view (an `IntersectionObserver` on the row at the end, observed anew after each part, so short parts go on loading until the menu is full), or as Arrow Down passes the end, until a part comes without a truthy `next`. `next` comes back in the call for the next part: a page number, an offset or a cursor. Each list loads once, and stays for the life of the dropdown: closing and opening the menu, or typing a search again, shows it at once; change `loadKey` to load afresh. The `signal` aborts once another search takes its place (the search clearing as the menu closes too) or the dropdown unmounts, so `await` a timeout and then `signal.throwIfAborted()` to wait for typing to pause; an aborted load's result or error is dropped, and the parts loaded before it stay. With `loadOptions`, `options` are not listed: they name values the loads haven't, such as the selected ones in an edit form before their list loads. Options once loaded keep naming values, so a chip picked from a search's results stays after the search moves on. Enter picks the first loaded result of the search, never one of the search before it, and `customValue`'s Create row follows the results. Recipes are in the new [async options guide](https://arif-un.github.io/react-multiple-select-dropdown-lite/async/).
- Lazy groups and submenus: a group's `childs` can be a loader too. It loads them the first time they show: a collapsible group as its title opens it, a submenu as it opens, a plain group as the menu opens. They load in parts as their end scrolls into view, as `loadOptions`' lists do, and a loader can return groups and submenus with loaders of their own, to any depth. Closing a group, a submenu or the menu doesn't stop a load: it is there the next time it opens. A group's list goes by its place in the options and its title. Inside what `loadOptions` loaded, or in `options` with `onSearch`, a group's loader gets the search text as `search`; elsewhere `search` is `''`. Search finds the options groups have loaded, and they name values. `renderGroupTitle` gets a copy of a group with a loader in it, its loaders' `childs` the options loaded so far, counted in `total` and `selected`. While a submenu's options load, Arrow Right leaves the highlight on its title.
- The row at the end of a loader's list, while it loads, has more to load, or failed: `.msl-loading`, also `.msl-option.msl-option-disable` like an empty list's label (`classNames.loading`). It shows the new `loadingLabel` prop (`'Loading...'`), and once a load throws, rejects or returns no options, the new `errorLabel` prop (`'Failed to load. Retry'`) with `data-error` (Tailwind's `data-error:`). A failed list loads again on a click on that row, Arrow Down past it, or the list showing again; a failed part after others keeps them, and loads again from the same `next`. The row has no role and the highlight passes it; it is a polite live region (`aria-live`), so a screen reader hears it fail. The listbox has `aria-busy` while `loadOptions` loads, and with `renderList` options have `aria-setsize="-1"` while their list may have more. With `renderList` the row is the last of its list, so a virtual list renders it, and it loads, as it scrolls there. Async loading grows the JS bundle about 0.8 kB gzipped (7.1 to 7.9 kB); the stylesheet is unchanged.
- Your own data layer: `onSearch`, `loading`, `onLoadMore` and `loadError` props, for options that React Query, Apollo, SWR or your own state load, cache, refetch and invalidate. `onSearch` gets the search text as it changes, trimmed, commas removed, and `''` once it clears (a pick, the menu closing); not on mount. With it the dropdown filters nothing (`filterOption` unused), `options` are the results, and every search's options keep naming values once it moves on, so a chip picked from a search's results stays, controlled with values too. A group's loader in those options gets the search text as `search`, as in what `loadOptions` loaded. `loading` shows the end row (`.msl-loading`, `loadingLabel`) after the options, or in place of `emptyDataLabel`, and puts `aria-busy` on the listbox. `onLoadMore` says there are more: the end row calls it as it scrolls into view, as Arrow Down passes it, and again as `loading` ends with it still in view, so short pages fill the menu; never while `loading`, and the latest one, a new closure each render or not. `loadError` shows `errorLabel` there with `data-error` (unless `loading` again), stops the calls as it scrolls into view, and calls `onLoadMore` on a click, Arrow Down past it, or the menu opening (once an open, not as you type). They work without `onSearch` too, for infinite scroll over options the dropdown searches itself, whose results end in the same row; with `loadOptions` they are unused. See [your own data layer](https://arif-un.github.io/react-multiple-select-dropdown-lite/async/#your-own-data-layer-react-query-apollo-swr), with React Query, Apollo and SWR recipes.
- `value` and `defaultValue` take options as well as values (`(string | T)[]`): an option names its value when `options` don't have it, as with async options in an edit form, and an uncontrolled one keeps naming it after a change. `onChange`'s second argument hands options back, so `onChange={(values, options) => setValue(options)}` keeps a controlled selection as options. With `customValue`, a value that comes as its option is not listed under Custom Values. The data layer props and values as options grow the JS bundle about 0.2 kB gzipped (7.9 to 8.1 kB).
- Load more buttons: with the new `loadMoreLabel` prop, a list with more to load ends in a button with that label, which loads the next part on a click or as Arrow Down passes it, not as it scrolls into view. It works for `loadOptions`, `onLoadMore`, groups' loaders and groups you load; a loader's first part still loads as its list shows. The button is `.msl-loading[data-more]` (Tailwind's `data-more:`), also `.msl-option` without `.msl-option-disable`, so it looks like an option. Groups take `loading`, `onLoadMore`, `loadError` and `loadMoreLabel` too, for an array of `childs` you load more of, as the dropdown's props do for `options`: an accordion or a submenu shows the options you have and loads more on demand. They grow the JS bundle about 0.1 kB gzipped (8.1 to 8.2 kB).
- Creating values: `canCreate(text)` says which typed text `customValue` can create (no Create row, and Enter or comma creates nothing, when it returns false). `onCreate(text)` makes the value in its place: an option of yours, selected and named by your getters, or a value string, both listed under Custom Values (once deselected too) until `options` have them; `false` or nothing creates nothing and leaves the text. It can return a promise, a request to your server say: meanwhile the Create row shows `loadingLabel` with `aria-busy`, disabled, and the text is created once; what it resolves to is selected then (in single select, unless another value was picked meanwhile: it is listed); a rejection shows `errorLabel` there with `data-error`, and creating again calls it again. Nothing is added once the dropdown has unmounted.
- Pasting a list in multi select: text with commas, tabs or newlines picks each part, the option whose label text or value it is (trimmed, in any case), else with `customValue` one it creates, through `canCreate` and `onCreate`, up to `limit` and in one `onChange`. Each part goes in once, and one whose `onCreate` promise is pending holds its room. What doesn't go in goes in the search field at the caret, the text there kept. A paste where nothing goes in, of one part, or in single select, is the browser's.
- Groups and submenus take `classes` and `style`, as options do, on their title row (`.msl-grp-title`, or a submenu's `.msl-option`): the rest of a group is reachable from there, `.msl-grp:has(> .vip)` its box, `.vip + .msl-grp-body` a collapsible group's rows, `.vip + .msl-submenu` a submenu's popover. `MultiSelectGroup` has an index signature as `MultiSelectOption` does, so your own fields on a group are typed, read back from `renderGroupTitle`'s `group` (`group.icon`), with options of any shape too.
- `maxChips` and `moreChipsLabel` props: chips for the first `maxChips` values, then one chip for the rest, labeled `+N` or what `moreChipsLabel(n)` returns. It is `.msl-chip[data-more]` (Tailwind's `data-more:`), with no delete button and as much padding at its end as a fixed value's chip; a click on it opens the menu. The rest stay selected, in `onChange` and the hidden input, and Backspace removes the last value that isn't fixed, shown or not. `customChip` renders the shown chips, and gets the new `index` and `total`; `disableChip` and single select ignore `maxChips`.
- `open` prop, a controlled menu: it shows exactly while `open` is true, and the dropdown's own opens and closes (a click, a key, Escape, a click or focus outside, a pick with `closeOnSelect`, scrolled out of view) call `onMenuOpen` and `onMenuClose` as requests, not after the fact. Opened from outside, focus stays where it is; opened from the dropdown, it moves to the search field as ever. A pick with `closeOnSelect` that you keep open clears the search as any pick does.
- `search` and `onSearchChange` props, a controlled search field: `onSearchChange(text, reason)` reports each change of the raw text once, `'input'` as typed or pasted, `''` with `'pick'` as a pick clears it, `''` with `'close'` as the menu closes. With `search` the field shows yours, and filtering, `onSearch` and `loadOptions` follow it: ignore `'pick'` to keep the search after a pick.
- `getLabel` gets a second argument, `{ context, search, selected }` (the new `MultiSelectLabelMeta` type): `context` is `'menu'` for an option's row and `'value'` for a chip (customChip's `label`) or the single value, `search` the search text for menu rows (`''` for values), and `selected` whether the option is picked. Highlight the match, mark selected rows or show a shorter chip than row. The text search reads the label for `{ context: 'menu', search: '', selected: false }`, so a highlighted match never breaks it; the tooltip reads the row's label text, else the option's `label`, as before. One-argument `getLabel`s work as they did.
- `hideSelected` prop: picked options leave the menu and its search results, single select too. A group, a collapsible group or a submenu with no option left goes, title and all, as does the Custom Values group; an empty group stays with its `emptyDataLabel`, and nothing left shows `emptyDataLabel`, or with `selectAll` its row, selected, which deselects them. The others keep their places, so open submenus and toggled groups stay as they are, and Enter moves the highlight on to the next option (back to the one before at the end). A loader's list keeps its end row while it may load more. `renderGroupTitle`'s `total` and `selected` still count the hidden options.
- `loadKey` prop: when it changes (by `Object.is`), every loaded list goes, `loadOptions`' and groups' loaders', loads on the way stop, and the lists showing load again. The selection, the open menu and focus stay, and the dropped options keep naming the values picked from them, where a new `key` resets everything. For dependent dropdowns: `loadKey={country}`.
- `preload` prop: with `loadOptions`, its first list (search `''`) loads before the menu first opens, on mount and as `loadKey` changes (`true`), or as the pointer enters the dropdown or focus arrives (`'intent'`). In effects only, so SSR renders as before. The wrapper's `onFocus` and `onPointerEnter` from `attr` still run, first.
- `loadAhead` prop (px, `0`): the next part of any list, `loadOptions`', a group loader's or `onLoadMore`'s, loads once its end row is that close to coming into view. The end row gets a box over it that much taller upward (`pointer-events: none`), and the dropdown observes that box, so it works in any scroller, a virtual list's too. Not with `loadMoreLabel`.
- `errorLabel` can be a function, `(error, retry) => ReactNode`: it gets what the load threw or rejected with (`true` for a falsy rejection, a `TypeError` for a load that returns no options) and a retry for a button of your own. The row then doesn't load again on a click, so your button doesn't load twice; Arrow Down past it and the list showing again still do. `loadError`, the prop and the group field, takes the error itself as well as `true` (`unknown`, truthy for a failure), and `errorLabel` gets it: `loadError={q.error}` with React Query.
- `data-loading` on the wrapper while any list loads, a loader's (the menu's or a group's) or with `loading` (the prop or a group field), the menu open or closed: Tailwind's `data-loading:` and `in-data-loading:`, for a spinner by the arrow.
- `emptyDataLabel` can be a function of the search text, `(search) => ReactNode`: `'Type 2 letters'` for a loader that loads nothing for short searches.
- `selectAll` prop, for multi select: a first row in the list with its label (`true`: `'Select all'`), `.msl-option.msl-select-all` (`classNames.selectAll`), the first the keyboard reaches. A click or Enter selects every enabled option the menu lists, a search's results only, those loaded so far, those in closed groups and submenus too, up to `limit`, in one `onChange`; once none is left to pick it has `aria-selected` and deselects them, fixed ones aside. The menu stays open, and the search too. It hides while the menu lists none, but for those `hideSelected` hides, and works with `renderList`, `loadOptions` and `onSearch`.
- `menuHeader` and `menuFooter` props: content in the open box before and after the listbox, outside it (after the search field with `searchInMenu`), `.msl-menu-header` and `.msl-menu-footer` (`classNames.menuHeader`, `classNames.menuFooter`). A function gets `{ search, options, selected, selectAll, deselectAll }`, the new `MultiSelectMenuProps` type: the enabled options listed, flat, as `selectAll` counts them, how many of them are selected, and calls that select or deselect them in one `onChange`. Their clicks don't close the menu, and keep focus where it is but on a form field, so a field in them takes typing; their keys are their own. They are not part of the keyboard highlight, and Tab reaches what in them is tabbable. The menu's height leaves room for them.
- Groups and submenus take `header` and `footer`: first and last in a plain group's rows, a collapsible group's body and a submenu's popover, `.msl-grp-header` and `.msl-grp-footer` (`classNames.groupHeader`, `classNames.groupFooter`), also `.msl-option.msl-option-disable` like an empty group's label. They are text, not options: no role, and the highlight passes them. With `renderList` they are rows.
- `renderGroupTitle` gets `toggle()`: selects every enabled option in the group, nested and loaded ones too, up to `limit`, or once none is left to pick deselects them, fixed ones aside, in one `onChange`. For a checkbox in a plain group's title, check it when `selected === total`; a collapsible group's or a submenu's title is an option, which screen readers read as text, so show a count there. See [Select all](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#select-all).
- Creating and pasting, `maxChips`, `open` and `search`, `getLabel`'s meta and `hideSelected`, the async props from `loadKey` to `emptyDataLabel`, `selectAll`, and the menu's header and footer grow the JS bundle about 2.3 kB gzipped (8.2 to 10.5 kB), and the stylesheet 0.04 kB (2.05 to 2.09 kB).

### Changed

- `MultiSelectChipProps` has `fixed`, `index` and `total` fields: chip props you build yourself, in a test for example, need them.
- `MultiSelectGroupTitleProps` has a `toggle` field: group title props you build yourself need it.
- **`header`, `footer`, `classes`, `style`, `loading`, `onLoadMore`, `loadError` and `loadMoreLabel` are reserved on groups.** A group of yours with a field of one of these names, read back in `renderGroupTitle`, now takes effect: `header` and `footer` render in its rows, `classes` and `style` go on its title row (a `style` string throws), and the others end its rows with a loading, error or load more row. Rename that field.
- **`getLabel` gets a second argument**, `MultiSelectLabelMeta`, on every call. A function of yours with an optional second parameter (`formatName(person, short = false)`) now gets the meta there: wrap it, `getLabel={(o) => formatName(o)}`. Code that calls `getLabel` from `MultiSelectProps` itself, a wrapper's, passes a meta.
- **`value`, `defaultValue` and `emptyDataLabel` are typed wider**: `(string | T)[]`, and a function of the search text. Code that reads them from `MultiSelectProps` (`props.value.map((v) => v.toUpperCase())`, `{props.emptyDataLabel}`) narrows them first, `typeof v == 'string'`, `typeof label == 'function'`.
- **`MultiSelectGroup`'s `childs` is typed as the options or a loader** (`MultiSelectLoader<T>`). Code that reads `childs` from a `MultiSelectGroup` of its own (`group.childs.map(...)`) needs to narrow it first, `typeof group.childs != 'function'`. `renderGroupTitle`'s `group` keeps array `childs`.
- **`fixed` is reserved on options, as `disabled` is.** An option of yours with a truthy `fixed` field (`fixed: 'left'` too) now can't be removed once selected, and in single select it locks the value. Rename that field, or map your data to options without it.
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
