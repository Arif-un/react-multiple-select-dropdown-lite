import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectOption } from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

// extra fields ride along and come back in onChange's second argument
const options = [
  { label: 'Ada Lovelace', value: 'ada', email: 'ada@example.com' },
  { label: 'Grace Hopper', value: 'grace', email: 'grace@example.com' },
  { label: 'Alan Turing', value: 'alan', email: 'alan@example.com' }
]

export default function OptionObjects() {
  const [people, setPeople] = useState<MultiSelectOption[]>([])

  return (
    <>
      <MultiSelect
        options={options}
        onChange={(_values, selected) => setPeople(selected)}
        placeholder='Invite people'
      />
      <p className='demo-output'>
        {JSON.stringify(people.map(({ value, email }) => ({ value, email })))}
      </p>
    </>
  )
}
