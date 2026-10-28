import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import { fetchCities } from './fakeApi'

const countries = ['Bangladesh', 'Japan', 'Norway', 'Portugal'].map((c) => ({
  label: c,
  value: c
}))

export default function DependentSelects() {
  const [country, setCountry] = useState('Japan')
  const [cities, setCities] = useState<string[]>([])
  return (
    <>
      <div className='demo-row'>
        <MultiSelect
          singleSelect
          options={countries}
          value={[country]}
          // the cities picked are in the country before: clear them
          onChange={([c = '']) => {
            setCountry(c)
            setCities([])
          }}
          placeholder='Country'
        />
        <MultiSelect
          // another country loads its cities afresh
          loadKey={country}
          loadOptions={async ({ search, next = 1, signal }) => {
            const r = await fetchCities(country, next, signal, 10, search)
            return {
              options: r.cities.map((c) => ({ label: c, value: c })),
              next: r.hasMore && next + 1
            }
          }}
          value={cities}
          onChange={setCities}
          disabled={!country}
          placeholder='Cities'
        />
      </div>
      <p className='demo-output'>
        value: {JSON.stringify({ country, cities })}
      </p>
    </>
  )
}
