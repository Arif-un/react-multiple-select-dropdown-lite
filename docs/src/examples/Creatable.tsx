import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'react', value: 'react' },
  { label: 'typescript', value: 'typescript' },
  { label: 'css', value: 'css' }
]

export default function Creatable() {
  const [value, setValue] = useState(['react'])

  return (
    <>
      <MultiSelect
        customValue
        options={options}
        defaultValue={['react']}
        onChange={setValue}
        placeholder='Type a tag, then Enter or comma'
      />
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
