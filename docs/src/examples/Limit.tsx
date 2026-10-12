import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = ['Red', 'Green', 'Blue', 'Yellow', 'Purple'].map((c) => ({
  label: c,
  value: c.toLowerCase()
}))

// the wrapper gets the msl-limit-reached class once the limit is hit
export default function Limit() {
  return <MultiSelect options={options} limit={2} placeholder='Pick up to 2' />
}
