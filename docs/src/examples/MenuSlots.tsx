import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const languages = [
  'Go',
  'Haskell',
  'JavaScript',
  'Kotlin',
  'Python',
  'Rust',
  'Swift',
  'TypeScript'
].map((name) => ({ label: name, value: name.toLowerCase() }))

const more = ['Elixir', 'OCaml', 'Zig']

const bar = { display: 'flex', gap: 8, alignItems: 'center', padding: 8 }

export default function MenuSlots() {
  const [options, setOptions] = useState(languages)
  const next = more[options.length - languages.length]

  return (
    <MultiSelect
      options={options}
      placeholder='Languages'
      searchInMenu
      // buttons and a count on what the menu lists: a search's results only
      menuHeader={({ search, options, selected, selectAll, deselectAll }) => (
        <div style={bar}>
          <button onClick={selectAll}>
            Select {search ? 'results' : 'all'}
          </button>
          <button onClick={deselectAll}>Clear</button>
          <span style={{ marginInlineStart: 'auto' }}>
            {selected} of {options.length}
          </span>
        </div>
      )}
      // its clicks keep the menu open
      menuFooter={
        next && (
          <div style={bar}>
            <button
              onClick={() =>
                setOptions([...options, { label: next, value: next }])
              }
            >
              Add {next}
            </button>
          </div>
        )
      }
    />
  )
}
