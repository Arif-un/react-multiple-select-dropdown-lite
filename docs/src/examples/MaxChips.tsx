import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  'Amsterdam',
  'Berlin',
  'Lisbon',
  'Madrid',
  'Paris',
  'Prague',
  'Rome',
  'Vienna'
].map((city) => ({ label: city, value: city.toLowerCase() }))

export default function MaxChips() {
  return (
    <MultiSelect
      options={options}
      defaultValue={['berlin', 'lisbon', 'paris', 'rome', 'vienna']}
      // chips for the first two values, then one for the rest
      maxChips={2}
      moreChipsLabel={(n) => `and ${n} more`}
    />
  )
}
