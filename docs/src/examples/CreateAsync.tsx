import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

type Person = { id: string; email: string }

const people: Person[] = [
  { id: '1', email: 'ada@example.com' },
  { id: '2', email: 'grace@example.com' }
]

const isEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)

// a pretend POST /people: slow, and failing for addresses at fail.com
const createPerson = (email: string) =>
  new Promise<Person>((resolve, reject) =>
    setTimeout(
      () =>
        email.endsWith('@fail.com')
          ? reject(new Error('Server error'))
          : resolve({ id: crypto.randomUUID(), email }),
      1000
    )
  )

export default function CreateAsync() {
  const [value, setValue] = useState<string[]>([])

  return (
    <>
      <MultiSelect
        options={people}
        getLabel={(p) => p.email}
        getValue={(p) => p.id}
        placeholder='Type or paste emails'
        customValue
        // emails only: no Create row for anything else
        canCreate={isEmail}
        // the server makes the person, of your own shape
        onCreate={createPerson}
        loadingLabel='Saving…'
        errorLabel='Could not save. Click to retry'
        onChange={setValue}
      />
      <p className='demo-output'>value: {JSON.stringify(value)}</p>
    </>
  )
}
