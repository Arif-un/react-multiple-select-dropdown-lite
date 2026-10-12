## React Multiple Select Dropdown Lite

A lightweight Multiple/Single Select Pure functional component for react using React-Hooks.

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

<!-- - [ ] Sublist <br> -->

## Props Options

| Props             | type                                      | default                    | description                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ----------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options           | array                                     | ""                         | pass options as array of object <br> `label` : (string or JSX) Options Label <br> `value` : Option value <br> `style` : (object) custom style <br> `classes` : (string) style classes <br>`title` : must be provide for JSX label <br> <br> example: <br> `[ { label : "Option 1", value : "opt_1", style: {textAlign: 'center'}, classes: "classA classB" } ]` |
| width             |                                           |                            | move in css var (version 2.0.1)                                                                                                                                                                                                                                                                                                                                 |
| name              | string                                    | ''                         | specify a name for form                                                                                                                                                                                                                                                                                                                                         |
| disabled          | bool                                      | false                      | disable input                                                                                                                                                                                                                                                                                                                                                   |
| defaultValue      | string \| array of object \| string array | ''                         | specify default value                                                                                                                                                                                                                                                                                                                                           |
| value             | string \| array of object \| string array |                            | controlled selection, same forms as `defaultValue`; update it from `onChange`                                                                                                                                                                                                                                                                                   |
| jsonValue         | bool                                      | false                      | get value from input as json                                                                                                                                                                                                                                                                                                                                    |
| singleSelect      | bool                                      | false                      | allow one select only                                                                                                                                                                                                                                                                                                                                           |
| downArrowIcon     | string \| icon \| component               | SVG                        | Specify custom down arrow icon                                                                                                                                                                                                                                                                                                                                  |
| closeIcon         | string \| icon \| component               | SVG                        | Specify custom close arrow icon                                                                                                                                                                                                                                                                                                                                 |
| clearable         | bool                                      | true                       | show / hide close icon to clear value                                                                                                                                                                                                                                                                                                                           |
| downArrow         | bool                                      | true                       | show / hide down icon in dropdown                                                                                                                                                                                                                                                                                                                               |
| className         | string \| object                          |                            | specify custom class                                                                                                                                                                                                                                                                                                                                            |
| placeholder       | string                                    | Select...                  | Input Placeholder                                                                                                                                                                                                                                                                                                                                               |
| disableChip       | bool                                      | false                      | disable multiple select chips show value or total selected value only                                                                                                                                                                                                                                                                                           |
| attr              | object                                    |                            | set custom attr to element                                                                                                                                                                                                                                                                                                                                      |
| customValue       | bool                                      | false                      | create custom options by pressing enter or comma (,)                                                                                                                                                                                                                                                                                                            |
| largeData         | bool                                      | false                      | prevent slow down (DOM) for large amount of data                                                                                                                                                                                                                                                                                                                |
| chipAlternateText | string                                    | (number) Item Selected     | Show text when chip disabled.                                                                                                                                                                                                                                                                                                                                   |
| closeOnSelect     | bool                                      | single: true, multi: false | close option-menu on select option                                                                                                                                                                                                                                                                                                                              |
| limit             | number \| null                            | null                       | max number of selected values, `null` for no limit. The wrapper gets `msl-limit-reached` once hit                                                                                                                                                                                                                                                               |
| clearAll          | bool                                      | false                      | clears the value when it turns `true`                                                                                                                                                                                                                                                                                                                           |
| emptyDataLabel    | string                                    | No Data Found              | text shown when there are no options or no search results                                                                                                                                                                                                                                                                                                       |
| disableSearch     | bool                                      | false                      | hide the search input                                                                                                                                                                                                                                                                                                                                           |
| style             | object                                    | {}                         | inline style for the wrapper                                                                                                                                                                                                                                                                                                                                    |

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

### TypeScript

Types ship with the package. `onChange` gets a `string` by default, or `MultiSelectOption[]` with `jsonValue`.

```
import MultiSelect from 'react-multiple-select-dropdown-lite'

const onChange = (value: string) => console.log(value)
<MultiSelect options={options} onChange={onChange} />
```

<br>

### Events

| Props       | Params | Description                                                           |
| ----------- | ------ | --------------------------------------------------------------------- |
| onChange    | values | Trigger on change any value                                           |
| onMenuOpen  | null   | Trigger when menu open                                                |
| onMenuClose | null   | Trigger when menu close                                               |
| onClear     | null   | Trigger after the clear button empties the value (not for `clearAll`) |

### CSS Variables

CSS variable applied in `.msl-vars` class name.

| Variable                 | Default Value        | Details                                          |
| ------------------------ | -------------------- | ------------------------------------------------ |
| --menu-max-height        | 400px                | Dropdown menu <br> maximum height.               |
| --input-width            | 300px                | Dropdown input width.                            |
| --font-size              | 16px                 | Dropdown font size.                              |
| --border-radius          | 8px 8px 8px 8px      | Dropdown Border Radius.                          |
| --active-menu-shadow     | 1px 1px 5px 0px gray | Menu Shadow <br> when active.                    |
| --line-height            | 1.4                  | fonts line height.                               |
| --active-menu-background | white                | Dropdown menu <br> background color when active. |
| --active-menu-radius     | var(--border-radius) | Dropdown menu border <br> radius when active.    |

<br>

### Change Log

###### v-2.1.0

- **Breaking:** `MultiSelect.defaultProps` no longer exists (React 19 support: defaults are parameter defaults now). Pass props instead of changing it
- TypeScript types included (`dist/index.d.ts`)
- `closeOnSelect` now closes the menu on pick, also in multi select when set to `true` (#9, #11)
- `defaultValue` resolves when options load after mount (#12)
- Search no longer crashes on characters like `(`, `[` or `*`
- `onMenuClose` fires on Escape and only when an open menu closes
- Pressing Enter after pasting into the search no longer crashes
- No stray `undefined` / `false` class names
- Accessibility: combobox / listbox / option ARIA roles and states, groups as `role="group"` named by their title; name the combobox with `attr={{ 'aria-label': '...' }}` or `'aria-labelledby'`
- Keyboard: Arrow Up/Down, Home/End to move, Enter to pick, Backspace removes the last chip
- Disabled dropdown is no longer focusable or keyboard-openable
- Options and the down arrow are no longer Tab stops; chip delete and clear act on Enter/Space only
- The keyboard highlight is the `msl-option-focused` class, not `:focus`: move custom `.msl-option:focus` styles to it
- `customValue`: the chip and `onChange` get the typed text, not `Create "..."`; clicking Create adds it to Custom Values; double quotes are kept; created values survive the parent re-rendering with a new `options` array and `defaultValue` changes
- Falsy `options` show `emptyDataLabel`
- `onClear` event after the clear button (#10)
- `msl-limit-reached` class on the wrapper once `limit` is hit
- `'use client'` directive in the CJS / ESM bundles, so Next.js App Router Server Components can import it
- `value` prop for a controlled selection (`<MultiSelect value={v} onChange={setV} />`)
- `defaultValue` objects not in `options` (with `customValue`) keep their `value` string instead of the whole object, so `onChange` no longer gets `[object Object]` and the search no longer crashes

###### v-2.0.4

- CSS variables updated

###### v-2.0.1

- Provide component width in css vars intead of props
- Menu rise up at page bottom
- events added on menu open/close

###### v-2.0.0

- React component support as label
- Search feature improved
- Custom values grouped
- Single Select Bug fixed

<br>
<br>
<br>

### Sponsor

[<img src="https://www.bitcode.pro/wp-content/uploads/2019/09/final.svg_-3.png">](https://www.bitcode.pro/)

### License

MIT © [Arif-Un](https://github.com/arif-un) | [Amin](https://github.com/mdrubelamin2) | Built for Bit Form
