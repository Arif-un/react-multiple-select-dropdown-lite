import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'North', value: 'n' },
  { label: 'South', value: 's' },
  {
    type: 'group',
    title: 'Diagonals',
    collapsible: true,
    childs: [
      { label: 'North East', value: 'ne' },
      { label: 'South West', value: 'sw' }
    ]
  },
  {
    type: 'submenu',
    title: 'More',
    childs: [
      { label: 'East', value: 'e' },
      { label: 'West', value: 'w' }
    ]
  }
]

export default function CustomIcons() {
  return (
    <MultiSelect
      options={options}
      defaultValue={['n']}
      downArrowIcon={<span aria-hidden>🔽</span>}
      closeIcon={<span aria-hidden>✕</span>}
      // drawn pointing right: the stylesheet turns the group's down while it is open
      groupIcon='▸'
      submenuIcon='→'
    />
  )
}
