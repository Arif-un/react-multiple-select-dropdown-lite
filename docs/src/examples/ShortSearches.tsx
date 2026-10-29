import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchPeople } from './fakeApi'

export default function ShortSearches() {
  return (
    <MultiSelect
      loadOptions={async ({ search, next = 1, signal }) => {
        // nothing to search for yet: no request
        if (search.length < 2) return []
        const { people, hasMore } = await fetchPeople(search, next, signal)
        return { options: people, next: hasMore && next + 1 }
      }}
      getLabel={(person) => person.name}
      getValue={(person) => person.id}
      emptyDataLabel={(search) =>
        search.length < 2 ? 'Type 2 letters' : `No one called "${search}"`
      }
      placeholder='Search people'
    />
  )
}
