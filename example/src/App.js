import React, { useState } from 'react'

import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const App = () => {
  //const [value, setvalue] = useState('option_1,option_3,s')
  //const [value, setvalue] = useState(['option_1', 'option_3', 's'])
  //const [value, setvalue] = useState(['s'])
  const [value, setvalue] = useState([{ label: 'Option 2', value: 'option_2' }, { label: 's', value: 's' },])
  //const [value, setvalue] = useState([{ label: 's', value: 's' },])

  const handleOnchange = val => {
    setvalue(val)
  }

  const options = [
    { label: 'Option 1', value: 'option_1' },
    { label: 'Option 2', value: 'option_2' },
    { label: 'Option 3', value: 'option_3' },
    { label: 'Option 4', value: 'option_4' },
    {
      title: 'group', type: 'group', emptyDataLabel: 'No Group Option Found', childs: [
        { label: 'Option 5', value: 'option_5' },
        { label: 'Option 6', value: 'option_6' }
      ]
    },
  ]

  const massOption = []
  for (let i = 0; i < 500; i++) {
    massOption.push({ label: `Option ${i}`, value: `Option ${i}` })
  }

 //  console.log(JSON.stringify(massOption))

  return (
    <div className="app">
      <div className="preview-values">
        <h4>Values</h4>
        {value.toString()}
      </div>
      <MultiSelect
        defaultValue={value}
        width={400}
        onChange={handleOnchange}
        options={options}
      // singleSelect
      />
    </div>
  )
}

export default App
