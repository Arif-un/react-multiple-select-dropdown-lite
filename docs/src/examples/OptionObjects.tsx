import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

// straight from an API: no mapping to { label, value }
const users = [
  { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'u2', name: 'Grace Hopper', email: 'grace@example.com' },
  { id: 'u3', name: 'Alan Turing', email: 'alan@example.com' }
]

export default function OptionObjects() {
  const [people, setPeople] = useState<typeof users>([])

  return (
    <>
      <MultiSelect
        options={users}
        getLabel={(user) => user.name}
        getValue={(user) => user.id}
        onChange={(_ids, selected) => setPeople(selected)}
        placeholder='Invite people'
      />
      <p className='demo-output'>
        {JSON.stringify(people.map(({ id, email }) => ({ id, email })))}
      </p>
    </>
  )
}
