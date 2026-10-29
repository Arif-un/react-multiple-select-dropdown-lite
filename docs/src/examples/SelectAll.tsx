import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  {
    type: 'group',
    title: 'Fruits',
    childs: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' }
    ]
  },
  {
    type: 'group',
    title: 'Vegetables',
    collapsible: true,
    childs: [
      { label: 'Carrot', value: 'carrot' },
      { label: 'Leek', value: 'leek' },
      { label: 'Pea', value: 'pea' }
    ],
    footer: 'In season: leek'
  }
]

export default function SelectAll() {
  return (
    <MultiSelect
      options={options}
      placeholder='Pick produce'
      // a first row that selects what the menu lists, then deselects it
      selectAll='Select all'
      // a checkbox per plain group, toggling its options. A collapsible group's title is an option, which screen
      // readers read as text: a count there instead
      renderGroupTitle={({ group, title, total, selected, toggle, icon }) =>
        group.collapsible ? (
          <>
            {title} ({selected}/{total}){icon}
          </>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <input
              type='checkbox'
              aria-label={`All of ${title}`}
              checked={selected === total}
              ref={(el) => {
                if (el) el.indeterminate = selected > 0 && selected < total
              }}
              onChange={toggle}
            />
            {title}
          </span>
        )
      }
    />
  )
}
