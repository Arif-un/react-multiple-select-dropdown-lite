import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import './Theming.css'

const options = [
  { label: 'Midnight', value: 'midnight' },
  { label: 'Ocean', value: 'ocean' },
  { label: 'Forest', value: 'forest' },
  { label: 'Sunset', value: 'sunset' }
]

export default function Theming() {
  return (
    <MultiSelect
      className='dark-msl'
      options={options}
      defaultValue={['ocean']}
      placeholder='Theme'
    />
  )
}
