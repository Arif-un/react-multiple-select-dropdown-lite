import React, { useState } from 'react'

import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const App = () => {
  const [value, setvalue] = useState('')

  const handleOnchange = val => {
    setvalue(val)
  }

  const options = [
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
    { label: 'Option 3', value: 'option_3' },
    { label: 'Option 4', value: 'option_4' },
  ]

  return (
    <div className="app">
      <div className="preview-values">
        <h4>Values</h4>
        {value}
      </div>
      <MultiSelect
        onChange={handleOnchange}
        options={options}
      />
    </div>
  )
}

export default App
