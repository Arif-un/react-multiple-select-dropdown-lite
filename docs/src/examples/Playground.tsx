import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery
} from '@tanstack/react-query'
import { useState } from 'react'
import MultiSelect from 'react-multiple-select-dropdown-lite'
import type {
  MultiSelectGroup,
  MultiSelectLoader,
  MultiSelectOption,
  MultiSelectProps
} from 'react-multiple-select-dropdown-lite'
import 'react-multiple-select-dropdown-lite/dist/index.css'
import './Animated.css'
import { fetchCities, fetchCountries, fetchPeople } from './fakeApi'
import './LoadingSpinner.css'
import { TanstackList, options as tree } from './TanstackVirtual'
import './Theming.css'
import { VirtualList } from './VirtualList'

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragon fruit (out of season)', value: 'dragon', disabled: true },
  { label: 'Kiwi (fixed)', value: 'kiwi', fixed: true },
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

// the loader sets' pretend server, as the Server controls set it: more latency (Infinity: no answer), failures, page size, debounce, and the request log
const server = {
  latency: 0,
  failures: 'none',
  per: undefined as number | undefined,
  debounce: false,
  // the people set's: searches under 2 letters load nothing, and the letters the loadKey filter picked
  short: false,
  letters: 'all',
  calls: 0,
  // the calls since a control changed: of those, every other one fails
  since: 0,
  log: (() => {}) as (n: number, line: string) => void
}

// a loader through the pretend server: its call logged as it starts and as it ends
const serve =
  (what: string, load: MultiSelectLoader): MultiSelectLoader =>
  async (req) => {
    const n = ++server.calls
    const even = ++server.since % 2 === 0
    const say = (end: string) =>
      server.log(
        n,
        `#${n} ${what}${req.search ? ` "${req.search}"` : ''}${req.next ? ` next=${req.next}` : ''}: ${end}`
      )
    say('loading')
    req.signal.addEventListener('abort', () => say('aborted'))
    const r = await load(req)
    await new Promise(
      (ok) => server.latency < Infinity && setTimeout(ok, server.latency)
    )
    req.signal.throwIfAborted()
    if (
      server.failures === 'all' ||
      (server.failures === 'alternate' && even)
    ) {
      say('failed')
      throw new Error('503')
    }
    const { options = r, next } = r as { options?: unknown; next?: unknown }
    say(`got ${(options as unknown[]).length}${next ? ', more to load' : ''}`)
    return r
  }

// with debounce on, waits for typing to pause: a later search aborts it meanwhile
const pause = async (signal: AbortSignal) => {
  if (!server.debounce) return
  await new Promise((r) => setTimeout(r, 300))
  signal.throwIfAborted()
}
const pauseCode = (s: State) =>
  s.debounce
    ? [
        '  await new Promise((r) => setTimeout(r, 300))',
        '  signal.throwIfAborted()'
      ]
    : []

// GET /api/people?letters=&q=&page=&per=: fetchPeople's people, those A to M or N to Z
const fetchPeopleIn = async (
  letters: string,
  q: string,
  page: number,
  signal: AbortSignal,
  per = 20
) => {
  const { people } = await fetchPeople(q, 1, signal, Infinity)
  const hits = people.filter(
    (p) => letters === 'all' || p.name < 'N' === (letters === 'A-M')
  )
  return {
    people: hits.slice((page - 1) * per, page * per),
    hasMore: page * per < hits.length
  }
}

// a pretend POST /tags through the server: it answers with the tag
const createTag = async (text: string) => {
  const [tag] = (await serve('create', async () => {
    await new Promise((r) => setTimeout(r, 500))
    return [{ label: text, value: text }]
  })({
    search: text,
    signal: new AbortController().signal
  })) as MultiSelectOption[]
  return tag
}

const person = (p: { id: string; name: string }) => ({
  label: p.name,
  value: p.id
})

// every lazy kind: a plain group loads as the menu opens, submenus as they open (regions, then their countries' cities, a page at a time), a collapsible group as it opens, and one loads nothing
const lazy = [
  {
    type: 'group',
    title: 'Nearby',
    childs: serve('Nearby', async () => [
      { label: 'Remote', value: 'remote' },
      { label: 'Office', value: 'office' }
    ])
  },
  ...['Europe', 'Asia', 'Americas'].map((region) => ({
    type: 'submenu',
    title: region,
    childs: serve(region, async ({ signal }) =>
      (await fetchCountries(region, signal)).map(
        (country): MultiSelectGroup => ({
          type: 'submenu',
          title: country,
          childs: serve(country, async ({ next = 1, signal }) => {
            const { cities, hasMore } = await fetchCities(
              country,
              next,
              signal,
              server.per
            )
            return {
              options: cities.map((city) => ({ label: city, value: city })),
              next: hasMore && next + 1
            }
          })
        })
      )
    )
  })),
  {
    type: 'group',
    title: 'Teammates',
    collapsible: true,
    collapsed: true,
    childs: serve('Teammates', async ({ next = 1, signal }) => {
      const { people, hasMore } = await fetchPeople(
        '',
        next,
        signal,
        server.per
      )
      return { options: people.map(person), next: hasMore && next + 1 }
    })
  },
  {
    type: 'group',
    title: 'Archived',
    collapsible: true,
    collapsed: true,
    emptyDataLabel: 'Nothing archived',
    childs: serve('Archived', async () => [])
  }
]

// the server's search narrows each region's countries: groups loadOptions loads get its search too
const regions = ['Europe', 'Asia', 'Americas'].map((region) => ({
  type: 'group',
  title: region,
  emptyDataLabel: 'No match',
  childs: serve(region, async ({ search, signal }) =>
    (await fetchCountries(region, signal))
      .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
      .map((c) => ({ label: c, value: c }))
  )
}))

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
    // the options lines, when not options={name}
    optionsCode?: (s: State) => string[]
    // what its labels read, when not opt.label: in the code, then as a function
    text?: { code: string; read: (option: MultiSelectOption) => string }
    // the lines above the JSX
    before?: string[]
  }
> = {
  fruits: {
    label: 'Flat, one disabled, one fixed',
    options: fruits,
    // the fixed one last: single select keeps the first
    defaultValue: ['apple', 'banana', 'kiwi']
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
    text: { code: 'user.name', read: (user) => user.name },
    props: {
      getValue: (user) => user.id,
      filterOption: (user, s) =>
        `${user.name} ${user.email}`.toLowerCase().includes(s.toLowerCase())
    },
    code: [
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
  items: { label: '5,000 options', options: items, defaultValue: ['item-1'] },
  people: {
    label: 'Server search, paged',
    // not listed: they name the selected values before those load
    options: [{ label: 'Ada Lovelace', value: '1' }],
    defaultValue: ['1'],
    props: {
      loadOptions: serve('people', async ({ search, next = 1, signal }) => {
        if (server.short && search.length < 2) return []
        await pause(signal)
        const { people, hasMore } = await fetchPeopleIn(
          server.letters,
          search,
          next,
          signal,
          server.per
        )
        return { options: people.map(person), next: hasMore && next + 1 }
      })
    },
    optionsCode: (s) => [
      "options={[{ label: 'Ada Lovelace', value: '1' }]}",
      'loadOptions={async ({ search, next = 1, signal }) => {',
      ...(s.emptyFn ? ['  if (search.length < 2) return []'] : []),
      ...pauseCode(s),
      `  const { people, hasMore } = await ${s.loadKey ? 'fetchPeopleIn(letters, ' : 'fetchPeople('}search, next, signal${s.pageSize ? `, ${s.pageSize}` : ''})`,
      '  return {',
      '    options: people.map((p) => ({ label: p.name, value: p.id })),',
      '    next: hasMore && next + 1',
      '  }',
      '}}'
    ]
  },
  regions: {
    label: 'Server search, grouped',
    options: [{ label: 'Japan', value: 'Japan' }],
    defaultValue: ['Japan'],
    props: {
      loadOptions: serve('regions', async ({ signal }) => {
        await pause(signal)
        return regions as MultiSelectGroup[]
      })
    },
    optionsCode: (s) => [
      "options={[{ label: 'Japan', value: 'Japan' }]}",
      `loadOptions={async (${s.debounce ? '{ signal }' : ''}) => {`,
      ...pauseCode(s),
      "  return ['Europe', 'Asia', 'Americas'].map((region) => ({",
      "    type: 'group',",
      '    title: region,',
      "    emptyDataLabel: 'No match',",
      '    // gets the search loadOptions got',
      '    childs: async ({ search, signal }) =>',
      '      (await fetchCountries(region, signal))',
      '        .filter((c) => c.toLowerCase().includes(search.toLowerCase()))',
      '        .map((c) => ({ label: c, value: c }))',
      '  }))',
      '}}'
    ]
  },
  query: {
    label: 'Your own data layer (React Query)',
    // the playground passes React Query's pages
    options: [],
    defaultValue: ['1'],
    before: [
      "const [search, setSearch] = useState('')",
      'const q = useInfiniteQuery({',
      "  queryKey: ['people', search],",
      '  queryFn: ({ pageParam, signal }) => fetchPeople(search, pageParam, signal),',
      '  initialPageParam: 1,',
      '  getNextPageParam: (last, all) => (last.hasMore ? all.length + 1 : undefined)',
      '})',
      ''
    ],
    optionsCode: () => [
      'options={q.data?.pages.flatMap((page) => page.people) ?? []}'
    ],
    text: { code: 'person.name', read: (person) => person.name },
    code: [
      'getValue={(person) => person.id}',
      'onSearch={setSearch}',
      'loading={q.isFetching}',
      'loadError={q.error}',
      'onLoadMore={q.hasNextPage ? q.fetchNextPage : q.isError ? q.refetch : undefined}'
    ]
  },
  lazy: {
    label: 'Lazy groups and submenus',
    options: lazy as unknown as MultiSelectOption[],
    defaultValue: []
  }
}
type SetName = keyof typeof sets

// the sets of groups, each with a header and a footer
const notes = ['groups', 'submenus', 'tree', 'lazy']
const noted = Object.fromEntries(
  notes.map((name) => [
    name,
    sets[name].options.map((group) =>
      group.type
        ? { ...group, header: 'Updated daily', footer: `End of ${group.title}` }
        : group
    )
  ])
)

type Person = { id: string; name: string }
// the query set's pages, through the pretend server
const queryPeople = serve('query', async ({ search, next, signal }) => {
  await pause(signal)
  const { people, hasMore } = await fetchPeople(
    search,
    next,
    signal,
    server.per
  )
  return {
    options: people as unknown as MultiSelectOption[],
    next: hasMore && next + 1
  }
}) as unknown as (req: {
  search: string
  next: number
  signal: AbortSignal
}) => Promise<{ options: Person[]; next: number | false }>
const queryClient = new QueryClient()

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
  disabled: false,
  hideSelected: false
}
type Flag = keyof typeof flags

const texts = {
  placeholder: 'Select...',
  searchPlaceholder: 'Search...',
  chipAlternateText: 'Item Selected',
  emptyDataLabel: 'No Data Found',
  customValuesTitle: 'Custom Values',
  createLabel: 'Create "{text}"',
  clearLabel: 'Clear',
  loadingLabel: 'Loading...',
  // unset: more loads as the end scrolls into view
  loadMoreLabel: '',
  errorLabel: 'Failed to load. Retry'
}
type Text = keyof typeof texts

// the recipes of the virtual lists page, named as there
const lists = { VirtualList, TanstackList }

// title rows with a count: then the expand icon, or one of your own from open
const titles: Record<string, MultiSelectProps['renderGroupTitle']> = {
  count: ({ title, total, selected, icon }) => (
    <>
      {title}
      <span>
        {selected}/{total}
      </span>
      {icon}
    </>
  ),
  // a title that is an option (collapsible, submenu) is read as text: a count there, a checkbox in plain groups
  checkbox: ({ title, total, selected, icon, toggle }) =>
    icon ? (
      <>
        {title}
        <span>
          {selected}/{total}
        </span>
        {icon}
      </>
    ) : (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
        <input
          type='checkbox'
          aria-label={`All of ${title}`}
          checked={total > 0 && selected === total}
          ref={(box) => {
            if (box) box.indeterminate = selected > 0 && selected < total
          }}
          onChange={toggle}
        />
        {title}
      </span>
    ),
  open: ({ title, total, selected, open, group }) => (
    <>
      {title}
      <span>
        {selected}/{total}
      </span>
      <span aria-hidden style={{ marginInlineStart: 'auto' }}>
        {open && group.type !== 'submenu' ? '▾' : '▸'}
      </span>
    </>
  )
}
const titlesCode = {
  count: [
    'renderGroupTitle={({ title, total, selected, icon }) => (',
    '  <>',
    '    {title}',
    '    <span>{selected}/{total}</span>',
    '    {icon}',
    '  </>',
    ')}'
  ],
  checkbox: [
    '// a collapsible group or a submenu (an icon) has an option for a title, read as text: a count there',
    'renderGroupTitle={({ title, total, selected, icon, toggle }) =>',
    '  icon ? (',
    '    <>',
    '      {title}',
    '      <span>{selected}/{total}</span>',
    '      {icon}',
    '    </>',
    '  ) : (',
    "    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>",
    '      <input',
    "        type='checkbox'",
    '        aria-label={`All of ${title}`}',
    '        checked={total > 0 && selected === total}',
    '        ref={(box) => {',
    '          if (box) box.indeterminate = selected > 0 && selected < total',
    '        }}',
    '        onChange={toggle}',
    '      />',
    '      {title}',
    '    </span>',
    '  )',
    '}'
  ],
  open: [
    'renderGroupTitle={({ title, total, selected, open, group }) => (',
    '  <>',
    '    {title}',
    '    <span>{selected}/{total}</span>',
    "    <span aria-hidden style={{ marginInlineStart: 'auto' }}>",
    "      {open && group.type !== 'submenu' ? '▾' : '▸'}",
    '    </span>',
    '  </>',
    ')}'
  ]
}

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
  renderGroupTitle: 'none' as 'none' | keyof typeof titlesCode,
  events: false,
  labels: 'plain' as 'plain' | 'mark' | 'check',
  selectAll: '',
  slots: 'none' as 'none' | 'header' | 'footer' | 'both',
  groupNotes: false,
  open: 'uncontrolled' as 'uncontrolled' | 'controlled',
  keepSearch: false,
  maxChips: '',
  moreChipsLabel: '+{n}',
  onCreate: 'none' as 'none' | 'upper' | 'server',
  canCreate: false,
  // the pretend server of the loader sets
  latency: '0' as '0' | '2000' | 'Infinity',
  failures: 'none' as 'none' | 'alternate' | 'all',
  pageSize: '',
  debounce: false,
  preload: 'false' as 'false' | 'true' | 'intent',
  loadAhead: '',
  loadKey: false,
  errorFn: false,
  emptyFn: false,
  spinner: false
}

const initial = { ...flags, ...texts, ...variants }
type State = typeof initial

// a JSX label (the statuses) names the button by its value. A fixed value gets none
const chip: MultiSelectProps['customChip'] = ({
  label,
  value,
  disabled,
  fixed,
  onDelete
}) => (
  <span className='pg-chip'>
    {label}
    {!fixed && (
      <button
        type='button'
        aria-label={`Remove ${typeof label == 'string' ? label : value}`}
        disabled={disabled}
        onClick={onDelete}
      >
        ×
      </button>
    )}
  </span>
)
const chipCode = [
  'customChip={({ label, value, disabled, fixed, onDelete }) => (',
  "  <span className='pg-chip'>",
  '    {label}',
  '    {!fixed && (',
  '      <button',
  "        type='button'",
  "        aria-label={`Remove ${typeof label == 'string' ? label : value}`}",
  '        disabled={disabled}',
  '        onClick={onDelete}',
  '      >',
  '        ×',
  '      </button>',
  '    )}',
  '  </span>',
  ')}'
]

// the menu's header and footer: actions and a count on the options it lists
const header: MultiSelectProps['menuHeader'] = ({ selectAll, deselectAll }) => (
  <div className='pg-bar'>
    <button type='button' onClick={selectAll}>
      Select all
    </button>
    <button type='button' onClick={deselectAll}>
      Clear
    </button>
  </div>
)
const headerCode = [
  'menuHeader={({ selectAll, deselectAll }) => (',
  "  <div className='pg-bar'>",
  "    <button type='button' onClick={selectAll}>Select all</button>",
  "    <button type='button' onClick={deselectAll}>Clear</button>",
  '  </div>',
  ')}'
]
const footer: MultiSelectProps['menuFooter'] = ({ options, selected }) => (
  <div className='pg-bar'>
    {selected} of {options.length} selected
  </div>
)
const footerCode = [
  'menuFooter={({ options, selected }) => (',
  "  <div className='pg-bar'>",
  '    {selected} of {options.length} selected',
  '  </div>',
  ')}'
]

// a failed load's row: the error, and a button that loads again
const retry: MultiSelectProps['errorLabel'] = (error, again) => (
  <>
    {String(error)}{' '}
    <button type='button' onClick={again}>
      Retry
    </button>
  </>
)
const retryCode = [
  'errorLabel={(error, retry) => (',
  '  <>',
  "    {String(error)}{' '}",
  "    <button type='button' onClick={retry}>Retry</button>",
  '  </>',
  ')}'
]

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

const literal = (text: string) =>
  /['\\]/.test(text) ? JSON.stringify(text) : `'${text}'`
const quote = (text: string) =>
  text.includes("'") ? `{${JSON.stringify(text)}}` : `'${text}'`
// a text field in a template literal: its \, ` and ${ escaped, {name} the parameter
const template = (text: string, name: string) =>
  text.replace(/[\\`]|\$(?=\{)/g, '\\$&').replaceAll(`{${name}}`, `\${${name}}`)

// the selection each value mode starts with
const startValue = (s: State) =>
  s.value === 'onChange' ? [] : sets[s.options].defaultValue

// prop controls, the matching JSX, the value and the events; a new key per change starts the dropdown fresh
export default function Playground() {
  return (
    <QueryClientProvider client={queryClient}>
      <Board />
    </QueryClientProvider>
  )
}

function Board() {
  const [s, setS] = useState(initial)
  const [value, setValue] = useState<string[]>([])
  const [log, setLog] = useState<string[]>([])
  const [search, setSearch] = useState('')
  // the state of the open, search and loadKey controls' recipes
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [letters, setLetters] = useState('all')
  // a cache per server setting: one set fails, another not
  const q = useInfiniteQuery({
    queryKey: ['people', search, s.pageSize, s.latency, s.failures, s.debounce],
    queryFn: ({ pageParam, signal }) =>
      queryPeople({ search, next: pageParam, signal }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.next || undefined,
    enabled: s.options === 'query',
    retry: false,
    staleTime: 60_000
  })
  const fromQuery = s.options === 'query' && {
    // people: the playground's dropdown is typed for { label, value }
    options: (q.data?.pages.flatMap((page) => page.options) ??
      []) as unknown as MultiSelectOption[],
    getValue: (person: MultiSelectOption) => person.id,
    onSearch: setSearch,
    loading: q.isFetching,
    loadError: q.error,
    onLoadMore: q.hasNextPage
      ? q.fetchNextPage
      : q.isError
        ? q.refetch
        : undefined
  }
  const [requests, setRequests] = useState<Record<number, string>>({})
  const set = sets[s.options]
  const List = s.renderList === 'none' ? undefined : lists[s.renderList]
  const className =
    [
      s.theme === 'dark' && 'dark-msl',
      s.animated && 'animated',
      s.spinner && 'spinner'
    ]
      .filter(Boolean)
      .join(' ') || undefined
  const update = (patch: Partial<State>) => {
    const next = { ...s, ...patch }
    server.since = 0
    setS(next)
    setValue(startValue(next))
    setSearch('')
    setOpen(false)
    setTyped('')
    setLetters('all')
  }
  const note = (event: string) => setLog((l) => [...l, event].slice(-5))
  Object.assign(server, {
    latency: Number(s.latency),
    failures: s.failures,
    per: Number(s.pageSize) || undefined,
    debounce: s.debounce,
    short: s.emptyFn,
    letters: s.loadKey ? letters : 'all',
    log: (n: number, line: string) => setRequests((r) => ({ ...r, [n]: line }))
  })
  const loads = ['people', 'regions', 'query', 'lazy'].includes(s.options)
  const creates = s.customValue && s.onCreate === 'server'
  const controlled = s.open === 'controlled'
  // the open, search and loadKey recipes' state, and their controls outside the dropdown
  const hooks = [
    ...(controlled ? ['const [open, setOpen] = useState(false)'] : []),
    ...(s.keepSearch ? ["const [typed, setTyped] = useState('')"] : []),
    ...(s.loadKey ? ["const [letters, setLetters] = useState('all')"] : [])
  ]
  const before = [
    ...(s.labels === 'mark' && s.options !== 'statuses'
      ? [
          '// the search match in <mark>',
          'const highlight = (text: string, search: string) => {',
          '  const i = search ? text.toLowerCase().indexOf(search.toLowerCase()) : -1',
          '  if (i < 0) return text',
          '  return (',
          '    <>',
          '      {text.slice(0, i)}',
          '      <mark>{text.slice(i, i + search.length)}</mark>',
          '      {text.slice(i + search.length)}',
          '    </>',
          '  )',
          '}',
          ''
        ]
      : []),
    ...(set.before ?? []),
    ...hooks,
    ...(hooks.length ? [''] : []),
    ...(s.loadKey
      ? [
          "<select aria-label='Names' value={letters} onChange={(e) => setLetters(e.target.value)}>",
          "  <option value='all'>Everyone</option>",
          "  <option value='A-M'>A to M</option>",
          "  <option value='N-Z'>N to Z</option>",
          '</select>'
        ]
      : []),
    ...(controlled
      ? ["<button type='button' onClick={() => setOpen(true)}>Open</button>"]
      : [])
  ]
  // the label text of its options, then the label the labels control makes of it
  const text = set.text?.read ?? ((opt: MultiSelectOption) => opt.label)
  const textCode = set.text?.code ?? 'opt.label'
  const [param] = textCode.split('.')
  // statuses: JSX labels of their own
  const own = s.options === 'statuses'
  const getLabel: MultiSelectProps['getLabel'] = own
    ? undefined
    : s.labels === 'mark'
      ? (opt, { search }) => highlight(text(opt), search)
      : s.labels === 'check'
        ? (opt, { context, selected }) =>
            context === 'menu' && selected ? `✓ ${text(opt)}` : text(opt)
        : set.text?.read
  const labelCode = own
    ? []
    : s.labels === 'mark'
      ? [`getLabel={(${param}, { search }) => highlight(${textCode}, search)}`]
      : s.labels === 'check'
        ? [
            `getLabel={(${param}, { context, selected }) =>`,
            `  context === 'menu' && selected ? \`✓ \${${textCode}}\` : ${textCode}`,
            '}'
          ]
        : set.text
          ? [`getLabel={(${param}) => ${textCode}}`]
          : []
  // the dropdown's own opens and closes: asks with open, logged with events
  const ask = (event: string, to: boolean) =>
    controlled || s.events
      ? () => {
          controlled && setOpen(to)
          s.events && note(event)
        }
      : undefined
  const askCode = (event: string, to: boolean) =>
    controlled && s.events
      ? [`${event}={() => {`, `  setOpen(${to})`, `  log('${event}')`, '}}']
      : controlled
        ? [`${event}={() => setOpen(${to})}`]
        : s.events
          ? [`${event}={() => log('${event}')}`]
          : []

  // what each prop needs to show any effect
  const chips = !s.singleSelect && !s.disableChip
  const closes =
    s.closeOnSelect === 'unset' ? s.singleSelect : s.closeOnSelect === 'true'
  const off: Partial<Record<keyof State, boolean>> = {
    searchPlaceholder: !s.searchInMenu || s.disableSearch,
    chipAlternateText: !s.disableChip || s.singleSelect,
    customValuesTitle: !s.customValue,
    createLabel: !s.customValue,
    clearLabel: !s.clearable,
    loadingLabel: !loads,
    loadMoreLabel: !loads,
    errorLabel: !loads || s.errorFn,
    // and onCreate's server
    latency: !loads && !creates,
    failures: !loads && !creates,
    pageSize: !['people', 'query', 'lazy'].includes(s.options),
    debounce: !['people', 'regions', 'query'].includes(s.options),
    preload: !['people', 'regions'].includes(s.options),
    loadAhead:
      !['people', 'query', 'lazy'].includes(s.options) || !!s.loadMoreLabel,
    loadKey: s.options !== 'people',
    errorFn: !loads,
    emptyFn: s.options !== 'people',
    spinner: !loads,
    deleteOnBackspace: !chips || s.disableSearch,
    limit: s.singleSelect,
    customChip: !chips,
    maxChips: !chips,
    moreChipsLabel: !chips || !s.maxChips,
    labels: own,
    selectAll: s.singleSelect,
    groupNotes: !notes.includes(s.options),
    // a pick that closes the menu clears the search anyway
    keepSearch: s.disableSearch || closes,
    onCreate: !s.customValue,
    canCreate: !s.customValue,
    // titles: groups or submenus, or customValue's group
    renderGroupTitle:
      !['groups', 'submenus', 'tree', 'regions', 'lazy'].includes(s.options) &&
      !s.customValue
  }

  const changed = <K extends keyof State>(name: K) => s[name] !== initial[name]
  // texts a function flag replaces
  const fns: Partial<Record<Text, boolean>> = {
    emptyDataLabel: s.emptyFn,
    errorLabel: s.errorFn
  }
  const jsx = [
    '<MultiSelect',
    ...[
      ...(set.optionsCode?.(s) ??
        (s.groupNotes && noted[s.options]
          ? [
              `options={${s.options}.map((group) =>`,
              '  group.type',
              "    ? { ...group, header: 'Updated daily', footer: `End of ${group.title}` }",
              '    : group',
              ')}'
            ]
          : [`options={${s.options}}`])),
      ...labelCode,
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
      ...(s.maxChips ? [`maxChips={${s.maxChips}}`] : []),
      ...(changed('moreChipsLabel')
        ? [`moreChipsLabel={(n) => \`${template(s.moreChipsLabel, 'n')}\`}`]
        : []),
      ...(s.selectAll ? [`selectAll=${quote(s.selectAll)}`] : []),
      ...(Object.keys(texts) as Text[])
        .filter((name) => changed(name) && !fns[name])
        .map((name) =>
          name === 'createLabel'
            ? `createLabel={(text) => \`${template(s.createLabel, 'text')}\`}`
            : `${name}=${quote(s[name])}`
        ),
      ...(s.emptyFn
        ? [
            'emptyDataLabel={(search) =>',
            `  search.length < 2 ? 'Type 2 letters' : ${literal(s.emptyDataLabel)}`,
            '}'
          ]
        : []),
      ...(s.errorFn ? retryCode : []),
      ...(s.canCreate ? ['canCreate={(text) => text.length >= 3}'] : []),
      ...(s.onCreate === 'upper'
        ? ['onCreate={(text) => text.toUpperCase()}']
        : s.onCreate === 'server'
          ? ['onCreate={createTag}']
          : []),
      ...(s.preload === 'false'
        ? []
        : [s.preload === 'true' ? 'preload' : "preload='intent'"]),
      ...(s.loadAhead ? [`loadAhead={${s.loadAhead}}`] : []),
      ...(s.loadKey ? ['loadKey={letters}'] : []),
      ...(s.icons
        ? [
            'downArrowIcon={<span aria-hidden>🔽</span>}',
            'closeIcon={<span aria-hidden>✕</span>}',
            "groupIcon='▸'",
            "submenuIcon='→'"
          ]
        : []),
      ...(s.customChip ? chipCode : []),
      ...(s.renderGroupTitle === 'none' ? [] : titlesCode[s.renderGroupTitle]),
      ...(['header', 'both'].includes(s.slots) ? headerCode : []),
      ...(['footer', 'both'].includes(s.slots) ? footerCode : []),
      ...(List ? [`renderList={(list) => <${s.renderList} {...list} />}`] : []),
      ...(className ? [`className='${className}'`] : []),
      'onChange={setValue}',
      ...(controlled ? ['open={open}'] : []),
      ...askCode('onMenuOpen', true),
      ...askCode('onMenuClose', false),
      ...(s.events ? ["onClear={() => log('onClear')}"] : []),
      ...(s.keepSearch
        ? [
            'search={typed}',
            "onSearchChange={(text, reason) => reason !== 'pick' && setTyped(text)}"
          ]
        : [])
    ].map((line) => `  ${line}`),
    '/>'
  ].join('\n')

  const check = (
    name:
      | Flag
      | 'customChip'
      | 'icons'
      | 'animated'
      | 'events'
      | 'debounce'
      | 'groupNotes'
      | 'keepSearch'
      | 'canCreate'
      | 'loadKey'
      | 'errorFn'
      | 'emptyFn'
      | 'spinner',
    label: string = name
  ) => (
    <label key={name}>
      <input
        type='checkbox'
        checked={s[name]}
        disabled={off[name]}
        onChange={() => update({ [name]: !s[name] })}
      />
      {label}
    </label>
  )
  const choose = <
    K extends
      | 'options'
      | 'value'
      | 'closeOnSelect'
      | 'theme'
      | 'renderList'
      | 'renderGroupTitle'
      | 'latency'
      | 'failures'
      | 'labels'
      | 'slots'
      | 'open'
      | 'onCreate'
      | 'preload'
  >(
    name: K,
    choices: Record<State[K], string>,
    label: string = name
  ) => (
    <label className='pg-field'>
      {label}
      <select
        name={name}
        value={s[name]}
        disabled={off[name]}
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

  const field = (
    name:
      | 'limit'
      | 'maxChips'
      | 'pageSize'
      | 'loadAhead'
      | 'selectAll'
      | 'moreChipsLabel',
    label: string,
    placeholder?: string,
    type = 'number'
  ) => (
    <label className='pg-field'>
      {label}
      <input
        type={type}
        min={type === 'number' ? 1 : undefined}
        placeholder={placeholder}
        value={s[name]}
        disabled={off[name]}
        onChange={(e) => update({ [name]: e.target.value })}
      />
    </label>
  )

  return (
    <div className='playground'>
      <div className='playground-controls'>
        <div className='pg-column'>
          <fieldset>
            <legend>Behavior</legend>
            {(Object.keys(flags) as Flag[]).map((name) => check(name))}
            {choose('closeOnSelect', {
              unset: 'unset (single closes)',
              true: 'true',
              false: 'false'
            })}
            {field('limit', 'limit', 'null (no limit)')}
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
            {check('icons')}
            {check('events')}
          </fieldset>
          <fieldset>
            <legend>Menu</legend>
            {choose(
              'labels',
              {
                plain: 'plain',
                mark: 'search match in <mark>',
                check: '✓ on selected rows'
              },
              'getLabel meta'
            )}
            {field('selectAll', 'selectAll', 'unset: type a label', 'text')}
            {choose(
              'slots',
              {
                none: 'none',
                header: 'header: Select all, Clear',
                footer: 'footer: N of M selected',
                both: 'both'
              },
              'menuHeader, menuFooter'
            )}
            {choose('renderGroupTitle', {
              none: 'none',
              count: 'count, then icon',
              open: 'count, own icon from open',
              checkbox: 'checkbox: toggle'
            })}
            {check('groupNotes', 'group header, footer')}
            {choose('open', {
              uncontrolled: 'uncontrolled',
              controlled: 'controlled, Open button'
            })}
            {check('keepSearch', 'search kept on pick')}
          </fieldset>
          <fieldset>
            <legend>Chips</legend>
            {check('customChip')}
            {field('maxChips', 'maxChips', 'unset (all)')}
            {field('moreChipsLabel', 'moreChipsLabel', undefined, 'text')}
          </fieldset>
        </div>
        <div className='pg-column'>
          <fieldset>
            <legend>Text</legend>
            {(Object.keys(texts) as Text[]).map((name) => (
              <label key={name} className='pg-field'>
                {name}
                <input
                  type='text'
                  value={s[name]}
                  placeholder={
                    name === 'loadMoreLabel'
                      ? 'unset: loads on scroll'
                      : undefined
                  }
                  disabled={off[name]}
                  onChange={(e) => update({ [name]: e.target.value })}
                />
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Create (customValue)</legend>
            {choose('onCreate', {
              none: 'none',
              upper: 'sync: uppercase',
              server: 'async: the server'
            })}
            {check('canCreate', 'canCreate: 3+ letters')}
          </fieldset>
          <fieldset>
            <legend>Server (async sets)</legend>
            {choose('latency', {
              0: 'as is (0.5 s)',
              2000: '2 s more',
              Infinity: 'never answers'
            })}
            {choose('failures', {
              none: 'none',
              alternate: 'every other call',
              all: 'every call'
            })}
            {field('pageSize', 'page size', 'API default (20, 10)')}
            {check('debounce')}
            {choose('preload', {
              false: 'false',
              true: 'true (on mount)',
              intent: "'intent' (hover, focus)"
            })}
            {field('loadAhead', 'loadAhead', '0 (px)')}
            {check('loadKey', 'loadKey: name filter')}
            {check('emptyFn', 'emptyDataLabel: 2 letters')}
            {check('errorFn', 'errorLabel: Retry button')}
            {check('spinner', 'data-loading spinner')}
          </fieldset>
        </div>
      </div>
      <div className='playground-stage'>
        <div className={`playground-demo ${s.theme}`}>
          {(s.loadKey || controlled) && (
            <div className='demo-row'>
              {s.loadKey && (
                <select
                  aria-label='Names'
                  value={letters}
                  onChange={(e) => setLetters(e.target.value)}
                >
                  <option value='all'>Everyone</option>
                  <option value='A-M'>A to M</option>
                  <option value='N-Z'>N to Z</option>
                </select>
              )}
              {controlled && (
                <button type='button' onClick={() => setOpen(true)}>
                  Open
                </button>
              )}
            </div>
          )}
          <MultiSelect
            // a server control starts it fresh too: no list loaded yet. Not loadKey: it reloads in place
            key={jsx + s.latency + s.failures}
            options={(s.groupNotes && noted[s.options]) || set.options}
            // before the sets' props: the statuses' own getLabel
            getLabel={getLabel}
            {...set.props}
            {...fromQuery}
            {...Object.fromEntries(
              (Object.keys(flags) as Flag[]).map((name) => [name, s[name]])
            )}
            placeholder={s.placeholder}
            searchPlaceholder={s.searchPlaceholder}
            chipAlternateText={s.chipAlternateText}
            emptyDataLabel={
              s.emptyFn
                ? (search) =>
                    search.length < 2 ? 'Type 2 letters' : s.emptyDataLabel
                : s.emptyDataLabel
            }
            customValuesTitle={s.customValuesTitle}
            // a function: a string replacement would expand $& and $$ in the typed text
            createLabel={(text) =>
              s.createLabel.replaceAll('{text}', () => text)
            }
            clearLabel={s.clearLabel}
            loadingLabel={s.loadingLabel}
            loadMoreLabel={s.loadMoreLabel || undefined}
            errorLabel={s.errorFn ? retry : s.errorLabel}
            canCreate={s.canCreate ? (text) => text.length >= 3 : undefined}
            onCreate={
              s.onCreate === 'upper'
                ? (text) => text.toUpperCase()
                : s.onCreate === 'server'
                  ? createTag
                  : undefined
            }
            preload={s.preload === 'intent' ? 'intent' : s.preload === 'true'}
            loadAhead={s.loadAhead ? Number(s.loadAhead) : undefined}
            loadKey={s.loadKey ? letters : undefined}
            maxChips={s.maxChips ? Number(s.maxChips) : undefined}
            moreChipsLabel={(n) =>
              s.moreChipsLabel.replaceAll('{n}', () => String(n))
            }
            selectAll={s.selectAll || undefined}
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
            groupIcon={s.icons ? '▸' : undefined}
            submenuIcon={s.icons ? '→' : undefined}
            renderGroupTitle={
              s.renderGroupTitle === 'none'
                ? undefined
                : titles[s.renderGroupTitle]
            }
            menuHeader={
              ['header', 'both'].includes(s.slots) ? header : undefined
            }
            menuFooter={
              ['footer', 'both'].includes(s.slots) ? footer : undefined
            }
            renderList={List && ((list) => <List {...list} />)}
            className={className}
            open={controlled ? open : undefined}
            onMenuOpen={ask('onMenuOpen', true)}
            onMenuClose={ask('onMenuClose', false)}
            onClear={s.events ? () => note('onClear') : undefined}
            search={s.keepSearch ? typed : undefined}
            onSearchChange={
              s.keepSearch
                ? (text, reason) => reason !== 'pick' && setTyped(text)
                : undefined
            }
            attr={{ 'aria-label': 'Playground' }}
          />
          <p className='demo-output'>
            value: {JSON.stringify(value)}
            {controlled && `, open: ${open}`}
          </p>
          {s.events && (
            <p className='demo-output'>
              events: {log.join(' → ') || 'none yet'}
            </p>
          )}
          {(loads || creates) && (
            <p className='demo-output pg-log'>
              {['requests:', ...Object.values(requests).slice(-6)].join('\n')}
            </p>
          )}
        </div>
        <pre>{[...before, jsx].join('\n')}</pre>
        <button
          type='button'
          className='pg-reset'
          onClick={() => {
            update(initial)
            setLog([])
            setRequests({})
          }}
        >
          Reset all
        </button>
      </div>
    </div>
  )
}
