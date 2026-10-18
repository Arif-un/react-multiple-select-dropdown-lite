import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type {
  MultiSelectOption,
  MultiSelectProps
} from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import './Animated.css'
import { TanstackList, options as tree } from './TanstackVirtual'
import './Theming.css'
import { VirtualList } from './VirtualList'

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragon fruit (out of season)', value: 'dragon', disabled: true },
  { label: 'Mango', value: 'mango' },
  { label: 'Orange', value: 'orange' }
]

const groups = [
  { label: 'Apple', value: 'apple' },
  {
    type: 'group',
    title: 'Berries',
    childs: [
      { label: 'Blueberry', value: 'blueberry' },
      { label: 'Raspberry', value: 'raspberry' },
      {
        type: 'group',
        title: 'Wild',
        childs: [{ label: 'Cloudberry', value: 'cloudberry' }]
      }
    ]
  },
  {
    type: 'group',
    title: 'Citrus',
    collapsible: true,
    childs: [
      { label: 'Lemon', value: 'lemon' },
      { label: 'Lime', value: 'lime' }
    ]
  },
  {
    type: 'group',
    title: 'Exotic',
    childs: [],
    emptyDataLabel: 'Out of season'
  }
]

const submenus = [
  { label: 'Apple', value: 'apple' },
  {
    type: 'submenu',
    title: 'Vegetables',
    childs: [
      { label: 'Carrot', value: 'carrot' },
      {
        type: 'submenu',
        title: 'Leafy greens',
        childs: [
          { label: 'Kale', value: 'kale' },
          { label: 'Spinach', value: 'spinach' }
        ]
      },
      { label: 'Potato', value: 'potato' }
    ]
  },
  {
    type: 'submenu',
    title: 'Nuts',
    childs: [
      { label: 'Almond', value: 'almond' },
      { label: 'Cashew', value: 'cashew' }
    ]
  }
]

const users = [
  { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 'u2', name: 'Grace Hopper', email: 'grace@example.com' },
  { id: 'u3', name: 'Alan Turing', email: 'alan@example.com' },
  { id: 'u4', name: 'Katherine Johnson', email: 'katherine@example.com' }
]

const statuses = [
  { label: 'Online', value: 'online', color: '#22c55e' },
  { label: 'Away', value: 'away', color: '#f59e0b' },
  { label: 'Busy', value: 'busy', color: '#ef4444' }
]

const items = Array.from({ length: 5000 }, (_, i) => ({
  label: `Item ${i + 1}`,
  value: `item-${i + 1}`
}))

const Status = ({ color, text }: { color: string; text: string }) => (
  <span className='pg-status'>
    <span style={{ background: color }} />
    {text}
  </span>
)

// each option set: what it passes, and the JSX lines that say so
const sets: Record<
  string,
  {
    label: string
    options: MultiSelectOption[]
    defaultValue: string[]
    props?: Partial<MultiSelectProps>
    code?: string[]
  }
> = {
  fruits: {
    label: 'Flat, one disabled',
    options: fruits,
    defaultValue: ['apple', 'banana']
  },
  groups: {
    label: 'Nested and collapsible groups',
    options: groups as MultiSelectOption[],
    defaultValue: ['blueberry']
  },
  submenus: {
    label: 'Nested submenus',
    options: submenus as MultiSelectOption[],
    defaultValue: ['kale']
  },
  tree: {
    label: 'Mixed tree (11,000 options)',
    options: tree as MultiSelectOption[],
    defaultValue: ['kale']
  },
  users: {
    label: 'Any shape (getLabel / getValue)',
    options: users as unknown as MultiSelectOption[],
    defaultValue: ['u1'],
    props: {
      getLabel: (user) => user.name,
      getValue: (user) => user.id,
      filterOption: (user, s) =>
        `${user.name} ${user.email}`.toLowerCase().includes(s.toLowerCase())
    },
    code: [
      'getLabel={(user) => user.name}',
      'getValue={(user) => user.id}',
      'filterOption={(user, s) =>',
      '  `${user.name} ${user.email}`.toLowerCase().includes(s.toLowerCase())',
      '}'
    ]
  },
  statuses: {
    label: 'JSX labels',
    options: statuses,
    defaultValue: ['online'],
    props: { getLabel: (opt) => <Status color={opt.color} text={opt.label} /> },
    code: ['getLabel={(opt) => <Status color={opt.color} text={opt.label} />}']
  },
  items: { label: '5,000 options', options: items, defaultValue: ['item-1'] }
}
type SetName = keyof typeof sets

// boolean props at their defaults: a changed one shows in the JSX
const flags = {
  singleSelect: false,
  searchInMenu: false,
  customValue: false,
  disableChip: false,
  disableSearch: false,
  deleteOnBackspace: true,
  clearable: true,
  downArrow: true,
  disabled: false
}
type Flag = keyof typeof flags

const texts = {
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
  chipAlternateText: 'Item Selected',
  emptyDataLabel: 'No Data Found',
  customValuesTitle: 'Custom Values',
  createLabel: 'Create "{text}"',
  clearLabel: 'Clear'
}
type Text = keyof typeof texts

// the recipes of the virtual lists page, named as there
const lists = { VirtualList, TanstackList }

const variants = {
  options: 'fruits' as SetName,
  value: 'onChange' as 'onChange' | 'defaultValue' | 'value',
  closeOnSelect: 'unset' as 'unset' | 'true' | 'false',
  limit: '',
  customChip: false,
  icons: false,
  theme: 'default' as 'default' | 'dark',
  animated: false,
  renderList: 'none' as 'none' | keyof typeof lists,
  events: false
}

const initial = { ...flags, ...texts, ...variants }
type State = typeof initial

// a JSX label (the statuses) names the button by its value
const chip: MultiSelectProps['customChip'] = ({
  label,
  value,
  disabled,
  onDelete
}) => (
  <span className='pg-chip'>
    {label}
    <button
      type='button'
      aria-label={`Remove ${typeof label == 'string' ? label : value}`}
      disabled={disabled}
      onClick={onDelete}
    >
      ×
    </button>
  </span>
)
const chipCode = [
  'customChip={({ label, value, disabled, onDelete }) => (',
  "  <span className='pg-chip'>",
  '    {label}',
  '    <button',
  "      type='button'",
  "      aria-label={`Remove ${typeof label == 'string' ? label : value}`}",
  '      disabled={disabled}',
  '      onClick={onDelete}',
  '    >',
  '      ×',
  '    </button>',
  '  </span>',
  ')}'
]

const quote = (text: string) =>
  text.includes("'") ? `{${JSON.stringify(text)}}` : `'${text}'`

// the selection each value mode starts with
const startValue = (s: State) =>
  s.value === 'onChange' ? [] : sets[s.options].defaultValue

// prop controls, the matching JSX, the value and the events; a new key per change starts the dropdown fresh
export default function Playground() {
  const [s, setS] = useState(initial)
  const [value, setValue] = useState<string[]>([])
  const [log, setLog] = useState<string[]>([])
  const set = sets[s.options]
  const List = s.renderList === 'none' ? undefined : lists[s.renderList]
  const className =
    [s.theme === 'dark' && 'dark-msl', s.animated && 'animated']
      .filter(Boolean)
      .join(' ') || undefined
  const update = (patch: Partial<State>) => {
    const next = { ...s, ...patch }
    setS(next)
    setValue(startValue(next))
  }
  const note = (event: string) => setLog((l) => [...l, event].slice(-5))

  // what each prop needs to show any effect
  const chips = !s.singleSelect && !s.disableChip
  const off: Partial<Record<keyof State, boolean>> = {
    searchPlaceholder: !s.searchInMenu || s.disableSearch,
    chipAlternateText: !s.disableChip || s.singleSelect,
    customValuesTitle: !s.customValue,
    createLabel: !s.customValue,
    clearLabel: !s.clearable,
    deleteOnBackspace: !chips || s.disableSearch,
    limit: s.singleSelect,
    customChip: !chips
  }

  const changed = <K extends keyof State>(name: K) => s[name] !== initial[name]
  // the createLabel field in a template literal: its \, ` and ${ escaped
  const createCode = s.createLabel
    .replace(/[\\`]|\$(?=\{)/g, '\\$&')
    .replaceAll('{text}', '${text}')
  const jsx = [
    '<MultiSelect',
    ...[
      `options={${s.options}}`,
      ...(set.code ?? []),
      ...(s.value === 'defaultValue'
        ? [`defaultValue={[${set.defaultValue.map(quote).join(', ')}]}`]
        : s.value === 'value'
          ? ['value={value}']
          : []),
      ...(Object.keys(flags) as Flag[])
        .filter(changed)
        .map((name) => (s[name] ? name : `${name}={false}`)),
      ...(s.closeOnSelect === 'unset'
        ? []
        : [
            s.closeOnSelect === 'true'
              ? 'closeOnSelect'
              : 'closeOnSelect={false}'
          ]),
      ...(s.limit ? [`limit={${s.limit}}`] : []),
      ...(Object.keys(texts) as Text[])
        .filter(changed)
        .map((name) =>
          name === 'createLabel'
            ? `createLabel={(text) => \`${createCode}\`}`
            : `${name}=${quote(s[name])}`
        ),
      ...(s.icons
        ? [
            'downArrowIcon={<span aria-hidden>🔽</span>}',
            'closeIcon={<span aria-hidden>✕</span>}'
          ]
        : []),
      ...(s.customChip ? chipCode : []),
      ...(List ? [`renderList={(list) => <${s.renderList} {...list} />}`] : []),
      ...(className ? [`className='${className}'`] : []),
      'onChange={setValue}',
      ...(s.events
        ? [
            "onMenuOpen={() => log('onMenuOpen')}",
            "onMenuClose={() => log('onMenuClose')}",
            "onClear={() => log('onClear')}"
          ]
        : [])
    ].map((line) => `  ${line}`),
    '/>'
  ].join('\n')

  const check = (
    name: Flag | 'customChip' | 'icons' | 'animated' | 'events'
  ) => (
    <label key={name}>
      <input
        type='checkbox'
        checked={s[name]}
        disabled={off[name]}
        onChange={() => update({ [name]: !s[name] })}
      />
      {name}
    </label>
  )
  const choose = <
    K extends 'options' | 'value' | 'closeOnSelect' | 'theme' | 'renderList'
  >(
    name: K,
    choices: Record<State[K], string>
  ) => (
    <label className='pg-field'>
      {name}
      <select
        name={name}
        value={s[name]}
        onChange={(e) => update({ [name]: e.target.value })}
      >
        {Object.entries(choices).map(([v, text]) => (
          <option key={v} value={v}>
            {text as string}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className='playground'>
      <div className='playground-controls'>
        <div className='pg-column'>
          <fieldset>
            <legend>Behavior</legend>
            {(Object.keys(flags) as Flag[]).map(check)}
            {choose('closeOnSelect', {
              unset: 'unset (single closes)',
              true: 'true',
              false: 'false'
            })}
            <label className='pg-field'>
              limit
              <input
                type='number'
                min={1}
                placeholder='null (no limit)'
                value={s.limit}
                disabled={off.limit}
                onChange={(e) => update({ limit: e.target.value })}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>Variants</legend>
            {choose(
              'options',
              Object.fromEntries(
                Object.entries(sets).map(([name, { label }]) => [name, label])
              )
            )}
            {choose('value', {
              onChange: 'uncontrolled',
              defaultValue: 'defaultValue',
              value: 'controlled (value)'
            })}
            {choose('theme', {
              default: 'default',
              dark: 'dark (CSS variables)'
            })}
            {choose('renderList', {
              none: 'none',
              VirtualList: 'react-window',
              TanstackList: 'TanStack Virtual'
            })}
            {check('animated')}
            {check('customChip')}
            {check('icons')}
            {check('events')}
          </fieldset>
        </div>
        <fieldset>
          <legend>Text</legend>
          {(Object.keys(texts) as Text[]).map((name) => (
            <label key={name} className='pg-field'>
              {name}
              <input
                type='text'
                value={s[name]}
                disabled={off[name]}
                onChange={(e) => update({ [name]: e.target.value })}
              />
            </label>
          ))}
        </fieldset>
      </div>
      <div className='playground-stage'>
        <div className={`playground-demo ${s.theme}`}>
          <MultiSelect
            key={jsx}
            options={set.options}
            {...set.props}
            {...Object.fromEntries(
              (Object.keys(flags) as Flag[]).map((name) => [name, s[name]])
            )}
            placeholder={s.placeholder}
            searchPlaceholder={s.searchPlaceholder}
            chipAlternateText={s.chipAlternateText}
            emptyDataLabel={s.emptyDataLabel}
            customValuesTitle={s.customValuesTitle}
            // a function: a string replacement would expand $& and $$ in the typed text
            createLabel={(text) =>
              s.createLabel.replaceAll('{text}', () => text)
            }
            clearLabel={s.clearLabel}
            closeOnSelect={
              s.closeOnSelect === 'unset'
                ? undefined
                : s.closeOnSelect === 'true'
            }
            limit={s.limit ? Number(s.limit) : null}
            defaultValue={
              s.value === 'defaultValue' ? set.defaultValue : undefined
            }
            value={s.value === 'value' ? value : undefined}
            onChange={setValue}
            customChip={s.customChip ? chip : undefined}
            downArrowIcon={s.icons ? <span aria-hidden>🔽</span> : undefined}
            closeIcon={s.icons ? <span aria-hidden>✕</span> : undefined}
            renderList={List && ((list) => <List {...list} />)}
            className={className}
            onMenuOpen={s.events ? () => note('onMenuOpen') : undefined}
            onMenuClose={s.events ? () => note('onMenuClose') : undefined}
            onClear={s.events ? () => note('onClear') : undefined}
            attr={{ 'aria-label': 'Playground' }}
          />
          <p className='demo-output'>value: {JSON.stringify(value)}</p>
          {s.events && (
            <p className='demo-output'>
              events: {log.join(' → ') || 'none yet'}
            </p>
          )}
        </div>
        <pre>{jsx}</pre>
        <button
          type='button'
          className='pg-reset'
          onClick={() => {
            update(initial)
            setLog([])
          }}
        >
          Reset all
        </button>
      </div>
    </div>
  )
}
