import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
// the react-window list above
import { VirtualList } from './VirtualList'

// 100 collapsed groups, each 100 options and a submenu of 900 more
const options = Array.from({ length: 100 }, (_, g) => ({
  type: 'group',
  title: `Group ${g + 1}`,
  collapsible: true,
  collapsed: true,
  childs: [
    {
      type: 'submenu',
      title: `More in group ${g + 1}`,
      childs: Array.from({ length: 900 }, (_, i) => ({
        label: `Item ${g + 1}.${i + 101}`,
        value: `${g + 1}.${i + 101}`
      }))
    },
    ...Array.from({ length: 100 }, (_, i) => ({
      label: `Item ${g + 1}.${i + 1}`,
      value: `${g + 1}.${i + 1}`
    }))
  ]
}))

export default function VirtualGroups() {
  return (
    <MultiSelect
      options={options}
      placeholder='100,000 items in groups'
      renderList={(list) => <VirtualList {...list} />}
    />
  )
}
