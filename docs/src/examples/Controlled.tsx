import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Read', value: 'read' },
  { label: 'Write', value: 'write' },
  { label: 'Delete', value: 'delete' },
  { label: 'Admin', value: 'admin' }
]

export default function Controlled() {
  const [value, setValue] = useState(['read'])

  return (
    <>
      <div className='demo-row'>
        <MultiSelect options={options} value={value} onChange={setValue} />
        <button onClick={() => setValue(options.map((o) => o.value))}>
          Select all
        </button>
        <button onClick={() => setValue(['read'])}>Reset</button>
      </div>
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
