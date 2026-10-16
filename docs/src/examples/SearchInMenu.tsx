import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'JavaScript', value: 'js' },
  { label: 'TypeScript', value: 'ts' },
  { label: 'Python', value: 'py' },
  { label: 'Rust', value: 'rs' },
  { label: 'Go', value: 'go' }
]

// the closed control shows only the values; the search field opens with the menu
export default function SearchInMenu() {
  return (
    <div className='demo-row'>
      <MultiSelect
        searchInMenu
        options={options}
        defaultValue={['js', 'ts']}
        searchPlaceholder='Search languages'
      />
      <MultiSelect
        searchInMenu
        singleSelect
        options={options}
        defaultValue={['rs']}
      />
    </div>
  )
}
