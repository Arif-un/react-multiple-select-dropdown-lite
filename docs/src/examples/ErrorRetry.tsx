import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchPeople } from './fakeApi'

let calls = 0

export default function ErrorRetry() {
  return (
    <MultiSelect
      // every other page fails: the pages before it stay
      loadOptions={async ({ search, next = 1, signal }) => {
        const { people, hasMore } = await fetchPeople(search, next, signal)
        if (++calls % 2) throw new Error(`503: page ${next} timed out`)
        return { options: people, next: hasMore && next + 1 }
      }}
      getLabel={(person) => person.name}
      getValue={(person) => person.id}
      // the server's message, and a button of your own
      errorLabel={(error, retry) => (
        <>
          {error instanceof Error ? error.message : 'Failed to load'}{' '}
          <button onClick={retry}>Retry</button>
        </>
      )}
      placeholder='People'
    />
  )
}
