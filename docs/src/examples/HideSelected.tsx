import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  {
    type: 'group',
    title: 'Frontend',
    childs: [
      { label: 'React', value: 'react' },
      { label: 'Vue', value: 'vue' }
    ]
  },
  {
    type: 'group',
    title: 'Backend',
    childs: [
      { label: 'Django', value: 'django' },
      { label: 'Express', value: 'express' },
      { label: 'Rails', value: 'rails' }
    ]
  }
]

export default function HideSelected() {
  return (
    <MultiSelect
      options={options}
      placeholder='Pick both of Frontend'
      // picked options leave the menu; a group with none left goes too
      hideSelected
      closeOnSelect={false}
      emptyDataLabel='All picked'
    />
  )
}
