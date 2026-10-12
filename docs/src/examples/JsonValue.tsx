import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectOption } from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

// extra fields ride along and come back in onChange
const options = [
  { label: 'Ada Lovelace', value: 'ada', email: 'ada@example.com' },
  { label: 'Grace Hopper', value: 'grace', email: 'grace@example.com' },
  { label: 'Alan Turing', value: 'alan', email: 'alan@example.com' }
]

export default function JsonValue() {
  const [people, setPeople] = useState<MultiSelectOption[]>([])

  return (
    <>
      <MultiSelect
        jsonValue
        options={options}
        onChange={(value: MultiSelectOption[]) => setPeople(value)}
        placeholder='Invite people'
      />
      <p className='demo-output'>
        {JSON.stringify(people.map(({ value, email }) => ({ value, email })))}
      </p>
    </>
  )
}
