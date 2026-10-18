import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  {
    type: 'group',
    title: 'Fruits',
    collapsible: true,
    childs: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' }
    ]
  },
  {
    type: 'submenu',
    title: 'Vegetables',
    childs: [
      { label: 'Carrot', value: 'carrot' },
      { label: 'Pepper', value: 'pepper' }
    ]
  }
]

export default function GroupTitles() {
  return (
    <MultiSelect
      options={options}
      defaultValue={['apple', 'carrot']}
      // the icon last, where the stylesheet holds it at the end of the row
      renderGroupTitle={({ title, total, selected, icon }) => (
        <>
          {title}
          <span>
            {selected}/{total}
          </span>
          {icon}
        </>
      )}
    />
  )
}
