import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Avocado', value: 'avocado' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blackberry', value: 'blackberry' },
  { label: 'Blueberry', value: 'blueberry' }
]

export default function ControlledMenu() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')

  return (
    <>
      <div className='demo-row'>
        {/* opens the menu from outside, focus stays on the button. No close: a click out here closes it already */}
        <button onClick={() => setOpen(true)}>Open the menu</button>
        <MultiSelect
          options={options}
          placeholder='Type "b", pick a few'
          open={open}
          // the dropdown's own opens and closes only ask
          onMenuOpen={() => setOpen(true)}
          onMenuClose={() => setOpen(false)}
          search={search}
          onSearchChange={(text, why) => {
            setReason(why)
            // keep the search after a pick
            why !== 'pick' && setSearch(text)
          }}
        />
      </div>
      <p className='demo-output'>
        open: {String(open)}, search: {JSON.stringify(search)}, last reason:{' '}
        {reason || 'none'}
      </p>
    </>
  )
}
