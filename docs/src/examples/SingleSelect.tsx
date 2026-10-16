import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Small', value: 's' },
  { label: 'Medium', value: 'm' },
  { label: 'Large', value: 'l' },
  { label: 'Extra large (sold out)', value: 'xl', disabled: true }
]

export default function SingleSelect() {
  const [value, setValue] = useState(['m'])

  return (
    <>
      <MultiSelect
        singleSelect
        options={options}
        defaultValue={['m']}
        onChange={setValue}
        placeholder='Pick a size'
      />
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
