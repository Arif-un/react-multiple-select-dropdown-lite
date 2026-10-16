import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = Array.from({ length: 5000 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: `item-${i + 1}`
}))

// options render only while the menu is open
export default function LargeData() {
  return <MultiSelect options={options} placeholder='5000 items' />
}
