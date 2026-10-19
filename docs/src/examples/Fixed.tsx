import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'You (owner)', value: 'you', fixed: true },
  { label: 'Ada', value: 'ada' },
  { label: 'Grace', value: 'grace' },
  { label: 'Linus', value: 'linus' }
]

// the owner's chip has no ×, and Backspace and the clear button leave it
export default function Fixed() {
  return <MultiSelect options={options} defaultValue={['you', 'ada']} />
}
