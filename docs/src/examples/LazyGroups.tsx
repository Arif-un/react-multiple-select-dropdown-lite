import MultiSelect from 'react-multiple-select-dropdown-lite'
import type { MultiSelectGroup } from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchCities, fetchCountries, people } from './fakeApi'

const options = [
  { label: 'Remote', value: 'remote' },
  ...['Europe', 'Asia', 'Americas'].map((region): MultiSelectGroup => ({
    type: 'submenu',
    title: region,
    // loads as the submenu first opens
    childs: async ({ signal }) =>
      (await fetchCountries(region, signal)).map(
        (country): MultiSelectGroup => ({
          type: 'submenu',
          title: country,
          // its cities, 10 at a time as you scroll
          childs: async ({ next = 1, signal }) => {
            const { cities, hasMore } = await fetchCities(country, next, signal)
            return {
              options: cities.map((city) => ({ label: city, value: city })),
              next: hasMore && next + 1
            }
          }
        })
      )
  })),
  {
    type: 'group',
    title: 'Teammates',
    collapsible: true,
    collapsed: true,
    // loads as the group first opens
    childs: async () =>
      people.slice(0, 5).map((p) => ({ label: p.name, value: p.id }))
  }
]

export default function LazyGroups() {
  return <MultiSelect options={options} placeholder='Where' />
}
