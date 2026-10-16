import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Alpha', value: 'a' },
  { label: 'Beta', value: 'b' }
]

export default function Disabled() {
  return <MultiSelect disabled options={options} defaultValue={['a', 'b']} />
}
