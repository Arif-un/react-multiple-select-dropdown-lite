import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import './LoadingSpinner.css'
import { fetchPeople } from './fakeApi'

export default function LoadingSpinner() {
  const [key, setKey] = useState(0)
  return (
    <div className='demo-row'>
      <MultiSelect
        className='spinner'
        loadOptions={async ({ search, next = 1, signal }) => {
          // a slow server, to watch the spinner
          await new Promise((r) => setTimeout(r, 1500))
          signal.throwIfAborted()
          const { people, hasMore } = await fetchPeople(search, next, signal)
          return { options: people, next: hasMore && next + 1 }
        }}
        getLabel={(person) => person.name}
        getValue={(person) => person.id}
        // loads on mount, and again with each loadKey: the menu closed, the arrow spins
        preload
        loadKey={key}
        placeholder='People'
      />
      <button onClick={() => setKey(key + 1)}>Load again</button>
    </div>
  )
}
