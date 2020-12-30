## React Multiple Select Dropdown Lite
A lightweight Multiple/Single Select Pure functional component for react using React-Hooks.

<p align="center">
  <a href="https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="React Multiple Select Dropdown Lite is released under the MIT license." />
  </a>
  <a href="https://www.npmjs.com/package/react-multiple-select-dropdown-lite">
    <img alt="npm" src="https://img.shields.io/npm/v/react-multiple-select-dropdown-lite">
  </a>
  <a href="https://bundlephobia.com/result?p=react-multiple-select-dropdown-lite@2.0.4">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/min/react-multiple-select-dropdown-lite">
  </a>
  <a href="https://bundlephobia.com/result?p=react-multiple-select-dropdown-lite@2.0.4">
    <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/react-multiple-select-dropdown-lite">
  </a>
  <a href="https://github.com/Arif-un/react-multiple-select-dropdown-lite/pulls">
    <img alt="npm bundle size" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg">
  </a>
</p>

### Screenshot
![react-multiple-select-dropdown-menu](https://github.com/Arif-un/react-multiple-select-dropdown-lite/blob/master/screenshoot/react%20multiple%20select%20dropdown%20menu%20,%20lightweight,%20react%20hooks.gif?raw=true)

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
|Props| type | default | description
|-----|------| ------- | ----------|
| options| array | ""  | pass options as array of object <br> `label` : (string or JSX) Options Label <br> `value` : Option value <br> `style` : (object) custom style <br> `classes` : (string) style classes <br>`title` : must be provide for JSX label <br> <br> example: <br> `[ { label : "Option 1", value : "opt_1", style: {textAlign: 'center'}, classes: "classA classB" } ]`
| width |  |  | move in css var (version 2.0.1)
|name| string | '' | specify a name for form
|disabled | bool | false | disable input
| defaultValue | string \| array of object \| string array | '' | specify default value
|jsonValue | bool | false | get value from input as json
|singleSelect | bool | false | allow one select only
|downArrowIcon| string \| icon \| component | SVG | Specify custom down arrow icon
|closeIcon |string \| icon \| component  | SVG | Specify custom close arrow icon
|clearable | bool | true | show / hide close icon to clear value
downArrow |bool | true|  show / hide down icon in dropdown
| className | string \| object | | specify custom class
|placeholder | string | Select... | Input Placeholder
|disableChip | bool | false | disable multiple select chips show value or total selected value only 
|attr | object | |set custom attr to element  
|customValue | bool | false |create custom options by pressing enter or comma (,)
|largeData | bool | false |prevent slow down (DOM) for large amount of data
|chipAlternateText| string| (number) Item Selected | Show text when chip disabled.
|closeOnSelect| bool | true | close option-menu on select option

<br>

### Events

|Props|Params|Description
|-----|------|------------
|onChange|values| Trigger on change any value
|onMenuOpen|null| Trigger when menu open
|onMenuClose|null| Trigger when menu close

### CSS Variables
CSS variable applied in `.msl-vars` class name.
|Variable|Default  Value| Details
|----------|--------------|-----------
|--menu-max-height| 400px| Dropdown menu <br> maximum height.
|--input-width| 300px| Dropdown input width.
|--font-size| 16px| Dropdown font size.
|--border-radius| 8px 8px 8px 8px| Dropdown Border Radius.
|--active-menu-shadow| 1px 1px 5px 0px gray| Menu Shadow <br>  when active.
|--line-height| 1.4| fonts line height.
|--active-menu-background| white| Dropdown menu <br>  background color when active.
|--active-menu-radius| var(--border-radius)| Dropdown menu border <br>  radius when active.

<br>

### Change Log
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

