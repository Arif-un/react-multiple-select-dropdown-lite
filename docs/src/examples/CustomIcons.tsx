import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'North', value: 'n' },
  { label: 'South', value: 's' },
  { label: 'East', value: 'e' },
  { label: 'West', value: 'w' }
]

export default function CustomIcons() {
  return (
    <MultiSelect
      options={options}
      defaultValue={['n']}
      downArrowIcon={<span aria-hidden>🔽</span>}
      closeIcon={<span aria-hidden>✕</span>}
    />
  )
}
