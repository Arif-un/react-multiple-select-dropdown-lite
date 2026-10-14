import MultiSelect from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'

const Status = ({ color, text }: { color: string; text: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span
      style={{ width: 10, height: 10, borderRadius: '50%', background: color }}
    />
    {text}
  </span>
)

// `label` stays text for search; getLabel decides what shows
const options = [
  { label: 'Online', value: 'online', color: '#22c55e' },
  { label: 'Away', value: 'away', color: '#f59e0b' },
  { label: 'Busy', value: 'busy', color: '#ef4444' }
]

export default function JsxLabels() {
  return (
    <MultiSelect
      options={options}
      getLabel={(opt) => <Status color={opt.color} text={opt.label} />}
      placeholder='Status'
    />
  )
}
