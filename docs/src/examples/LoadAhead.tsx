import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchPeople } from './fakeApi'

export default function LoadAhead() {
  return (
    <MultiSelect
      loadOptions={async ({ search, next = 1, signal }) => {
        const { people, hasMore } = await fetchPeople(search, next, signal)
        return { options: people, next: hasMore && next + 1 }
      }}
      getLabel={(person) => person.name}
      getValue={(person) => person.id}
      // the first page loads as the pointer comes over, or focus arrives: the menu opens on it
      preload='intent'
      // the next page loads 300px before the end comes into view
      loadAhead={300}
      placeholder='People'
    />
  )
}
