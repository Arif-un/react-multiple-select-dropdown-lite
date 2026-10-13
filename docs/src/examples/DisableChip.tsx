import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => ({
  label: d,
  value: d.toLowerCase()
}))

// one label, or a count once more than one is picked
export default function DisableChip() {
  return (
    <MultiSelect
      disableChip
      chipAlternateText='days selected'
      options={options}
      defaultValue={['mon', 'wed', 'fri']}
    />
  )
}
