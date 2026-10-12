import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  {
    type: 'group',
    title: 'Berries',
    childs: [
      { label: 'Blueberry', value: 'blueberry' },
      { label: 'Raspberry', value: 'raspberry' },
      { label: 'Strawberry', value: 'strawberry' }
    ]
  },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragon fruit (out of season)', value: 'dragon', disabled: true },
  { label: 'Mango', value: 'mango' }
]

const flags = {
  singleSelect: false,
  customValue: false,
  disableChip: false,
  closeOnSelect: false,
  disableSearch: false,
  disabled: false,
  clearable: true,
  downArrow: true
}
type Flag = keyof typeof flags

// prop toggles, the matching JSX, and the value; a new key per change starts the dropdown fresh
export default function Playground() {
  const [props, setProps] = useState(flags)
  const [limit, setLimit] = useState(false)
  const [value, setValue] = useState('')
  const toggle = (name: Flag) => {
    setProps({ ...props, [name]: !props[name] })
    setValue('')
  }
  const changed = (Object.keys(flags) as Flag[]).filter(
    (name) => props[name] !== flags[name]
  )
  const jsx = [
    '<MultiSelect',
    '  options={options}',
    ...changed.map((name) => (props[name] ? `  ${name}` : `  ${name}={false}`)),
    ...(limit ? ['  limit={2}'] : []),
    '  onChange={setValue}',
    '/>'
  ].join('\n')

  return (
    <div className='playground'>
      <fieldset>
        <legend>Props</legend>
        {(Object.keys(flags) as Flag[]).map((name) => (
          <label key={name}>
            <input
              type='checkbox'
              checked={props[name]}
              onChange={() => toggle(name)}
            />
            {name}
          </label>
        ))}
        <label>
          <input
            type='checkbox'
            checked={limit}
            onChange={() => {
              setLimit(!limit)
              setValue('')
            }}
          />
          limit={'{2}'}
        </label>
      </fieldset>
      <div className='playground-stage'>
        <MultiSelect
          key={jsx}
          options={options}
          {...props}
          // unset by default (single select closes): only pass it when checked
          closeOnSelect={props.closeOnSelect || undefined}
          limit={limit ? 2 : null}
          onChange={setValue}
          attr={{ 'aria-label': 'Fruits' }}
        />
        <p className='demo-output'>value: "{value}"</p>
        <pre>{jsx}</pre>
      </div>
    </div>
  )
}
