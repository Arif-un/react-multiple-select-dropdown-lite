import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Mango', value: 'mango' },
  { label: 'Orange', value: 'orange' }
]

export default function Basic() {
  const [value, setValue] = useState<string[]>([])

  return (
    <>
      <MultiSelect options={options} onChange={setValue} />
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
