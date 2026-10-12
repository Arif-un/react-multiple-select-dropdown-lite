import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Anywhere', value: 'any' },
  {
    type: 'group',
    title: 'Europe',
    childs: [
      { label: 'Berlin', value: 'berlin' },
      { label: 'Lisbon', value: 'lisbon' },
      {
        type: 'group',
        title: 'Nordics',
        childs: [
          { label: 'Oslo', value: 'oslo' },
          { label: 'Stockholm', value: 'stockholm' }
        ]
      }
    ]
  },
  {
    type: 'group',
    title: 'Asia',
    childs: [
      { label: 'Dhaka', value: 'dhaka' },
      { label: 'Tokyo', value: 'tokyo' }
    ]
  },
  {
    type: 'group',
    title: 'Antarctica',
    emptyDataLabel: 'No offices yet',
    childs: []
  }
]

export default function Groups() {
  return <MultiSelect options={options} placeholder='Offices' />
}
