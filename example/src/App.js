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
    {
      title: 'group', type: 'group', childs: [
        { label: 'Option 5', value: 'option_5' },
        { label: 'Option 6', value: 'option_6' },
      ]
    },
  ]

  return (
    <div className="app">
      <div className="preview-values">
        <h4>Values</h4>
        {value}
      </div>
      <MultiSelect
        // defaultValue={[{ label: 'Option 3', value: 'option_3' },{ label: 'Option 4', value: 'option_4' }]}
        // defaultValue={['option_3', 'option_4']}
        defaultValue={'option_3,option_4'}
        width={400}
        onChange={handleOnchange}
        options={options}
      />
    </div>
  )
}

export default App
