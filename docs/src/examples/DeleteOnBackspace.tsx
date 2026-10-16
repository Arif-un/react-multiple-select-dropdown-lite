import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = ['Design', 'Frontend', 'Backend', 'DevOps'].map((t) => ({
  label: t,
  value: t.toLowerCase()
}))

// Backspace only edits the search text: chips go through their × button
export default function DeleteOnBackspace() {
  return (
    <MultiSelect
      deleteOnBackspace={false}
      options={options}
      defaultValue={['design', 'frontend']}
    />
  )
}
