## React Multiple Select Dropdown Lite
A lightweight Multiple/Single Select Pure functional component for react using React-Hooks.

Production minified 4.6 kb , gzipped 1.6 kb [Bundlephobia](https://bundlephobia.com/result?p=react-multiple-select-dropdown-lite@1.0.0)

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
- [ ] Searchable <br>
- [ ] Group <br>
- [ ] Sublist <br>
- [ ] Custom Creatable Value <br>
- [ ] Themeable (using css var) <br>

## Props Options
|Props| type | default | description
|-----|------| ------- | ----------|
| options| array | ""  | pass options as array of object <br> `label` : (string) Options Label <br> `value` : Option value <br> `style` : (object) custom style <br> `classes` : (string) style classes <br> <br> example: <br> `[ { label : "Option 1", value : "opt_1", style: {textAlign: 'center'}, classes: "classA classB" } ]`
|onChange | function | |Return value on input change
| width | int | 300 | Specify width in px
|name| string | '' | specify a name for form
|disabled | bool | false | disable input
| defaultValue | string \| array of object \| string array | '' | specify default value
|jsonValue | bool | false | get value from input as json
|singleSelect | bool | false | allow one select only
|downArrowIcon| string \| icon \| component | Icon | Specify custom down arrow icon
|clearable | bool | true | show / hide close icon to clear value
downArrow |bool | true|  show / hide down icon in dropdown
| className | string \| object | | specify custom class
|placeholder | string | Select... | Input Placeholder
|disableChip | bool | false | disable multiple select chips show value or total selected value only 
|attr | object | |set custom attr to element  

<br>
<br>
<br>

### Sponsor

[<img src="https://www.bitcode.pro/wp-content/uploads/2019/09/final.svg_-3.png">](https://www.bitcode.pro/)


### License
MIT © [Arif-Un]([https://github.com/arif-un](https://github.com/arif-un)) | Build for Bit Form

