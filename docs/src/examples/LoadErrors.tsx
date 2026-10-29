import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' }
]

let calls = 0

export default function LoadErrors() {
  return (
    <MultiSelect
      // fails every other time
      loadOptions={async () => {
        await new Promise((r) => setTimeout(r, 500))
        if (++calls % 2) throw new Error('Server down')
        return fruits
      }}
      loadingLabel='Picking fruit...'
      errorLabel='The server is down. Click to try again'
      placeholder='Fruits'
    />
  )
}
