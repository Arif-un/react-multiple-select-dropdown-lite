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

// a JSX label needs a `title`: search and chips use it
const options = [
  {
    label: <Status color='#22c55e' text='Online' />,
    title: 'Online',
    value: 'online'
  },
  {
    label: <Status color='#f59e0b' text='Away' />,
    title: 'Away',
    value: 'away'
  },
  {
    label: <Status color='#ef4444' text='Busy' />,
    title: 'Busy',
    value: 'busy'
  }
]

export default function JsxLabels() {
  return <MultiSelect options={options} placeholder='Status' />
}
