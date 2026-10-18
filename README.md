## React Multiple Select Dropdown Lite

A lightweight Multiple/Single Select Pure functional component for react using React-Hooks.

**[Live demo and docs](https://arif-un.github.io/react-multiple-select-dropdown-lite/)**: [Getting started](https://arif-un.github.io/react-multiple-select-dropdown-lite/getting-started/) · [Examples](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/) · [API](https://arif-un.github.io/react-multiple-select-dropdown-lite/api/) · [Styling](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/)

<p align="center">
  <a href="https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="React Multiple Select Dropdown Lite is released under the MIT license." />
  </a>
  <a href="https://www.npmjs.com/package/react-multiple-select-dropdown-lite">
    <img alt="npm" src="https://img.shields.io/npm/v/react-multiple-select-dropdown-lite">
  </a>
  <a href="https://bundlephobia.com/result?p=react-multiple-select-dropdown-lite">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/min/react-multiple-select-dropdown-lite">
  </a>
  <a href="https://bundlephobia.com/result?p=react-multiple-select-dropdown-lite">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/react-multiple-select-dropdown-lite">
  </a>
  <a href="https://github.com/Arif-un/react-multiple-select-dropdown-lite/pulls">
    <img alt="npm bundle size" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg">
  </a>
</p>

### Screenshot

Try it in the [playground](https://arif-un.github.io/react-multiple-select-dropdown-lite/#try-it).

![react-multiple-select-dropdown-menu](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/screenshot/react%20multiple%20select%20dropdown%20menu%20,%20lightweight,%20react%20hooks.gif?raw=true)

### Install

    npm i react-multiple-select-dropdown-lite

React 18 or 19, in a browser with the Popover API: Chrome 114, Firefox 125, Safari 17. Submenus open beside their title where the browser has CSS anchor positioning, else under it, in the menu.

### Basic Initialization

```jsx
import React, { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Option 1', value: 'option_1' },
  { label: 'Option 2', value: 'option_2' },
  { label: 'Option 3', value: 'option_3' },
  { label: 'Option 4', value: 'option_4' }
]

const App = () => {
  const [value, setValue] = useState([])

  return (
    <div className='app'>
      <h4>Values</h4>
      {value.join(', ')}

      <MultiSelect onChange={setValue} options={options} />
    </div>
  )
}
export default App
```

More in the [examples](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/), each with a live demo.

## Features and Roadmap

- [x] [Option objects in onChange](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#option-objects) <br>
- [x] Clearable <br>
- [x] [Disable Chip](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#count-instead-of-chips) <br>
- [x] [Custom Down Arrow Icon](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#custom-icons) <br>
- [x] [Disabled](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#disabled) <br>
- [x] [Select Limit](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#limit) <br>
- [x] [Group](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#groups) <br>
- [x] [Collapsible groups](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#groups) <br>
- [x] [Nested submenus](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#submenus) <br>
- [x] [Searchable](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#multi-select) <br>
- [x] [Custom Creatable Value](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#creatable-values) <br>
- [x] [Search in the menu](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#search-in-the-menu) <br>
- [x] [Delete chips with their button only](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#delete-chips-with-their-button-only) <br>
- [x] [Virtual lists, through any library](https://arif-un.github.io/react-multiple-select-dropdown-lite/virtual-lists/) <br>
- [x] [Themeable (using css var)](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/) <br>
- [x] [Enter and exit animations in CSS](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/#animations) <br>
- [x] [Controlled value](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#controlled-value) <br>
- [x] [Keyboard navigation](https://arif-un.github.io/react-multiple-select-dropdown-lite/accessibility/#keyboard) <br>
- [x] [Accessible (ARIA combobox)](https://arif-un.github.io/react-multiple-select-dropdown-lite/accessibility/#aria) <br>
- [x] [TypeScript types](https://arif-un.github.io/react-multiple-select-dropdown-lite/api/#types) <br>
- [x] [SSR and Next.js App Router](https://arif-un.github.io/react-multiple-select-dropdown-lite/ssr/) <br>

<!-- - [ ] Sublist <br> -->

## Props Options

Also in the [API docs](https://arif-un.github.io/react-multiple-select-dropdown-lite/api/).

| Props             | type                        | default                          | description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | --------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options           | array                       | `[]`                             | options, groups and submenus (see [Groups](#groups)) <br> `label`: string, searched and shown <br> `value`: string <br> `disabled`: bool <br> `style`: (object) custom style <br> `classes`: (string) class names <br> <br> example: <br> `[ { label : "Option 1", value : "opt_1", style: {textAlign: 'center'}, classes: "classA classB" } ]`                                                                                                                                                                                                                                                                                   |
| name              | string                      | ''                               | specify a name for form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| disabled          | bool                        | false                            | disable input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| defaultValue      | string array                |                                  | initial selection, as option values. Resolves once `options` load; later changes are ignored (use `value`, or a new `key` to reset). Values not in `options` are left out, or listed under Custom Values with `customValue`                                                                                                                                                                                                                                                                                                                                                                                                       |
| value             | string array                |                                  | controlled selection, as option values; update it from `onChange`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| singleSelect      | bool                        | false                            | allow one select only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| getLabel          | (option) => ReactNode       | `opt => opt.label`               | what an option shows in the menu, chips and single value. Search and the tooltip use it when it returns text, else `label`. e.g. `getLabel={(opt) => <b>{opt.label}</b>}`                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| getValue          | (option) => string          | `opt => opt.value`               | an option's value, for `value`, `defaultValue` and `onChange`. With `getLabel`, options can be any shape: `getLabel={(u) => u.name} getValue={(u) => u.id}`. Their `disabled`, `style`, `classes` and `type` keep their meaning                                                                                                                                                                                                                                                                                                                                                                                                   |
| filterOption      | (option, search) => boolean | label text or value contains it  | whether an option matches the search text (trimmed, commas removed), e.g. `filterOption={(user, s) => user.email.includes(s)}`. Not called for created values                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| downArrowIcon     | ReactNode                   | SVG                              | custom down arrow icon                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| closeIcon         | ReactNode                   | SVG                              | custom clear icon                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| clearLabel        | string                      | Clear                            | the clear button's `aria-label`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| clearable         | bool                        | true                             | show / hide close icon to clear value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| downArrow         | bool                        | true                             | show / hide down icon in dropdown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| className         | string                      |                                  | custom class for the wrapper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| classNames        | object                      |                                  | classes for each part, e.g. Tailwind utilities: `{ control: 'rounded-lg border', option: 'px-2 py-1 data-focused:bg-gray-100' }`. Keys: `control`, `values`, `input`, `search`, `singleValue`, `chip`, `chipDelete`, `actions`, `clearButton`, `arrowButton`, `menu`, `group`, `groupTitle`, `groupBody`, `option`, `submenu`, `empty`. See [Tailwind](#tailwind)                                                                                                                                                                                                                                                                 |
| placeholder       | string                      | Select...                        | Input Placeholder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| disableChip       | bool                        | false                            | disable multiple select chips show value or total selected value only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| attr              | object                      |                                  | props for the wrapper div, e.g. `id` or `data-*`. Its `aria-*` (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-invalid`, ...) also go to whichever element is the combobox                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| customValue       | bool                        | false                            | create options by typing and pressing Enter or comma (,); they are listed under Custom Values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| createLabel       | (text) => string            | `` text => `Create "${text}"` `` | label of the option that creates the typed text, with `customValue`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| customValuesTitle | ReactNode                   | Custom Values                    | title of the group listing created values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| chipAlternateText | ReactNode                   | (number) Item Selected           | Show text when chip disabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| customChip        | (props) => ReactNode        | `msl-chip` markup                | renders each chip from `{ label, value, option, disabled, classNames, onDelete }` (`classNames` is the select's, `{}` when unset). A render function: no hooks; for state, render `<MyChip key={p.value} {...p} />` (chips are keyed by position: the key resets a moved chip's state). Clicks and keys inside don't open the menu. e.g. `({ label, onDelete }) => <button type='button' onClick={onDelete}>{label} ×</button>`                                                                                                                                                                                                   |
| closeOnSelect     | bool                        | unset                            | close the menu after a pick. Unset: single select closes, multi select stays open                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| limit             | number \| null              | null                             | max number of selected values in multi select, `null` for no limit. The wrapper gets `msl-limit-reached` once hit, and unselected options `aria-disabled` and `msl-option-disable`                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| emptyDataLabel    | ReactNode                   | No Data Found                    | shown when there are no options or no search results                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| disableSearch     | bool                        | false                            | hide the search input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| searchInMenu      | bool                        | false                            | put the search field at the top of the open menu, not after the values: the closed control shows only the values, or `placeholder`. Single select and `disableChip` can then search with a value selected                                                                                                                                                                                                                                                                                                                                                                                                                         |
| searchPlaceholder | string                      | Search...                        | the search field's placeholder with `searchInMenu`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| deleteOnBackspace | bool                        | true                             | Backspace in the empty search field removes the last chip. `false`: only the chip delete buttons remove chips                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| style             | object                      | {}                               | inline style for the wrapper. While the menu is open, it gets the control's height as `min-height`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| renderList        | (list) => ReactNode         |                                  | renders the open list's rows yourself, through the virtual list library of your choice for thousands of options (see [Virtual lists](#virtual-lists)). `list` is `{ count, row(index), activeIndex }`: only the rows you render get built, and `activeIndex` is the keyboard highlight's row (`-1` for none) to scroll into view. A render function: no hooks. Groups are flattened, a row in a group comes in a `msl-grp` box per group around it. An open submenu's rows go through it too, in its popover. The listbox and submenus get `data-custom`, flex columns in the stylesheet. Not called while `emptyDataLabel` shows |

### Groups

Put options in a group with `type: 'group'`. Options themselves can't have `type: 'group'` or `type: 'submenu'`. Groups can nest ([demo](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#groups)).

```js
const options = [
  { label: 'Option 1', value: 'option_1' },
  {
    type: 'group',
    title: 'Group A',
    emptyDataLabel: 'Nothing here', // shown when childs is empty
    childs: [
      { label: 'Option 2', value: 'option_2' },
      { label: 'Option 3', value: 'option_3' }
    ]
  }
]
```

A group with `collapsible: true` shows and hides its options on a click of its title (or Enter); `collapsed: true` starts it closed. `type: 'submenu'` makes the title a row that opens its options in a popover beside the menu, on hover, click, Enter or Arrow Right. Submenus nest to any depth, and groups go inside them ([demo](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#submenus)). Search finds options in closed groups and submenus too.

```js
const options = [
  {
    type: 'group',
    title: 'Citrus',
    collapsible: true,
    collapsed: true,
    childs: [lemon, lime]
  },
  {
    type: 'submenu',
    title: 'Vegetables',
    childs: [
      carrot,
      { type: 'submenu', title: 'Leafy greens', childs: [kale, spinach] }
    ]
  }
]
```

The stylesheet places a submenu (`.msl-submenu`) beside its title with CSS anchor positioning, on the other side or above where there is no room. A browser without it gets the submenu under its title, in the menu (with `renderList`, only if your list measures its rows: a fixed row height clips it). Right to left (a `dir="rtl"` attribute, which the stylesheet reads with `:dir()`, not CSS `direction` alone), it opens on the left, and Arrow Left and Right swap. Its title's `aria-expanded` is the open state for your CSS.

### Controlled value

Pass `value` (an array of option values) and update it from `onChange` to own the selection, e.g. to reset or set it from outside ([demo](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#controlled-value)).

```jsx
const [value, setValue] = useState(['option_1'])

<MultiSelect options={options} value={value} onChange={setValue} />
<button onClick={() => setValue([])}>Reset</button>
```

`defaultValue` only sets the initial selection, like `defaultValue` on an `<input>`: later changes are ignored. To reset an uncontrolled dropdown, give it a new `key`.

### Virtual lists

For thousands of options, render only the rows in view through the virtual list library of your choice, installed yourself. `renderList` gets `{ count, row, activeIndex }`: render `row(index)` for the rows in view, and scroll to `activeIndex`, the keyboard highlight's row. With [react-window](https://github.com/bvaughn/react-window) (TanStack Virtual and other libraries in the [guide](https://arif-un.github.io/react-multiple-select-dropdown-lite/virtual-lists/)):

```tsx
import { useEffect } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectListProps } from 'react-multiple-select-dropdown-lite'
import { List, useListCallbackRef } from 'react-window'
import type { RowComponentProps } from 'react-window'

const Row = ({
  index,
  style,
  row
}: RowComponentProps<Pick<MultiSelectListProps, 'row'>>) => (
  // top, not react-window's transform: Firefox places a submenu off a transformed row
  <div style={{ ...style, transform: 'none', top: index * 36 }}>
    {row(index)}
  </div>
)

// renders only the rows in view
function VirtualList({ count, row, activeIndex }: MultiSelectListProps) {
  // state, not a ref: the list can scroll once it has mounted
  const [list, setList] = useListCallbackRef(null)
  // keeps the keyboard highlight in view
  useEffect(() => {
    activeIndex >= 0 && list?.scrollToRow({ index: activeIndex })
  }, [list, activeIndex])
  return (
    <List
      listRef={setList}
      // no role="list" between the listbox and its options
      role='none'
      // no tab stop: Firefox makes a scroller one
      tabIndex={-1}
      rowComponent={Row}
      rowCount={count}
      rowHeight={36}
      rowProps={{ row }}
    />
  )
}

const App = () => (
  <MultiSelect
    options={options}
    renderList={(list) => <VirtualList {...list} />}
  />
)
```

### TypeScript

Types ship with the package. `onChange` gets the selected values and their option objects.

```tsx
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectOption } from 'react-multiple-select-dropdown-lite'

const onChange = (values: string[], options: MultiSelectOption[]) =>
  console.log(values, options)
<MultiSelect options={options} onChange={onChange} />
```

Also exported: `MultiSelectGroup`, `MultiSelectProps`, `MultiSelectChipProps`, `MultiSelectClassNames`, `MultiSelectListProps`.

### Next.js and SSR

Server rendering works on React 18 and 19, with matching ids on hydration. The bundles start with `'use client'`, so a Next.js App Router Server Component can import it directly when it passes only serializable props (for example `name` inside a form). To handle `onChange`, render it from your own `'use client'` component. More in the [SSR guide](https://arif-un.github.io/react-multiple-select-dropdown-lite/ssr/).

```js
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
```

<br>

### Events

| Props       | Params          | Description                                                                                                                                                                     |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| onChange    | values, options | after any change: the selected values (`string[]`) and their option objects (`T[]`, so `MultiSelectOption[]` by default). A created value's option is `{ label: value, value }` |
| onMenuOpen  | null            | Trigger when menu open                                                                                                                                                          |
| onMenuClose | null            | Trigger when menu close                                                                                                                                                         |
| onClear     | null            | Trigger after the clear button empties the value                                                                                                                                |

### Keyboard

| Key             | Action                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Arrow Down / Up | open the menu and move the highlight over enabled options (within the submenu it is in)          |
| Arrow Right     | on a submenu title, open it and highlight its first option (Arrow Left right to left)            |
| Arrow Left      | in a submenu, close it and highlight its title (Arrow Right right to left)                       |
| Home / End      | first / last option (in the search field only while it is empty)                                 |
| Enter           | pick the highlighted option, else the first search result that isn't `disabled`                  |
| Enter           | on a highlighted submenu title, open it; on a collapsible group's title, toggle it               |
| , (comma)       | pick the first search result that isn't `disabled`, or create the typed value with `customValue` |
| Backspace       | in an empty search field, remove the last chip (unless `deleteOnBackspace={false}`)              |
| Escape          | close the menu, not a surrounding dialog or popover; in a submenu, close that submenu            |
| Tab             | close the menu and move on in page order, after any button in the menu                           |
| Enter / Space   | on a chip's delete button or the clear button, press it                                          |
| any character   | on the focused dropdown, open the menu                                                           |

### Accessibility

The search field (or the dropdown itself when there is no search field, and with `searchInMenu` while closed) is an ARIA combobox that controls a listbox of options, with `aria-expanded`, `aria-activedescendant`, `aria-selected` and `aria-disabled`. Groups are `role="group"`, named by their title, except with `renderList`, which flattens them. With `renderList`, options carry `aria-posinset` and `aria-setsize`, as only the rows in view are there to count. The titles of collapsible groups and submenus are options with `aria-expanded`, and a submenu is a `role="group"` inside the listbox, named by its title. ARIA allows no `aria-expanded` on an option, so axe reports `aria-allowed-attr` on these titles and Chrome doesn't announce the state: a listbox has no valid way to mark a row that opens more. Give it an accessible name through `attr`:

```jsx
<MultiSelect options={options} attr={{ 'aria-label': 'Fruits' }} />
<MultiSelect options={options} attr={{ 'aria-labelledby': 'fruits-label' }} />
```

### CSS Variables

The defaults live on `.msl-vars`, the wrapper of every dropdown. Override them on `.msl-vars` for all dropdowns, or add your own class for one. Keep `.msl-vars` in the selector: a lone class of yours ties with the defaults, so it only wins when its CSS loads later. See the [styling guide](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/) for a dark theme.

```css
/* every dropdown */
.msl-vars {
  --msl-input-width: 100%;
}
/* one dropdown: <MultiSelect className='compact' /> */
.msl-vars.compact {
  --msl-font-size: 12px;
}
```

| Variable                       | Default Value                | Details                                          |
| ------------------------------ | ---------------------------- | ------------------------------------------------ |
| --msl-menu-max-height          | 400px                        | Dropdown menu <br> maximum height.               |
| --msl-input-width              | 300px                        | Dropdown input width.                            |
| --msl-font-size                | 14px                         | Dropdown font size.                              |
| --msl-border-radius            | 8px                          | Dropdown Border Radius.                          |
| --msl-active-menu-shadow       | 5 soft layers                | Menu Shadow <br> when active.                    |
| --msl-line-height              | 1.4                          | unitless line height.                            |
| --msl-active-menu-background   | white                        | Dropdown menu <br> background color when active. |
| --msl-active-menu-radius       | var(--msl-border-radius)     | Dropdown menu border <br> radius when active.    |
| --msl-active-menu-border-color | hsl(224deg 5.68% 88.24%)     | Border around <br> the open menu.                |
| --msl-divider-color            | rgb(3 7 18 / 0.08)           | Line between the input <br> and the open menu.   |
| --msl-placeholder-color        | rgb(146 146 146)             | Placeholder text color.                          |
| --msl-border-color             | rgb(156 156 156)             | Border color.                                    |
| --msl-hover-border-color       | rgb(80 80 80)                | Border color on hover.                           |
| --msl-disabled-background      | rgb(246 246 246)             | Background when `disabled`.                      |
| --msl-chip-background          | rgb(238 238 238)             | Chip background.                                 |
| --msl-chip-delete-background   | transparent                  | Chip delete button background.                   |
| --msl-chip-delete-color        | rgb(0 0 0 / 0.6)             | Chip delete icon color.                          |
| --msl-button-hover-background  | lightgray                    | Clear, arrow and chip delete buttons on hover.   |
| --msl-option-hover-background  | rgb(233 233 233)             | Option on hover or keyboard highlight.           |
| --msl-option-active-background | hsl(209.49deg 10.01% 93.31%) | Selected option background.                      |
| --msl-option-active-color      | #0351ff                      | Selected option text color.                      |
| --msl-option-disabled-color    | rgb(0 0 0 / 0.3)             | Disabled option text color.                      |
| --msl-group-title-background   | #fafafa                      | Group title background.                          |
| --msl-group-offset             | 12px                         | Indent of a group's <br> options, per level.     |
| --msl-focus-color              | rgb(0 119 255)               | Keyboard focus outline.                          |
| --msl-background               | transparent                  | Background while closed.                         |
| --msl-scrollbar-color          | rgb(0 0 0 / 0.1)             | Menu scrollbar thumb.                            |

### CSS Classes

State classes to style against:

| Class                          | Element | When                                  |
| ------------------------------ | ------- | ------------------------------------- |
| `msl-disabled`                 | wrapper | `disabled`                            |
| `msl-limit-reached`            | wrapper | `limit` is reached                    |
| `msl-active` / `msl-active-up` | `.msl`  | menu is open, below / above the input |
| `msl-option-active`            | option  | selected                              |
| `msl-option-focused`           | option  | highlighted by the keyboard           |
| `msl-option-disable`           | option  | disabled                              |

Other parts: `msl-wrp` (wrapper), `msl` (the input box; open, it holds the options too, in the top layer over the wrapper), `msl-chip`, `msl-chip-delete`, `msl-single-value`, `msl-input`, `msl-search` (the search field's box with `searchInMenu`), `msl-clear-btn`, `msl-arrow-btn`, `msl-options`, `msl-option`, `msl-grp` (a group), `msl-grp-title`, `msl-grp-body` (a collapsible group's childs), `msl-submenu` (a submenu's popover).

### Animations

Opening needs nothing from the component: the options, a submenu and an expanding group's body are new elements, so `@starting-style` (Tailwind's `starting:`) animates them in. Closing, whatever closes stays until the CSS animations and transitions that its `data-closing` starts have ended: the open box (`.msl[data-closing]`, still `.msl-active`), a copy of a closed submenu (`.msl-submenu[data-closing]`), and a copy of a collapsed group's body (`.msl-grp-body[data-closing]`). Without exit CSS it closes at once. A closing menu is inert, and focus leaves it.

```css
.msl-options,
.msl-submenu {
  transition: opacity 150ms;
  @starting-style {
    opacity: 0;
  }
}
.msl[data-closing] .msl-options,
.msl-submenu[data-closing] {
  opacity: 0;
}
```

With Tailwind: `starting:opacity-0 in-data-closing:opacity-0` on `classNames.menu`, `data-closing:opacity-0` on `classNames.submenu`. The [docs](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/#animations) have an example where the open box grows and shrinks with its content.

### Tailwind

Skip `dist/index.css` and style each part with `classNames`. State is in attributes, for Tailwind's variants: options have `aria-selected`, `aria-disabled` and `data-focused` (the keyboard highlight), the open control `data-open` (and `data-up` when it opens upward), the wrapper `data-disabled`, and whatever is closing `data-closing` (see [Animations](#animations)). With `renderList`, the listbox and submenus have `data-custom`: make them flex columns, `data-custom:flex data-custom:flex-col`, so a virtual list's scroller fits the menu.

```jsx
<MultiSelect
  options={options}
  className='w-75 text-sm'
  classNames={{
    control:
      'grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-gray-400 data-open:border-gray-200 data-open:bg-white data-open:shadow-lg',
    menu: 'col-span-full max-h-[min(400px,var(--msl-menu-room))] overflow-auto border-t border-gray-200 in-data-up:border-t-0 in-data-up:border-b',
    option:
      'cursor-pointer px-2 py-1 aria-selected:text-blue-600 data-focused:bg-gray-100'
  }}
/>
```

Without the stylesheet, register `--msl-menu-room` as non-inherited, `@property --msl-menu-room { syntax: '*'; inherits: false; initial-value: 100vh; }`, so a scroll restyles the listbox, not every option. The initial value caps the menu before it first measures the room, for a virtual list that measures itself on mount. The full example, with every part, is on the [docs site](https://arif-un.github.io/react-multiple-select-dropdown-lite/tailwind/). To restyle a few parts on top of the default look instead, import the stylesheet below Tailwind's utilities: `@import 'react-multiple-select-dropdown-lite/dist/index.css' layer(components);`.

<br>

### Change Log

See [CHANGELOG.md](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md) or the [docs changelog](https://arif-un.github.io/react-multiple-select-dropdown-lite/changelog/). Upgrading from 2.x to 3.0? Check the [3.0 upgrade notes](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md#upgrade-notes). From 2.0.x to 2.1? The [2.1.0 upgrade notes](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md#upgrade-notes-1).

<br>
<br>
<br>

### Sponsor

[<img src="https://bitapps.pro/wp-content/uploads/2025/03/Bit-Apps-Orginal-Logostroke-1.svg" alt="Bit Apps" width="200">](https://bitapps.pro/)

### License

MIT © [Arif-Un](https://github.com/arif-un) | [Amin](https://github.com/mdrubelamin2) | Built for Bit Form
