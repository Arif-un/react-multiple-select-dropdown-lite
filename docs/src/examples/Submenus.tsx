import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Anywhere', value: 'any' },
  {
    type: 'submenu',
    title: 'Europe',
    childs: [
      { label: 'Berlin', value: 'berlin' },
      { label: 'Lisbon', value: 'lisbon' },
      {
        type: 'submenu',
        title: 'Nordics',
        childs: [
          { label: 'Oslo', value: 'oslo' },
          { label: 'Stockholm', value: 'stockholm' }
        ]
      }
    ]
  },
  {
    type: 'submenu',
    title: 'Asia',
    childs: [
      { label: 'Dhaka', value: 'dhaka' },
      { label: 'Tokyo', value: 'tokyo' }
    ]
  }
]

export default function Submenus() {
  return <MultiSelect options={options} placeholder='Offices' />
}
