import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const options = [
  'Argentina',
  'Australia',
  'Austria',
  'Brazil',
  'Canada',
  'Germany',
  'Netherlands',
  'New Zealand'
].map((name) => ({ label: name, value: name.toLowerCase() }))

// the search match in <mark>
const highlight = (text: string, search: string) => {
  const i = search ? text.toLowerCase().indexOf(search.toLowerCase()) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + search.length)}</mark>
      {text.slice(i + search.length)}
    </>
  )
}

export default function LabelMeta() {
  return (
    <MultiSelect
      options={options}
      placeholder='Type "an"'
      getLabel={(opt, { context, search, selected }) =>
        // chips and the single value: plain text
        context === 'value' ? (
          opt.label
        ) : (
          // menu rows: a checkmark once selected, the match marked
          <>
            {selected ? '✓ ' : ''}
            {highlight(opt.label, search)}
          </>
        )
      }
    />
  )
}
