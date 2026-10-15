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
- [x] [Searchable](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#multi-select) <br>
- [x] [Custom Creatable Value](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#creatable-values) <br>
- [x] [Themeable (using css var)](https://arif-un.github.io/react-multiple-select-dropdown-lite/styling/) <br>
- [x] [Controlled value](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#controlled-value) <br>
- [x] [Keyboard navigation](https://arif-un.github.io/react-multiple-select-dropdown-lite/accessibility/#keyboard) <br>
- [x] [Accessible (ARIA combobox)](https://arif-un.github.io/react-multiple-select-dropdown-lite/accessibility/#aria) <br>
- [x] [TypeScript types](https://arif-un.github.io/react-multiple-select-dropdown-lite/api/#types) <br>
- [x] [SSR and Next.js App Router](https://arif-un.github.io/react-multiple-select-dropdown-lite/ssr/) <br>

<!-- - [ ] Sublist <br> -->

## Props Options

Also in the [API docs](https://arif-un.github.io/react-multiple-select-dropdown-lite/api/).

| Props             | type                        | default                          | description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | --------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options           | array                       | `[]`                             | options and groups (see [Groups](#groups)) <br> `label`: string, searched and shown <br> `value`: string <br> `disabled`: bool <br> `style`: (object) custom style <br> `classes`: (string) class names <br> <br> example: <br> `[ { label : "Option 1", value : "opt_1", style: {textAlign: 'center'}, classes: "classA classB" } ]`                                                                                                                                                                                  |
| width             |                             |                                  | deprecated, no effect: set the `--msl-input-width` CSS variable (since 2.0.1)                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| name              | string                      | ''                               | specify a name for form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| disabled          | bool                        | false                            | disable input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| defaultValue      | string array                |                                  | initial selection, as option values. Resolves once `options` load; later changes are ignored (use `value`, or a new `key` to reset). Values not in `options` are left out, or listed under Custom Values with `customValue`                                                                                                                                                                                                                                                                                            |
| value             | string array                |                                  | controlled selection, as option values; update it from `onChange`                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| singleSelect      | bool                        | false                            | allow one select only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| getLabel          | (option) => ReactNode       | `opt => opt.label`               | what an option shows in the menu, chips and single value. Search and the tooltip use it when it returns text, else `label`. e.g. `getLabel={(opt) => <b>{opt.label}</b>}`                                                                                                                                                                                                                                                                                                                                              |
| getValue          | (option) => string          | `opt => opt.value`               | an option's value, for `value`, `defaultValue` and `onChange`. With `getLabel`, options can be any shape: `getLabel={(u) => u.name} getValue={(u) => u.id}`. Their `disabled`, `style`, `classes` and `type` keep their meaning                                                                                                                                                                                                                                                                                        |
| filterOption      | (option, search) => boolean | label text or value contains it  | whether an option matches the search text (trimmed, commas removed), e.g. `filterOption={(user, s) => user.email.includes(s)}`. Not called for created values                                                                                                                                                                                                                                                                                                                                                          |
| downArrowIcon     | ReactNode                   | SVG                              | custom down arrow icon                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| closeIcon         | ReactNode                   | SVG                              | custom clear icon                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| clearLabel        | string                      | Clear                            | the clear button's `aria-label`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| clearable         | bool                        | true                             | show / hide close icon to clear value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| downArrow         | bool                        | true                             | show / hide down icon in dropdown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| className         | string                      |                                  | custom class for the wrapper. The open menu renders outside it, at the end of `<body>`, or of the dialog, popover or shadow root it sits in: give it classes, a theme class too, with `classNames.plate`                                                                                                                                                                                                                                                                                                               |
| classNames        | object                      |                                  | classes for each part, e.g. Tailwind utilities: `{ control: 'rounded-lg border', option: 'px-2 py-1 data-focused:bg-gray-100' }`. Keys: `plate`, `control`, `values`, `input`, `singleValue`, `chip`, `chipDelete`, `actions`, `clearButton`, `arrowButton`, `menu`, `group`, `groupTitle`, `option`, `empty`. See [Tailwind](#tailwind)                                                                                                                                                                               |
| placeholder       | string                      | Select...                        | Input Placeholder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| disableChip       | bool                        | false                            | disable multiple select chips show value or total selected value only                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| attr              | object                      |                                  | props for the wrapper div, e.g. `id` or `data-*`. Its `aria-*` (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-invalid`, ...) also go to whichever element is the combobox                                                                                                                                                                                                                                                                                                                                 |
| customValue       | bool                        | false                            | create options by typing and pressing Enter or comma (,); they are listed under Custom Values                                                                                                                                                                                                                                                                                                                                                                                                                          |
| createLabel       | (text) => string            | `` text => `Create "${text}"` `` | label of the option that creates the typed text, with `customValue`                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| customValuesTitle | ReactNode                   | Custom Values                    | title of the group listing created values                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| chipAlternateText | ReactNode                   | (number) Item Selected           | Show text when chip disabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| customChip        | (props) => ReactNode        | `msl-chip` markup                | renders each chip from `{ label, value, option, disabled, classNames, onDelete }` (`classNames` is the select's, `{}` when unset). A render function: no hooks; for state, render `<MyChip key={p.value} {...p} />` (chips are keyed by position: the key resets a moved chip's state). Clicks and keys inside don't open the menu. While the menu is open each chip renders twice (in the plate and the hidden dropdown). e.g. `({ label, onDelete }) => <button type='button' onClick={onDelete}>{label} ×</button>` |
| closeOnSelect     | bool                        | unset                            | close the menu after a pick. Unset: single select closes, multi select stays open                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| limit             | number \| null              | null                             | max number of selected values, `null` for no limit. The wrapper and the open plate get `msl-limit-reached` once hit                                                                                                                                                                                                                                                                                                                                                                                                    |
| emptyDataLabel    | ReactNode                   | No Data Found                    | shown when there are no options or no search results                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| disableSearch     | bool                        | false                            | hide the search input                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| style             | object                      | {}                               | inline style for the wrapper, not the open menu                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Groups

Put options in a group with `type: 'group'`, which options themselves can't use. Groups can nest ([demo](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#groups)).

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

### Controlled value

Pass `value` (an array of option values) and update it from `onChange` to own the selection, e.g. to reset or set it from outside ([demo](https://arif-un.github.io/react-multiple-select-dropdown-lite/examples/#controlled-value)).

```jsx
const [value, setValue] = useState(['option_1'])

<MultiSelect options={options} value={value} onChange={setValue} />
<button onClick={() => setValue([])}>Reset</button>
```

`defaultValue` only sets the initial selection, like `defaultValue` on an `<input>`: later changes are ignored. To reset an uncontrolled dropdown, give it a new `key`.

### TypeScript

Types ship with the package. `onChange` gets the selected values and their option objects.

```tsx
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectOption } from 'react-multiple-select-dropdown-lite'

const onChange = (values: string[], options: MultiSelectOption[]) =>
  console.log(values, options)
<MultiSelect options={options} onChange={onChange} />
```

Also exported: `MultiSelectGroup`, `MultiSelectProps`, `MultiSelectChipProps`, `MultiSelectClassNames`.

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

| Key             | Action                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Arrow Down / Up | open the menu and move the highlight over enabled options                  |
| Home / End      | first / last option (in the search field only while it is empty)           |
| Enter           | pick the highlighted option, else the first search result                  |
| , (comma)       | pick the first search result, or create the typed value with `customValue` |
| Backspace       | in an empty search field, remove the last chip                             |
| Escape          | close the menu, not a surrounding dialog or popover                        |
| Tab             | close the menu and move on in page order, after any button in the menu     |
| Enter / Space   | on a chip's delete button or the clear button, press it                    |
| any character   | on the focused dropdown, open the menu                                     |

### Accessibility

The search field (or the dropdown itself when there is no search field) is an ARIA combobox that controls a listbox of options, with `aria-expanded`, `aria-activedescendant`, `aria-selected` and `aria-disabled`. Groups are `role="group"`, named by their title. Give it an accessible name through `attr`:

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
/* one dropdown: <MultiSelect className='compact' classNames={{ plate: 'compact' }} /> */
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
| --msl-line-height              | 1.4                          | fonts line height.                               |
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
| --msl-menu-z-index             | 9999                         | Open menu z-index, raised over an outer one.     |
| --msl-background               | transparent                  | Background while closed.                         |
| --msl-scrollbar-color          | rgb(0 0 0 / 0.1)             | Menu scrollbar thumb.                            |

### CSS Classes

State classes to style against:

| Class                          | Element        | When                                  |
| ------------------------------ | -------------- | ------------------------------------- |
| `msl-disabled`                 | wrapper, plate | `disabled`                            |
| `msl-limit-reached`            | wrapper, plate | `limit` is reached                    |
| `msl-active` / `msl-active-up` | `.msl`         | menu is open, below / above the input |
| `msl-option-active`            | option         | selected                              |
| `msl-option-focused`           | option         | highlighted by the keyboard           |
| `msl-option-disable`           | option         | disabled                              |

Other parts: `msl-plate` (the open menu: a copy of the input with the options attached, placed over the hidden dropdown, rendered at the end of `<body>`, or of the dialog, popover or shadow root it sits in; it is not a `msl-wrp`), `msl-wrp` (wrapper), `msl-chip`, `msl-chip-delete`, `msl-single-value`, `msl-input`, `msl-clear-btn`, `msl-arrow-btn`, `msl-options`, `msl-option`, `msl-grp` (a group), `msl-grp-title`.

### Tailwind

Skip `dist/index.css` and style each part with `classNames`. State is in attributes, for Tailwind's variants: options have `aria-selected`, `aria-disabled` and `data-focused` (the keyboard highlight), the open menu's control `data-open` (and `data-up` when it opens upward), the wrapper `data-disabled`.

```jsx
<MultiSelect
  options={options}
  className='w-75 text-sm'
  classNames={{
    plate:
      'z-[max(50,var(--msl-inherited-z-index)+1)] rounded-lg bg-white text-sm text-gray-900 shadow-lg ring-1 ring-gray-200',
    control:
      'flex rounded-lg border border-gray-400 data-open:rounded-none data-open:border-transparent',
    menu: 'max-h-[min(400px,var(--msl-menu-room))] overflow-auto border-gray-200 first:border-b last:border-t',
    option:
      'cursor-pointer px-2 py-1 aria-selected:text-blue-600 data-focused:bg-gray-100'
  }}
/>
```

Without the stylesheet, register `--msl-menu-room` as non-inherited, `@property --msl-menu-room { syntax: '*'; inherits: false; }`, so a scroll restyles the listbox, not every option. The full example, with every part, is on the [docs site](https://arif-un.github.io/react-multiple-select-dropdown-lite/tailwind/). To restyle a few parts on top of the default look instead, import the stylesheet below Tailwind's utilities: `@import 'react-multiple-select-dropdown-lite/dist/index.css' layer(components);`.

<br>

### Change Log

See [CHANGELOG.md](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md) or the [docs changelog](https://arif-un.github.io/react-multiple-select-dropdown-lite/changelog/). Upgrading from 2.0.x? Check the [2.1.0 upgrade notes](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md#upgrade-notes).

<br>
<br>
<br>

### Sponsor

[<img src="https://bitapps.pro/wp-content/uploads/2025/03/Bit-Apps-Orginal-Logostroke-1.svg" alt="Bit Apps" width="200">](https://bitapps.pro/)

### License

MIT © [Arif-Un](https://github.com/arif-un) | [Amin](https://github.com/mdrubelamin2) | Built for Bit Form
