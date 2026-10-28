import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchPeople } from './fakeApi'

type Person = { id: string; name: string }

// the selected people, as an edit form gets them with its record: they name the values before any load
const selected: Person[] = [{ id: '1', name: 'Ada Lovelace' }]

export default function AsyncOptions() {
  const [value, setValue] = useState(['1'])
  return (
    <>
      <MultiSelect
        options={selected}
        loadOptions={async ({ search, next = 1, signal }) => {
          // wait for typing to pause: the next search aborts the signal
          if (search) {
            await new Promise((r) => setTimeout(r, 250))
            signal.throwIfAborted()
          }
          const { people, hasMore } = await fetchPeople(search, next, signal)
          return { options: people, next: hasMore && next + 1 }
        }}
        getLabel={(person) => person.name}
        getValue={(person) => person.id}
        value={value}
        onChange={setValue}
        placeholder='People'
      />
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
