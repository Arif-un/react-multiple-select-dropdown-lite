## React Multiple Select Dropdown Lite

A lightweight Multiple/Single Select Pure functional component for react using React-Hooks.

**[Live demo and docs](https://arif-un.github.io/react-multiple-select-dropdown-lite/)**

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

![react-multiple-select-dropdown-menu](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/screenshot/react%20multiple%20select%20dropdown%20menu%20,%20lightweight,%20react%20hooks.gif?raw=true)

### Install

    npm i react-multiple-select-dropdown-lite

### Basic Initialization

```
import React, { useState } from 'react'
import MultiSelect from  'react-multiple-select-dropdown-lite'
import  'react-multiple-select-dropdown-lite/dist/index.css'

const App = () => {

  const [value, setvalue] = useState('')

  const  handleOnchange  =  val  => {
    setvalue(val)
  }

  const  options  = [
    { label:  'Option 1', value:  'option_1'  },
    { label:  'Option 2', value:  'option_2'  },
    { label:  'Option 3', value:  'option_3'  },
    { label:  'Option 4', value:  'option_4'  },
  ]

  return(
    <div className="app">
      <div  className="preview-values">
        <h4>Values</h4>
        {value}
      </div>

      <MultiSelect
        onChange={handleOnchange}
        options={options}
      />
    </div>
)}
export  default App
```

## Features and Roadmap

- [x] JSON Value <br>
- [x] Clearable <br>
- [x] Disable Chip <br>
- [x] Custom Down Arrow Icon <br>
- [x] Disabled <br>
- [x] Select Limit <br>
- [x] Group <br>
- [x] Searchable <br>
- [x] Custom Creatable Value <br>
- [x] Themeable (using css var) <br>
- [x] Controlled value <br>
- [x] Keyboard navigation <br>
- [x] Accessible (ARIA combobox) <br>
- [x] TypeScript types <br>
- [x] SSR and Next.js App Router <br>

<!-- - [ ] Sublist <br> -->

## Props Options

| Props             | type                                      | default                | description                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options           | array                                     | an `Empty` option      | options and groups (see [Groups](#groups)) <br> `label`: string or JSX <br> `value`: string <br> `title`: text for search and chips, required with a JSX label <br> `disabled`: bool <br> `style`: (object) custom style <br> `classes`: (string) class names <br> <br> example: <br> `[ { label : "Option 1", value : "opt_1", style: {textAlign: 'center'}, classes: "classA classB" } ]` |
| width             |                                           |                        | deprecated, no effect: set the `--input-width` CSS variable (since 2.0.1)                                                                                                                                                                                                                                                                                                                   |
| name              | string                                    | ''                     | specify a name for form                                                                                                                                                                                                                                                                                                                                                                     |
| disabled          | bool                                      | false                  | disable input                                                                                                                                                                                                                                                                                                                                                                               |
| defaultValue      | string \| array of object \| string array | ''                     | initial value: comma separated string, or an array of values or option objects. Resolves once `options` load, and follows later changes until the user picks (use `value` to stay in sync)                                                                                                                                                                                                  |
| value             | string \| array of object \| string array |                        | controlled selection, same forms as `defaultValue`; update it from `onChange`                                                                                                                                                                                                                                                                                                               |
| jsonValue         | bool                                      | false                  | `onChange` gets the selected option objects instead of a comma joined string                                                                                                                                                                                                                                                                                                                |
| singleSelect      | bool                                      | false                  | allow one select only                                                                                                                                                                                                                                                                                                                                                                       |
| downArrowIcon     | ReactNode                                 | SVG                    | custom down arrow icon                                                                                                                                                                                                                                                                                                                                                                      |
| closeIcon         | ReactNode                                 | SVG                    | custom clear icon                                                                                                                                                                                                                                                                                                                                                                           |
| clearable         | bool                                      | true                   | show / hide close icon to clear value                                                                                                                                                                                                                                                                                                                                                       |
| downArrow         | bool                                      | true                   | show / hide down icon in dropdown                                                                                                                                                                                                                                                                                                                                                           |
| className         | string                                    |                        | custom class for the wrapper                                                                                                                                                                                                                                                                                                                                                                |
| placeholder       | string                                    | Select...              | Input Placeholder                                                                                                                                                                                                                                                                                                                                                                           |
| disableChip       | bool                                      | false                  | disable multiple select chips show value or total selected value only                                                                                                                                                                                                                                                                                                                       |
| attr              | object                                    |                        | props for the wrapper div, e.g. `id` or `data-*`. `aria-label` / `aria-labelledby` name the dropdown for screen readers                                                                                                                                                                                                                                                                     |
| customValue       | bool                                      | false                  | create options by typing and pressing Enter or comma (,); they are listed under Custom Values                                                                                                                                                                                                                                                                                               |
| largeData         | bool                                      | false                  | render options only while the menu is open, for long lists                                                                                                                                                                                                                                                                                                                                  |
| chipAlternateText | string                                    | (number) Item Selected | Show text when chip disabled.                                                                                                                                                                                                                                                                                                                                                               |
| closeOnSelect     | bool                                      | unset                  | close the menu after a pick. Unset: single select closes, multi select stays open                                                                                                                                                                                                                                                                                                           |
| limit             | number \| null                            | null                   | max number of selected values, `null` for no limit. The wrapper gets `msl-limit-reached` once hit                                                                                                                                                                                                                                                                                           |
| clearAll          | bool                                      | false                  | clears the value when it turns `true`                                                                                                                                                                                                                                                                                                                                                       |
| emptyDataLabel    | string                                    | No Data Found          | text shown when there are no options or no search results                                                                                                                                                                                                                                                                                                                                   |
| disableSearch     | bool                                      | false                  | hide the search input                                                                                                                                                                                                                                                                                                                                                                       |
| style             | object                                    | {}                     | inline style for the wrapper                                                                                                                                                                                                                                                                                                                                                                |

### Groups

Put options in a group with `type: 'group'`. Groups can nest.

```
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

Pass `value` and update it from `onChange` to own the selection, e.g. to reset or set it from outside. It takes the same forms as `defaultValue`.

```
const [value, setValue] = useState('option_1')

<MultiSelect options={options} value={value} onChange={setValue} />
<button onClick={() => setValue('')}>Reset</button>
```

With `defaultValue` instead, the dropdown keeps its own state after the user picks.

### TypeScript

Types ship with the package. `onChange` gets a `string` by default, or `MultiSelectOption[]` with `jsonValue`.

```
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectOption } from 'react-multiple-select-dropdown-lite'

const onChange = (value: string) => console.log(value)
<MultiSelect options={options} onChange={onChange} />

const onJsonChange = (value: MultiSelectOption[]) => console.log(value)
<MultiSelect jsonValue options={options} onChange={onJsonChange} />
```

Also exported: `MultiSelectGroup`, `MultiSelectProps`, `MultiSelectValue`.

### Next.js and SSR

Server rendering works on React 16 to 19, with matching ids on hydration. The bundles start with `'use client'`, so a Next.js App Router Server Component can import it directly when it passes only serializable props (for example `name` inside a form). To handle `onChange`, render it from your own `'use client'` component.

```
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
```

<br>

### Events

| Props       | Params | Description                                                                          |
| ----------- | ------ | ------------------------------------------------------------------------------------ |
| onChange    | value  | after any change: a comma joined `string`, or `MultiSelectOption[]` with `jsonValue` |
| onMenuOpen  | null   | Trigger when menu open                                                               |
| onMenuClose | null   | Trigger when menu close                                                              |
| onClear     | null   | Trigger after the clear button empties the value (not for `clearAll`)                |

### Keyboard

| Key             | Action                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Arrow Down / Up | open the menu and move the highlight over enabled options                  |
| Home / End      | first / last option (in the search field only while it is empty)           |
| Enter           | pick the highlighted option, else the first search result                  |
| , (comma)       | pick the first search result, or create the typed value with `customValue` |
| Backspace       | in an empty search field, remove the last chip                             |
| Escape          | close the menu                                                             |
| Tab             | move on; the menu closes once focus leaves                                 |
| Enter / Space   | on a chip's delete button or the clear button, press it                    |
| any character   | on the focused dropdown, open the menu                                     |

### Accessibility

The search field (or the dropdown itself when there is no search field) is an ARIA combobox that controls a listbox of options, with `aria-expanded`, `aria-activedescendant`, `aria-selected` and `aria-disabled`. Groups are `role="group"`, named by their title. Give it an accessible name through `attr`:

```
<MultiSelect options={options} attr={{ 'aria-label': 'Fruits' }} />
<MultiSelect options={options} attr={{ 'aria-labelledby': 'fruits-label' }} />
```

### CSS Variables

CSS variable applied in `.msl-vars` class name.

| Variable                 | Default Value         | Details                                          |
| ------------------------ | --------------------- | ------------------------------------------------ |
| --menu-max-height        | 400px                 | Dropdown menu <br> maximum height.               |
| --input-width            | 300px                 | Dropdown input width.                            |
| --font-size              | 16px                  | Dropdown font size.                              |
| --border-radius          | 8px 8px 8px 8px       | Dropdown Border Radius.                          |
| --active-menu-shadow     | 0 2px 8px 0px #b1b1b1 | Menu Shadow <br> when active.                    |
| --line-height            | 1.4                   | fonts line height.                               |
| --active-menu-background | white                 | Dropdown menu <br> background color when active. |
| --active-menu-radius     | var(--border-radius)  | Dropdown menu border <br> radius when active.    |

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

Other parts: `msl-wrp` (wrapper), `msl-chip`, `msl-chip-delete`, `msl-single-value`, `msl-input`, `msl-clear-btn`, `msl-arrow-btn`, `msl-options`, `msl-option`, `msl-grp-title`.

<br>

### Change Log

See [CHANGELOG.md](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md). Upgrading from 2.0.x? Check the [2.1.0 upgrade notes](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/CHANGELOG.md#upgrade-notes).

<br>
<br>
<br>

### Sponsor

[<img src="https://www.bitcode.pro/wp-content/uploads/2019/09/final.svg_-3.png">](https://www.bitcode.pro/)

### License

MIT © [Arif-Un](https://github.com/arif-un) | [Amin](https://github.com/mdrubelamin2) | Built for Bit Form
