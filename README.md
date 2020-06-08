## React Multiple Select Dropdown Lite
A lightweight Multiple/Single Select component for react using React-Hooks
production minified 4.6 kb , gzipped 1.6 kb [Bundlephobia](https://bundlephobia.com/result?p=react-multiple-select-dropdown-lite@1.0.0)

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

### Options
|Props| type | default | description
|-----|------| ------- | ----------|
| width | int | 300 | Specify width in px
| options| array |  | pass options as array of object <br> example: <br> `[ { label : 'Option 1', value : 'opt_1' } ]`
|onChange | function | |Return value on input change
| defaultValue | string \| array of object |  | specify default value
|jsonValue | bool | false | get value from input as json
|singleSelect | bool | false | allow one select only
|downArrowIcon| string \| icon \| component | Icon | Specify custom down arrow icon
|clearable | bool | true | show / hide close icon to clear value
downArrow |bool | true|  show / hide down icon in dropdown
| className | string \| object | | specify custom class
|placeholder | string | Select... | Input Placeholder
|disableChip | bool | false | disable multiple select chips show value or total selected value only   

### Sponsor

[<img src="https://www.bitcode.pro/wp-content/uploads/2019/09/final.svg_-3.png">](https://www.bitcode.pro/)


### License
MIT © [Arif-Un]([https://github.com/arif-un](https://github.com/arif-un)) | Build for Bit Form

