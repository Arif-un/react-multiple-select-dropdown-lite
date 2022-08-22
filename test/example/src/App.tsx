import { useState } from 'react'

import MultiSelect from '../../../src/MultiSelect'
import '../../../src/styles.css'

const App = () => {
  const [value, setvalue] = useState('rf,test,new')

  const handleOnchange = (val: any) => {
    setvalue(val)
  }

  const customStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  }

  const [options, setOptions] = useState({
    opt: [
      { label: <div style={customStyle}><h6>Title</h6><span role="img" aria-label="agun">🔥</span></div>, value: 'option_1', title: 'option_1' },
      { label: 'Option 2', value: '{id: 1}' },
      { label: 'Select...', value: 'option_3' },
      { label: 'Rf', value: 'option_4' },
      {
        title: 'group 1', type: 'group', emptyDataLabel: 'No Group Option Found', childs: [
          { label: 'Option 5', value: 'option_5' },
          { label: 'Option 6', value: 'option_6' },
          {
            title: 'group 2', type: 'group', emptyDataLabel: 'No Group Option Found', childs: [
              { label: 'Option 7', value: 'option_7' },
              { label: 'Option 8', value: 'option_8' },
              {
                title: 'group 3', type: 'group', emptyDataLabel: 'No Group Option Found', childs: [
                  { label: 'Option 9', value: 'option_9' },
                  { label: 'Option 10', value: 'option_10' }
                ]
              },
            ]
          },
        ]
      },
    ]
  })

  return (
    <div className="app">
      <button onClick={() => setOptions({ opt: [] })}>clear</button>
      <div className="preview-values">
        <h4>Values</h4>
        {value.toString()}
      </div>
      <MultiSelect
        defaultValue={value}
        width={400}
        onChange={handleOnchange}
        options={options.opt}
        customValue
        // singleSelect
        // clearable={false}
        // disableChip
        onMenuOpen={() => { console.log('menu open') }}
        onMenuClose={() => { console.log('menu Close') }}
      />
    </div>
  )
}

export default App
