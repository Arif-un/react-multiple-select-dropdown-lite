import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useId
} from 'react'
import type { EffectCallback } from 'react'
import Chip from './Chip'
import { CloseIcon, DownIcon } from './icons'
import type PublicMultiSelect from './index'
import type {
  MultiSelectGroup,
  MultiSelectLabelMeta,
  MultiSelectLoaded,
  MultiSelectLoader,
  MultiSelectOption,
  MultiSelectProps
} from './index'
import Options, {
  attrs,
  ends,
  exits,
  flatten,
  gap,
  isGroup,
  leave,
  pop,
  walk,
  whole
} from './Options'
import type { Row } from './Options'

type Item = MultiSelectOption | MultiSelectGroup
// a loader's list: the options so far, what to load next, the load on the way, a failure
type Loaded = {
  items: readonly Item[]
  next?: unknown
  busy?: AbortController
  // what the load threw or rejected with, true for a falsy one
  error?: unknown
}

// Defaults as parameter defaults: React 19's jsx runtime ignores defaultProps on function components.
const noop = () => {}
const optLabel = (opt: MultiSelectOption) => opt.label
// getLabel's meta for chips and the single value, and for the text search reads: never the search's
const asValue = { context: 'value', search: '', selected: true } as const
const plain = { context: 'menu', search: '', selected: false } as const
const optValue = (opt: MultiSelectOption) => opt.value
const noStyle = {}
const createText = (text: string) => `Create "${text}"`
const plus = (n: number) => '+' + n
// the viewport less a classic scrollbar. innerHeight too: quirks mode makes the root as tall as the page
const viewHeight = () =>
  Math.min(innerHeight, document.documentElement.clientHeight)
// a computed length: older jsdom leaves what no stylesheet sets ''
const px = (v: string) => parseFloat(v) || 0

// options we create, { label, value }: the user's getters only know their own shape
const ours = new WeakSet<MultiSelectOption>()
const ourOpt = (value: string, label: React.ReactNode = value) => {
  const opt = { label, value } as MultiSelectOption
  ours.add(opt)
  return opt
}
// runs run while mounted, its cleanup in the commit that unmounts it: a layout effect, never on the server
// (where React 18 warns about one) as it mounts on a user action
function During({ run }: { run: EffectCallback }) {
  useLayoutEffect(run, [])
  return null
}
// a layout effect, whose updates are sync as an event's are, but on the server, where React 18 warns about one
const useSync = (run: EffectCallback, deps: unknown[]) =>
  (typeof document == 'undefined' ? useEffect : useLayoutEffect)(run, deps)

function MultiSelect({
  options: userOptions,
  downArrowIcon,
  closeIcon,
  groupIcon,
  submenuIcon,
  renderGroupTitle,
  menuHeader,
  menuFooter,
  selectAll,
  clearable = true,
  downArrow = true,
  onChange = noop,
  getLabel = optLabel,
  getValue = optValue,
  filterOption,
  hideSelected,
  singleSelect = false,
  defaultValue,
  value: valueProp,
  className,
  placeholder = 'Select...',
  disableChip = false,
  name = '',
  style,
  attr,
  disabled = false,
  limit,
  emptyDataLabel = 'No Data Found',
  customValue = false,
  onMenuOpen = noop,
  onMenuClose = noop,
  open: openProp,
  search: searchProp,
  onSearchChange,
  maxChips = Infinity,
  moreChipsLabel = plus,
  onClear = noop,
  chipAlternateText = 'Item Selected',
  clearLabel = 'Clear',
  createLabel = createText,
  canCreate,
  onCreate,
  customValuesTitle = 'Custom Values',
  customChip = Chip,
  closeOnSelect,
  disableSearch = false,
  searchInMenu = false,
  searchPlaceholder = 'Search...',
  deleteOnBackspace = true,
  renderList,
  loadOptions,
  loadKey,
  preload,
  loadAhead = 0,
  onSearch,
  loading,
  loadError,
  onLoadMore,
  loadMoreLabel,
  loadingLabel = 'Loading...',
  errorLabel = 'Failed to load. Retry',
  classNames: cn = noStyle
}: MultiSelectProps) {
  const valueOf = (opt: MultiSelectOption) =>
    ours.has(opt) ? opt.value : getValue(opt)
  const labelOf = (opt: MultiSelectOption, meta: MultiSelectLabelMeta) =>
    ours.has(opt) ? opt.label : getLabel(opt, meta)
  // the selection, as values or their options; defaultValue is initial only, as in an uncontrolled input
  const [own, setOwn] = useState<readonly (string | MultiSelectOption)[]>(
    () => defaultValue ?? []
  )
  // with `value` the parent owns the selection: user changes only call onChange
  const controlled = valueProp !== undefined
  // null from untyped JS (useState(null)) is an empty selection, as defaultValue's is, and a null in it no value
  const picks = ((controlled ? valueProp : own) ?? []).filter((k) => k != null)
  // a value that comes as its option names itself. Not one we created: that stays under Custom Values
  const named = picks.filter(
    (k): k is MultiSelectOption => typeof k == 'object' && !ours.has(k)
  )
  const keys = picks.map((k) => (typeof k == 'object' ? valueOf(k) : k))
  // values created by customValue, or the options onCreate made of them: they stay listed once deselected
  const [custom, setCustom] = useState<(string | MultiSelectOption)[]>([])
  // onCreate's promises by text: true while pending, once failed what it rejected with, boxed
  const [pending] = useState(() => new Map<string, true | { e: unknown }>())
  // what they settled to, with their text and the value as they started, added one per render: two settling at once
  // would each start from the same value
  const [arrived] = useState<[MultiSelectOption, string, string][]>(() => [])
  const base = userOptions || []
  // with onSearch, every search's options by value, as loaders' lists keep theirs.
  // ponytail: grows with every search's options for the dropdown's life, as lists do
  const [seen] = useState(() => new Map<string, MultiSelectOption>())
  // loaders' lists, by loadKey, then by key. A new loadKey's start empty, and the lists showing load again; the old
  // ones' selected options keep naming their values. The old go once it commits, their loads stopped: a render React
  // drops (a transition's) leaves them be.
  // ponytail: every search's list stays for the dropdown's life, flattened each render; drop the oldest searches if
  // that grows too big
  const [byKey] = useState<[unknown, Map<string, Loaded>][]>(() => [])
  let lists = byKey.find(([k]) => Object.is(k, loadKey))?.[1]
  if (!lists) {
    const picked = keys.map(String)
    byKey.forEach(([, m]) =>
      m.forEach((l) =>
        flatten(l.items).forEach((opt) => {
          const v = String(valueOf(opt))
          picked.includes(v) && seen.set(v, opt)
        })
      )
    )
    lists = new Map()
    byKey.push([loadKey, lists])
  }
  // lists you load that retried as they showed, this open: a search's new box of rows or strict mode's second mount
  // shows them again
  const [tried] = useState(() => new Set<string>())
  const [, rerender] = useState({})
  const update = () => rerender({})
  // and by the options in them, every search's: a picked one stays known once its list moves on
  const known = flatten(base)
  lists.forEach((l) => flatten(l.items, known))
  onSearch && known.forEach((opt) => seen.set(String(valueOf(opt)), opt))
  // what names values: those, every search's with onSearch, the lists a loadKey dropped, then values that come as
  // options
  const names = [...known, ...seen.values(), ...named]
  // search and the tooltip need text: a JSX label falls back to the label field, if that is text
  const text = (x: unknown) =>
    typeof x === 'string' || typeof x === 'number' ? String(x) : null
  const textOf = (opt: MultiSelectOption, label = labelOf(opt, plain)) =>
    text(label) ?? text(opt.label) ?? ''
  const [typed, setTyped] = useState('')
  // the search field's text: yours with `search`
  const query = searchProp ?? typed
  // the latest, as set: a close's late clear checks it was not edited meanwhile, and a change is reported once
  const shows = useRef(query)
  shows.current = query
  // the latest: a close's clear comes from the open menu's listeners, or once its exit animations end
  const told = useRef(onSearchChange)
  told.current = onSearchChange
  const setQuery = (
    text: string,
    why: 'input' | 'pick' | 'close' = 'input'
  ) => {
    if (text === shows.current) return
    shows.current = text
    searchProp ?? setTyped(text)
    told.current?.(text, why)
  }
  // searched trimmed, commas dropped: a typed comma picks
  const term = query.trim().replace(/,+/g, '')
  // a group by its place and title text
  const tag = (g: MultiSelectGroup, key: string) => key + '\0' + text(g.title)
  // loadOptions' lists are per search, as are the lists of groups in them, or in onSearch's results
  const scope = loadOptions || onSearch ? term : ''
  // a list loads: data-loading on the wrapper
  let spin = false
  // a list's end: a row while it loads, has more or failed. l: its state, label: a group's loadMoreLabel,
  // once: the failed list's retry as it shows, once per open
  const ended = (
    out: readonly Item[],
    k: string,
    l: object | undefined,
    load: () => unknown,
    label: React.ReactNode,
    once?: boolean
  ) => {
    ;(l as Loaded | undefined)?.busy && (spin = true)
    const end = {
      k,
      l,
      load,
      label: label ?? loadMoreLabel,
      once: once && (() => tried.has(k) || (tried.add(k), load()))
    }
    ends.add(end)
    return [...out, end as unknown as Item]
  }
  // a loader's list as loaded so far, then its end unless all is in. pre: its place in the tree.
  // Its key holds what it loads: a later loader, a new closure, loads the next part
  const listOf = (
    fn: MultiSelectLoader,
    k: string,
    pre: string,
    label?: React.ReactNode
  ) => {
    const l = lists.get(k)
    const out = resolve(l?.items ?? [], pre)
    return l && !l.busy && !l.next && !l.error
      ? out
      : ended(out, k, l, () => load(k, fn, scope), label)
  }
  // options you load, the props' or a group's, then their end while you load them, have more or a load failed.
  // Not while loading: the keyboard passing it, a click once failed
  const yours = (out: readonly Item[], src: MultiSelectGroup, k: string) =>
    src.loading || src.onLoadMore || src.loadError
      ? ended(
          out,
          k,
          {
            busy: src.loading,
            next: !!src.onLoadMore,
            error: !src.loading && src.loadError
          },
          () => src.loading || src.onLoadMore?.(),
          src.loadMoreLabel,
          true
        )
      : out
  // the tree with the loaders' lists in place: a group is copied only if that changes it
  const resolve = (items: readonly Item[], pre = ''): readonly Item[] => {
    let out = items
    items.forEach((opt, i) => {
      if (!isGroup(opt)) return
      const g = opt as MultiSelectGroup
      const key = pre + i
      const childs =
        typeof g.childs == 'function'
          ? listOf(
              g.childs,
              scope + '\0' + tag(g, key),
              key + '.',
              g.loadMoreLabel
            )
          : yours(resolve(g.childs, key + '.'), g, '\0' + key)
      if (childs === g.childs) return
      out === items && (out = [...items])
      const copy = { ...g, childs }
      // renderGroupTitle's: the options so far, no list ends, the groups in it theirs too (copied first)
      whole.set(copy, {
        ...g,
        childs: childs.filter((c) => !ends.has(c)).map((c) => whole.get(c) ?? c)
      })
      ;(out as Item[])[i] = copy
    })
    return out
  }
  // with loadOptions, `options` only name values: the menu lists what it loads
  const top = loadOptions
    ? listOf(loadOptions, term + '\0', '')
    : yours(
        resolve(base),
        { loading, onLoadMore, loadError } as MultiSelectGroup,
        '\0'
      )
  // the options of these values, by value, the first of each: one pass, done once all are found, not one per value.
  // String(): untyped JS often passes numbers
  const lookup = (opts: MultiSelectOption[], want: readonly string[]) => {
    const left = new Set(want.map(String))
    const out = new Map<string, MultiSelectOption>()
    for (const opt of opts) {
      if (!left.size) break
      const v = String(valueOf(opt))
      left.delete(v) && out.set(v, opt)
    }
    return out
  }
  // listed after the user's options: created values, plus with customValue the selected
  // ones the options lack. Once the options have one (they may arrive late, #12), it moves there
  const made = custom.filter((k) => typeof k == 'object')
  const extra = [
    ...custom.map((k) => (typeof k == 'object' ? valueOf(k) : k)),
    ...(customValue ? keys : [])
  ]
  const listed = lookup(names, extra)
  const ownOpts = lookup(made, extra)
  const customOpts = extra
    .filter((key, i, arr) => arr.indexOf(key) === i && !listed.has(String(key)))
    .map((key) => ownOpts.get(String(key)) ?? ourOpt(key))
  const options: readonly Item[] = customOpts.length
    ? [...top, { title: customValuesTitle, type: 'group', childs: customOpts }]
    : top
  const all = [...known, ...customOpts]
  const pool = [...names, ...customOpts]
  // looked up at render, so options arriving after mount resolve with no effect
  const byValue = lookup(pool, keys)
  const resolved = keys
    .map((key) => byValue.get(String(key)))
    .filter((opt) => opt !== undefined)
  const value = singleSelect ? resolved.slice(0, 1) : resolved
  // valueOf once per selected value: Options asks this twice for every option
  const selected = new Set(value.map(valueOf))
  // the form's value, and what tells a single select's pick happened while onCreate's promise was pending
  const joined = value.map(valueOf).join(',')
  const checkValueExist = (opt: MultiSelectOption) => selected.has(valueOf(opt))
  // no limit (null) is Infinity: one comparison checks it
  const max = limit ?? Infinity
  const chips = !singleSelect && !disableChip
  // a search field in the control, unless a value takes its place (single select, disableChip)
  const inline = !disableSearch && !searchInMenu && (!value.length || chips)
  // plain substring match: typed text is not a regex. Our { label, value } options skip a
  // user's filterOption, which expects their own shape. String(): untyped JS often passes numbers
  const matches = (opt: MultiSelectOption, text: string) =>
    filterOption && !ours.has(opt)
      ? filterOption(opt, text)
      : [textOf(opt), valueOf(opt)].some((s) =>
          String(s).toLowerCase().includes(text.toLowerCase())
        )
  // the Create "..." item, for text no option has as its value and canCreate allows. While onCreate's promise is
  // pending it shows loadingLabel and is disabled: one call. Once that failed, errorLabel, and it creates again
  const making = pending.get(term)
  const busy = making === true
  const create =
    customValue &&
    term &&
    !lookup(pool, [term]).size &&
    canCreate?.(term) !== false &&
    ourOpt(
      term,
      busy
        ? loadingLabel
        : making
          ? typeof errorLabel == 'function'
            ? errorLabel(making.e, () => make(term))
            : errorLabel
          : createLabel(term)
    )
  if (create) {
    create.disabled = busy
    attrs.set(create, {
      'aria-busy': busy || undefined,
      'data-error': (!busy && !!making) || undefined
    })
  }
  // loadOptions searches itself, onSearch's parent too. Searched here, your list's end stays: loading, more or failed
  const found = term
    ? (loadOptions || onSearch
        ? top
        : [
            ...all.filter((opt) => matches(opt, term)),
            ...top.slice(-1).filter((opt) => ends.has(opt))
          ]
      ).concat(create || [])
    : null
  // hideSelected: a picked option leaves a gap, as does a group that leaves with nothing to show (an empty one stays,
  // with its emptyDataLabel). Gaps keep the others' places in the tree, which hold submenus and groups open
  const unpicked = (items: readonly Item[]): Item[] =>
    items.map((opt) => {
      const g = opt as MultiSelectGroup
      const childs = isGroup(g) && unpicked(g.childs as Item[])
      if (!childs)
        return ends.has(opt) || !checkValueExist(opt as MultiSelectOption)
          ? opt
          : gap
      if (childs.length && childs.every((c) => c === gap)) return gap
      // the group as given counts for renderGroupTitle
      const copy = { ...g, childs }
      whole.set(copy, whole.get(g) ?? g)
      return copy
    })
  // the enabled options the menu lists, flat: a search's results, loaded ones, those in closed groups too
  const listing = () =>
    flatten(found || options).filter((opt) => opt !== create && !opt.disabled)
  // selectAll applies: in multi select
  const allRow = selectAll && !singleSelect
  const selectable = allRow ? listing() : []
  // selectAll's row, first: an option of ours, its value no option has
  const every =
    selectable.length > 0 &&
    Object.assign(
      ourOpt(
        '\0all',
        (selectAll === true ? 'Select all' : selectAll) as string
      ),
      { classes: `msl-select-all ${cn.selectAll ?? ''}` }
    )
  const tree = found || options
  const unhid = hideSelected ? unpicked(tree) : tree
  // nothing left: emptyDataLabel, but selectAll's row, which deselects then
  const left = unhid.every((opt) => opt === gap) ? [] : unhid
  // selectAll's row holds its place while it hides: the others keep theirs, which hold submenus and groups open as
  // a loader's options make it show
  const items =
    allRow && (every || left.length) ? [every || gap, ...left] : left
  const inputFld = useRef<HTMLInputElement>(null)
  const listId = `msl-listbox${useId()}`
  // the keyboard highlighted option: idx tells repeated values apart
  const [active, setActive] = useState<{ value: string; idx: number } | null>(
    null
  )
  const componentRef = useRef<HTMLDivElement>(null)
  // holds the control and, while open, the options: then it is a popover, in the top layer over the wrapper
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // closed, the menu stays until its exit animations end
  const [closing, setClosing] = useState(false)
  const present = menuOpen || closing
  // or with searchInMenu atop the open menu, next to any value
  const showSearch = inline || (!disableSearch && searchInMenu && present)
  // the combobox: the search field while it takes keys, else the wrapper. Closing, a searchInMenu field is inert
  const host = inline || (!disableSearch && searchInMenu && menuOpen)
  const searchRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  // the open box's parts but the control: a search field in the menu, menuHeader, the listbox, menuFooter
  const parts = () => [
    searchRef.current,
    headRef.current,
    listRef.current,
    footRef.current
  ]
  // picked on open: the menu goes above the input
  const [up, setUp] = useState(false)
  // the latest: an inline one would restart the open menu's listeners on every parent render
  const onClose = useRef(onMenuClose)
  onClose.current = onMenuClose

  // the deepest open submenu, by key: the ones around it are open too
  const [sub, setSub] = useState('')
  // collapsible groups the user toggled, by key and title text: open unless `collapsed`. New options may put
  // another group in that place.
  // ponytail: a JSX title has no text, so groups with them that swap places swap states too; a group id if that matters
  const [flipped, setFlipped] = useState<string[]>([])
  const opener = (s: string) => (g: MultiSelectGroup, key: string) =>
    g.type === 'submenu'
      ? (s + '.').startsWith(key + '.')
      : !g.collapsible || !g.collapsed !== flipped.includes(tag(g, key))
  const isOpen = opener(sub)
  // the rows the keyboard moves over: options, and the titles of submenus and collapsible groups. None while closed.
  // ponytail: walks every open row each render (a key, a hover), renderList's too; memoize on items, sub, flipped if 100k lag
  const shown = present ? walk(items, isOpen) : []
  // an option by value, a title by its place in the tree: either holds through a search or a pick. A list's end,
  // never highlighted, never takes a title's place
  const idOf = ({ opt, key }: Row) =>
    isGroup(opt) ? '\0' + key : ends.has(opt) ? '\0\0' + key : valueOf(opt)
  // by id once the list changes under it (search, pick, a submenu opening above it)
  const activeIdx = !active
    ? -1
    : shown[active.idx] && idOf(shown[active.idx]) === active.value
      ? active.idx
      : shown.findIndex((r) => idOf(r) === active.value)
  const row = shown[activeIdx]

  useEffect(() => {
    if (menuOpen) return
    setActive(null)
    tried.clear()
  }, [menuOpen])

  // loads list k's next part (its first, or again after a failure) unless one is on the way
  const load = (k: string, fn: MultiSelectLoader, search: string) => {
    const l = lists.get(k)
    if (l?.busy) return
    const busy = new AbortController()
    const was: Loaded = { items: [], ...l, busy, error: false }
    lists.set(k, was)
    update()
    // a loader that throws, or returns no options, fails
    new Promise<MultiSelectLoaded>((ok) =>
      ok(fn({ search, next: l?.next, signal: busy.signal }))
    )
      .then((r) => {
        // an array's options are itself
        const { options = r, next } = r as {
          options?: readonly Item[]
          next?: unknown
        }
        return { items: [...was.items, ...(options as readonly Item[])], next }
      })
      .catch((error) => ({ ...was, busy: undefined, error: error || true }))
      .then((v) => {
        // stopped, its list gone or replaced: an aborted fetch rejects, a loader that ignores the signal may still
        // resolve, and a new loadKey's stop comes after its render
        if (lists.get(k) !== was) return
        lists.set(k, v)
        update()
      })
  }

  // preload: loadOptions' first list loads before the menu first opens, on mount (and a new loadKey) or with
  // 'intent' as the pointer enters or focus arrives
  const warm = () =>
    preload && loadOptions && !lists.has('\0') && load('\0', loadOptions, '')
  // the wrapper's handlers for it: yours first, as with onKeyDown
  const intent =
    <E,>(yours?: (e: E) => void) =>
    (e: E) => {
      yours?.(e)
      warm()
    }
  // the old loadKeys' lists go, their loads stopped as below
  useEffect(() => {
    byKey.splice(0, byKey.length, [loadKey, lists])
    preload === true && warm()
  }, [loadKey])

  // onSearch hears of each change, not the first text
  const said = useRef(term)
  useEffect(() => {
    said.current != term && onSearch?.((said.current = term))
  }, [term])

  // another search, a new loadKey, or unmounted: the loads on the way stop, and a list whose first part stopped loads
  // again once it shows, as it may already: rendered busy, it renders again. Stopped once it commits: an abort's
  // listeners may set state, never in a render. A list that leaves the view (its group or submenu closes, the menu, a
  // virtual list's row) loads on
  useEffect(
    () => () =>
      lists.forEach((l, k) => {
        if (!l.busy) return
        l.busy.abort()
        l.next ? lists.set(k, { ...l, busy: undefined }) : lists.delete(k)
        update()
      }),
    [scope, lists]
  )

  // once per open: closes can overlap, as when a pick's onChange moves focus out (a close) and the pick closes too
  const opened = useRef(false)
  // the selection as last set or rendered: a chip's onDelete may run late (after an exit animation)
  const latest = useRef(value)
  // the element with keyboard focus (focus-visible) when a chip was deleted, or the search field a pick may remove
  const lost = useRef<Element | null>(null)

  // with `open` the parent opens and closes it: ours are requests
  const openCtl = openProp !== undefined
  const show = () => {
    const r = componentRef.current!.getBoundingClientRect()
    const below = viewHeight() - r.bottom
    opened.current = true
    // up only if that has more room: else it goes off the top of the page
    setUp(below < 200 && r.top > below)
    setMenuOpen(true)
    // back mid exit: the same menu, without the search its close was to clear. A pick hides the field in single select
    closing && setQuery('', 'close')
    setClosing(false)
  }
  // the dropdown asked yours to open: focus goes in as it does, if it hasn't left meanwhile
  const asked = useRef(false)
  const open = () => {
    if (!openCtl) return show()
    asked.current = true
    onMenuOpen()
  }

  // where the close yours was asked for sends focus, once yours closes it
  const goTo = useRef<HTMLElement | null>(undefined)
  const closeMenu = (to?: HTMLElement | null) => {
    if (!opened.current) return
    openCtl ? (goTo.current = to) : hide(to)
    onClose.current()
  }

  // focus moves to `to` first, then out of the menu: an inert or removed focused element drops it to the body.
  // Submenus close with it, each leaving on its own
  const hide = (to?: HTMLElement | null) => {
    if (!opened.current) return
    opened.current = false
    to?.focus({ preventScroll: true })
    // no refs while a Suspense boundary hides it: nothing in it has focus, and it closes as React shows it again
    const ctl = boxRef.current?.firstChild as HTMLElement | undefined
    ctl &&
      parts().some((el) =>
        el?.contains((ctl.getRootNode() as Document).activeElement)
      ) &&
      ((inline && inputFld.current) || componentRef.current!).focus({
        preventScroll: true
      })
    // without exit CSS it goes now, with the search it shows: no render of it closing
    !ctl || exits(ctl) ? setClosing(true) : setQuery('', 'close')
    setMenuOpen(false)
    setSub('')
  }

  // yours opens and closes it, at once: a key on the wrapper that asked it to open types into the field
  useSync(() => {
    openCtl && (openProp ? show() : hide(goTo.current))
    goTo.current = undefined
  }, [openProp])

  // while closing: data-closing on the box, its menu inert. Then it goes, with the search text it shows, unless that
  // changed meanwhile: edited (Backspace, a paste), not cleared by a reopen
  const whileClosing = () => {
    const ctl = boxRef.current!.firstChild as HTMLElement
    const els = parts()
    els.forEach((el) => el?.setAttribute('inert', ''))
    const was = query
    let on = true
    leave(ctl, () => {
      if (!on) return
      setClosing(false)
      shows.current === was && setQuery('', 'close')
    })
    return () => {
      on = false
      ctl.removeAttribute('data-closing')
      els.forEach((el) => el?.removeAttribute('inert'))
    }
  }

  // placed while shown, open or closing
  useEffect(() => {
    if (!present) return
    const root = componentRef.current!
    const box = boxRef.current!
    const list = listRef.current!
    // a fixed or sticky dropdown (in a modal <dialog>, a popover) stays put as the page scrolls, as a fixed box does.
    // Else absolute, in page coordinates: the page carries it with no frame of lag. Up the flat tree: slotted into a dialog
    let pinned = false
    for (
      let el: Element | null | undefined = root;
      el && !pinned;
      el =
        el.assignedSlot ||
        el.parentElement ||
        (el.parentNode as ShadowRoot).host
    )
      pinned = /fixed|sticky/.test(getComputedStyle(el).position)
    const minHeight = root.style.minHeight
    // in the top layer: over clipping parents, stacking contexts and a modal dialog. The attribute only while open:
    // until shown, a popover is display: none. Shown before it paints: an open is a click or a key, whose effects run at once.
    // The UA's popover look undone inline, so it inherits and shows nothing of its own: the box inside has the looks
    box.style.cssText = `position:${pinned ? 'fixed' : 'absolute'};inset:auto;margin:0;padding:0;border:0;background:none;color:inherit;overflow:visible;transform-origin:0 ${up ? '100%' : 0}`
    // missing in jsdom, whose UA stylesheet would still hide a [popover]: a user's tests couldn't focus or query the menu
    pop(box)
    // over the wrapper, the menu below (or above) it, as tall as the viewport leaves room for.
    // Follows the wrapper through scrolls, resizes, its own growth and layout shifts.
    // ponytail: three rects (four with searchInMenu) read per frame while open; scroll/resize listeners + ResizeObserver if it ever shows in a profile
    let frame = 0
    const follow = () => {
      // in a scaled part of the page (a zoomable canvas) it scales as the dropdown does: the top layer drops
      // ancestors' transforms. Drawn size over layout size, which rounds to whole pixels
      const w = root.offsetWidth
      const { width } = root.getBoundingClientRect()
      const s = w && Math.abs(width - w) >= 1 ? width / w : 1
      // first: the control's height depends on them
      box.style.width = width / s + 'px'
      box.style.setProperty('scale', s == 1 ? '' : s + '')
      // the control's own height: the wrapper keeps it, as the box left the flow. From the box's edge to the menu's
      // (a searchInMenu field heads it opening down), plus the border and padding there: not the box less the menu,
      // which may overflow its grid row as CSS animates the row from 0fr. Drawn: offsetHeight rounds
      // the menu's parts but the listbox: its room leaves theirs
      const sh = [searchRef, headRef, footRef].reduce(
        (n, r) => n + (r.current?.getBoundingClientRect().height || 0),
        0
      )
      const b = box.getBoundingClientRect()
      const m = (
        up
          ? footRef.current || list
          : searchRef.current || headRef.current || list
      ).getBoundingClientRect()
      const css = getComputedStyle(box.firstChild as Element)
      const row = up
        ? b.bottom -
          m.bottom +
          (px(css.borderTopWidth) + px(css.paddingTop)) * s
        : m.top -
          b.top +
          (px(css.borderBottomWidth) + px(css.paddingBottom)) * s
      root.style.minHeight = row / s + 'px'
      // then where it stands: its height back, it may move (in a centered dialog)
      const r = root.getBoundingClientRect()
      const h = viewHeight()
      const y = pinned ? 0 : scrollY
      const bottom = r.top + row
      box.style.left = r.left + (pinned ? 0 : scrollX) + 'px'
      box.style[up ? 'bottom' : 'top'] =
        (up ? h - bottom - y : r.top + y) + 'px'
      // on the listbox, the one reader: the stylesheet registers it non-inherited, so a scroll restyles no option
      list.style.setProperty(
        '--msl-menu-room',
        ((up ? r.top : h - bottom) - sh) / s + 'px'
      )
      // missing in jsdom without pretendToBeVisual: a user's tests would crash on every open
      typeof requestAnimationFrame != 'undefined' &&
        (frame = requestAnimationFrame(follow))
    }
    // now, not next frame: placed before it paints
    follow()
    return () => {
      frame && cancelAnimationFrame(frame)
      // without the attribute it is hidden, and back in the flow
      box.removeAttribute('popover')
      box.removeAttribute('style')
      root.style.minHeight = minHeight
    }
  }, [present, up])

  // listen only while open, so onMenuClose fires once per open -> closed
  useEffect(() => {
    if (!menuOpen) return
    const root = componentRef.current!
    // a scrolling parent clipped it away: close rather than float over that parent's edge.
    // Opened out of view (a key on the focused dropdown, scrolled away): scroll it back instead, or the top layer
    // would show it outside that parent. Missing in jsdom: a user's tests would crash on every open
    let first = true
    const seen =
      typeof IntersectionObserver != 'undefined' &&
      new IntersectionObserver((es) => {
        // the latest report is the last
        const vis = es[es.length - 1].isIntersecting
        first && !vis
          ? root.scrollIntoView?.({ block: 'nearest' })
          : vis || closeMenu()
        first = false
      })
    seen && seen.observe(root)
    // composedPath: in a shadow root the document sees the host as target
    const inside = (e: Event) => e.composedPath().includes(root)
    // Escape from inside goes through onKeyDown, after attr.onKeyDown.
    // Prevented: it closes the menu, not a surrounding <dialog> or popover too
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || inside(e)) return
      e.preventDefault()
      closeMenu()
    }
    // clicks, and focus moving out
    const onOutside = (e: Event) => inside(e) || closeMenu()
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('click', onOutside, true)
    document.addEventListener('focusin', onOutside, true)
    return () => {
      seen && seen.disconnect()
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('click', onOutside, true)
      document.removeEventListener('focusin', onOutside, true)
    }
  }, [menuOpen])

  // after the popover is shown. A key on the wrapper that opened the menu types into the field:
  // a key's effects run before the browser types it
  useEffect(() => {
    if (!menuOpen) return
    // yours, opened from outside: focus stays there
    ;(!openCtl || asked.current) &&
      (inputFld.current || componentRef.current!).focus()
    asked.current = false
    // here, not in open(): a click's open isn't committed yet, so the menu is there for both. Yours asked already
    openCtl || onMenuOpen()
  }, [menuOpen])

  // after the menu's effect: a key that opens it (End) scrolls once it is placed, its height capped
  useEffect(() => {
    // scrollIntoView is missing in jsdom
    listRef.current
      ?.querySelector('.msl-option-focused')
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx])

  const setNewValue = (val: MultiSelectOption[]) => {
    // no change while disabled: a menu yours keeps open lists options, styled or not
    if (disabled) return
    const values = val.map(valueOf)
    // controlled: the parent may reject it, so the next delete starts from what it renders
    if (!controlled) {
      latest.current = val
      // a value that came as its option keeps it, to go on naming itself
      setOwn(val.map((opt) => (named.includes(opt) ? opt : valueOf(opt))))
    }
    onChange(values, val)
  }

  // selected fixed values: no chip delete, Backspace, clear or pick removes them
  const kept = value.filter((opt) => opt.fixed)
  // by value, as the chips read it: a repeated value's other rows stay in step
  const keptVals = new Set(kept.map(valueOf))
  // past the limit, unselected options show and announce as disabled. Single select replaces its value, so only
  // once that is fixed
  const full = singleSelect ? kept.length > 0 : value.length >= max
  // nothing changes these: a disabled option, a selected fixed one
  const stuck = (opt: MultiSelectOption) =>
    !!opt.disabled || keptVals.has(valueOf(opt))
  const isDisabled = (opt: MultiSelectOption) =>
    stuck(opt) || (full && !checkValueExist(opt))
  const cap = singleSelect ? 1 : max
  // a toggle of these selects: room under the limit, and one left to pick
  const more = (opts: MultiSelectOption[]) =>
    value.length < cap &&
    opts.some((opt) => !stuck(opt) && !checkValueExist(opt))
  // options at once, in one onChange: on adds those left to pick, each value once, up to the limit (one in single
  // select); off removes them but disabled and fixed ones
  const pickAll = (opts: MultiSelectOption[], on: boolean) => {
    const vals = new Map(opts.map((opt) => [valueOf(opt), opt]))
    setNewValue(
      on
        ? [
            ...value,
            ...[...vals.values()].filter(
              (opt) => !stuck(opt) && !checkValueExist(opt)
            )
          ].slice(0, Math.max(value.length, cap))
        : value.filter((opt) => stuck(opt) || !vals.has(valueOf(opt)))
    )
  }
  const toggle = (opts: MultiSelectOption[]) => pickAll(opts, more(opts))
  // selectAll's row shows selected once its click deselects
  every && !more(selectable) && selected.add(every.value)
  // titles are never disabled, a list's end never highlighted
  const live = (r: Row) =>
    !ends.has(r.opt) && (isGroup(r.opt) || !isDisabled(r.opt))

  // a created value: the text, or what onCreate makes of it (an option, a value), listed with the created values.
  // Nothing while its promise is pending, which adds it once settled, nor once cancelled
  const make = (text: string) => {
    if (pending.get(text) === true) return
    const r = onCreate ? onCreate(text) : text
    if (typeof (r as PromiseLike<unknown>)?.then != 'function')
      return r ? keep(r as string | MultiSelectOption) : undefined
    pending.set(text, true)
    update()
    const was = joined
    ;(r as PromiseLike<string | MultiSelectOption | false | null | void>).then(
      (v) => {
        pending.delete(text)
        // unmounted: nothing to add to
        componentRef.current && v && arrived.push([keep(v), text, was])
        update()
      },
      (e) => {
        pending.set(text, { e: e || true })
        update()
      }
    )
  }
  const keep = (r: string | MultiSelectOption) => {
    setCustom((c) => [...c, r])
    return typeof r == 'object' ? r : ourOpt(r)
  }

  // quiet: added, the menu and search left as they are
  const addValue = (newValObj: MultiSelectOption, quiet?: boolean) => {
    if (newValObj === every) return toggle(selectable)
    if (stuck(newValObj)) return
    // past the limit an unselected pick only calls onChange, the value as it is: no Create, the search and menu stay
    if (full && !checkValueExist(newValObj)) return setNewValue(value)
    // hidden once picked: the highlight goes on to the next row at its level, else back to one before. Not to one the
    // pick hides (its value, a group it leaves with nothing to show), nor to an option it disables (the limit reached)
    const v = valueOf(newValObj)
    const fills = singleSelect ? !!newValObj.fixed : value.length + 1 >= max
    const goes = (o: Row['opt']): boolean =>
      o === gap ||
      (isGroup(o)
        ? !!o.childs.length && (o.childs as Row['opt'][]).every(goes)
        : !ends.has(o) && valueOf(o) === v)
    const to =
      hideSelected &&
      row?.opt === newValObj &&
      [
        ...shown.slice(activeIdx + 1),
        ...shown.slice(0, activeIdx).reverse()
      ].find(
        (r) =>
          r.level === row.level &&
          live(r) &&
          (isGroup(r.opt) || !fills) &&
          !goes(r.opt)
      )
    to && setActive({ value: idOf(to), idx: activeIdx })
    // picking Create (click, Enter or comma) adds the typed text as an option. Already selected, it stays
    if (newValObj === create) {
      const opt = make(newValObj.value)
      if (!opt || checkValueExist(opt)) return
      newValObj = opt
    }
    // a selected one toggles off (single select: to none)
    setNewValue(
      checkValueExist(newValObj)
        ? value.filter((itm) => valueOf(itm) !== valueOf(newValObj))
        : singleSelect
          ? [newValObj]
          : [...value, newValObj]
    )
    if (quiet) return
    // unset closeOnSelect: single select closes, multi select stays open.
    // The value takes the search field's place, maybe in a later commit: focus the wrapper, not the field.
    // Left open, the search clears (closing, it does once the menu goes) and focus goes to the wrapper
    // if the field goes (click, Enter, comma). opened, not menuOpen: Enter in the closed field opens the menu in this same event
    if (opened.current && (closeOnSelect ?? singleSelect)) {
      closeMenu(singleSelect || disableChip ? componentRef.current : null)
      // yours may stay open: the search clears as on any pick, and focus comes back if the field goes
      if (!openCtl) return
    }
    setQuery('', 'pick')
    lost.current = inputFld.current
  }

  // pasted text with commas, tabs or newlines picks each part, in multi select: an option whose label text or value
  // it is, else, with customValue, one it creates. What doesn't go in goes in the field at the caret, the text there
  // kept; if nothing does, or it is one part, the paste is the browser's
  const paste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const parts = e.clipboardData
      .getData('text')
      .split(/[,\t\n]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (singleSelect || parts.length < 2) return
    const next = [...value]
    const left: string[] = []
    // each part once, in any case
    const done = new Set<string>()
    // pending onCreates, which add their own once settled: they hold room
    let wait = 0
    // options by label text and value, in any case, the first of each: one pass, not one per part
    const by = new Map<string, MultiSelectOption>()
    for (const o of pool)
      for (const s of [textOf(o), valueOf(o)]) {
        const k = String(s).toLowerCase()
        by.has(k) || by.set(k, o)
      }
    for (const p of parts) {
      const t = p.toLowerCase()
      if (done.has(t)) continue
      done.add(t)
      const opt =
        by.get(t) ??
        (customValue && next.length + wait < max && canCreate?.(p) !== false
          ? make(p)
          : undefined)
      // selected already, or pending
      if (
        opt
          ? next.some((o) => valueOf(o) === valueOf(opt))
          : pending.get(p) === true
      )
        opt || wait++
      else if (opt && !stuck(opt) && next.length + wait < max) next.push(opt)
      else left.push(p)
    }
    if (left.length == done.size) return
    e.preventDefault()
    next.length > value.length && setNewValue(next)
    const { selectionStart: a, selectionEnd: b } = e.currentTarget
    setQuery(query.slice(0, a!) + left.join(', ') + query.slice(b!))
  }

  const deleteValue = (opt: MultiSelectOption) =>
    setNewValue(latest.current.filter((itm) => valueOf(itm) !== valueOf(opt)))

  // the clear button
  const clearByUser = () => {
    // without the stylesheet's pointer-events: none it is still clickable
    if (disabled) return
    setNewValue(kept)
    onClear()
  }

  // a keyboard delete unmounts the focused button: keep focus in the widget. Disabled, the field takes none
  const refocus = () =>
    ((!disabled && inputFld.current) || componentRef.current!).focus({
      preventScroll: true
    })

  useEffect(() => {
    latest.current = value
    const el = lost.current
    lost.current = null
    // the delete unmounted it (the last chip, or a chip keyed by value), or the pick the search field, and focus fell to the body.
    // A late commit (async onChange) may find the user moved on: leave their focus alone
    el &&
      !el.isConnected &&
      el.ownerDocument.activeElement === el.ownerDocument.body &&
      refocus()
  })

  // after that one: the pick's search field to refocus is for the next render's to check
  useEffect(() => {
    const got = arrived.shift()
    if (!got) return
    const [opt, text, was] = got
    // a pick while the field shows its text; else quiet: text typed since, or what a paste left, stays. Not over a
    // single select's value picked meanwhile: listed, not selected
    checkValueExist(opt) ||
      (singleSelect && was !== joined) ||
      addValue(opt, text !== term)
    arrived.length && update()
  })

  // disabled while open: it closes, so no pick comes from the open menu, styled or not.
  // Focus moves to the wrapper: a disabled field or a removed option would drop it
  useEffect(() => {
    disabled && closeMenu(componentRef.current)
  }, [disabled])

  // Not document.activeElement: in a shadow root that is the host. A focused shadow host only
  // stands for the element focused inside it, the one that can match :focus-visible.
  // No ref once unmounted: a late onDelete still deletes
  const keyboardFocus = () => {
    const outer = (componentRef.current?.getRootNode() as Document | undefined)
      ?.activeElement
    let el = outer
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement
    return el?.matches(':focus-visible') ? outer! : null
  }

  // the target or an ancestor below the wrapper has attr: any icon depth, never the wrapper or above.
  // A target outside it counts too: a user portal's, or a chip a sync onChange removed mid-event
  const marked = (target: EventTarget, attr: string) => {
    const root = componentRef.current!
    const el = (target as Element).closest(`[${attr}]`)
    return !root.contains(target as Node) || (el !== root && root.contains(el))
  }

  const openMenu = ({ target }: React.SyntheticEvent) => {
    if (disabled || marked(target, 'data-clickable')) return
    if (!menuOpen) open()
    else if (marked(target, 'data-handle')) closeMenu()
    // not a close: an option click bubbles here and must not undo closeOnSelect.
    // Nor a refocus once closed: an onChange may have moved focus out
    else opened.current && inputFld.current?.focus()
  }

  // moves the highlight over the enabled rows of its submenu (or the top), staying put at either end
  const highlight = (key: string) => {
    const dir = key === 'ArrowDown' || key === 'Home' ? 1 : -1
    const level = row?.level ?? ''
    // closed: the rows it opens with
    const rows = present ? shown : walk(items, isOpen)
    let i =
      key === 'Home'
        ? -1
        : key === 'End' || (activeIdx < 0 && dir < 0)
          ? rows.length
          : activeIdx
    for (i += dir; i >= 0 && i < rows.length; i += dir) {
      const r = rows[i]
      if (r.level !== level) continue
      // a list's end on the way down loads more, or again: the keyboard can't scroll it into view
      dir > 0 && ends.has(r.opt) && r.opt.load()
      if (live(r)) return setActive({ value: idOf(r), idx: i })
    }
  }

  // a title's click or Enter: a submenu opens, a collapsible group toggles
  const expand = (r: Row) => {
    const t = tag(r.opt, r.key)
    r.opt.type === 'submenu'
      ? setSub(r.key)
      : setFlipped(
          flipped.includes(t) ? flipped.filter((k) => k !== t) : [...flipped, t]
        )
  }

  // the keyboard opens a submenu, the highlight on its first enabled row: found in the rows the next render has
  const enter = (r: Row) => {
    setSub(r.key)
    const rows = walk(items, opener(r.key))
    const i = rows.findIndex((x) => x.level === r.key && live(x))
    i >= 0 && setActive({ value: idOf(rows[i]), idx: i })
  }

  // closes submenu k, and any in it, the highlight back on its title
  const back = (k: string) => {
    const i = shown.findIndex((r) => r.key === k)
    setSub(shown[i].level)
    setActive({ value: idOf(shown[i]), idx: i })
  }

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // a pause on a row opens its submenu and closes the others at and below its level.
  // A pause: rows the pointer crosses on its way into a submenu leave it open
  const hover = (i: number) => {
    const r = shown[i]
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () =>
        opened.current && setSub(r.opt.type === 'submenu' ? r.key : r.level),
      100
    )
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    attr?.onKeyDown?.(e)
    // an IME composition's keys: its Enter confirms the text, not a pick.
    // Safari ends the composition before the keydown, leaving only keyCode 229
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const { key, target } = e
    if (menuOpen && key === 'Escape') {
      // it closes the menu, not a surrounding <dialog> or popover too. Stopped too: a modal
      // library's onKeyDown above it in the React tree may ignore defaultPrevented (MUI's does).
      // In a submenu, it closes that one
      e.preventDefault()
      e.stopPropagation()
      return row?.level ? back(row.level) : closeMenu()
    }
    // Tab moves focus on in page order, and closes the menu. Unless the menu has stops of its own (focusable JSX):
    // then Tab steps through the open box, and focus leaving it closes the menu.
    // ponytail: tabIndex >= 0 counts disabled and hidden elements as stops; filter them if JSX in the menu has them
    if (
      menuOpen &&
      key === 'Tab' &&
      ![listRef, headRef, footRef].some((r) =>
        [...(r.current?.querySelectorAll<HTMLElement>('*') ?? [])].some(
          (el) => el.tabIndex >= 0
        )
      )
    )
      // From in the listbox (a clicked option) or a searchInMenu field, which the close makes inert: focus moves to the listbox,
      // the browser tabs on from it, then it closes. Firefox and Safari lose the place of a removed focused element, Firefox of a clicked option.
      // Shift+Tab may land back on a searchInMenu field: the close brings focus to the wrapper
      return listRef.current!.contains(target as Node) ||
        searchRef.current?.contains(target as Node)
        ? (listRef.current!.focus(), setTimeout(() => closeMenu()))
        : closeMenu()
    // our listbox or a title row, when the target is JSX in them: an empty state's button, a control in a title.
    // A control in an option's label leaves its keys to the dropdown, as the option's own Enter picks it
    const box = (target as Element).closest('[role=option],[role=listbox]')
    // chips, the clear button and that JSX handle their own keys. Not JSX that holds rows: renderList's scroller,
    // which a click between them focuses
    if (
      disabled ||
      marked(target, 'data-clickable') ||
      (box !== target &&
        (box?.id === listId || box?.hasAttribute('aria-expanded')) &&
        !(target as Element).querySelector('[role=option]'))
    )
      return
    // the first result a click could pick: shown, not in a closed submenu or a collapsed group, nor hidden by
    // hideSelected, nor selectAll's row. In the rows as rendered, whose places hold groups and submenus open.
    // Closing, none: that search goes with the menu
    const first =
      !closing &&
      found &&
      walk(items, isOpen).find(
        ({ opt }) =>
          opt !== every && !isGroup(opt) && !ends.has(opt) && !stuck(opt)
      )?.opt
    // into a submenu toward its side, as the stylesheet places it: left where its :dir(rtl) matches (a dir attribute,
    // not CSS direction). In :is(), which drops it where unknown (before Chrome 120, as the stylesheet does) rather than throw
    const [into, out] = e.currentTarget.matches(':is(:dir(rtl))')
      ? ['ArrowLeft', 'ArrowRight']
      : ['ArrowRight', 'ArrowLeft']
    if (key === 'Enter' && row) {
      e.preventDefault()
      row.opt.type === 'submenu'
        ? enter(row)
        : isGroup(row.opt)
          ? expand(row)
          : addValue(row.opt)
    } else if (
      (key === into && row?.opt.type === 'submenu') ||
      (key === out && row?.level)
    ) {
      // else the caret moves in the search field
      e.preventDefault()
      key === into ? enter(row) : back(row.level)
    } else if ((key === 'Enter' || key === ',') && first) {
      // Prevented: no form submit, and the comma stays out of the field.
      // Opened first, as any key on the closed field opens it (text pasted there)
      e.preventDefault()
      openMenu(e)
      addValue(first)
    } else if (key === 'Backspace' && target === inputFld.current && !query) {
      // chips only: with searchInMenu the field is there next to a single value or count too.
      // The last that isn't fixed
      const last = value.filter((opt) => !opt.fixed).at(-1)
      deleteOnBackspace && chips && last && deleteValue(last)
    } else if (
      /^Arrow(Down|Up)$/.test(key) ||
      // with search text, Home/End move the caret
      (/^(Home|End)$/.test(key) && !(target === inputFld.current && query))
    ) {
      e.preventDefault()
      highlight(key)
      openMenu(e)
    } else if (
      key === 'Enter' ||
      (key.length === 1 && !e.ctrlKey && !e.metaKey)
    ) {
      // Space on the wrapper would scroll the page; Enter in the search would submit a form
      ;((key === ' ' && target === e.currentTarget) || key === 'Enter') &&
        e.preventDefault()
      openMenu(e)
    }
  }

  const combobox = {
    // the wrapper's ARIA (label, description, invalid, required) names whichever element is the combobox
    ...Object.fromEntries(
      Object.entries(attr ?? {}).filter(([k]) => k.startsWith('aria-'))
    ),
    role: 'combobox',
    'aria-expanded': menuOpen,
    'aria-haspopup': 'listbox',
    'aria-controls': menuOpen ? listId : undefined,
    'aria-activedescendant':
      activeIdx < 0 ? undefined : `${listId}-${activeIdx}`,
    'aria-disabled': disabled,
    // a fixed single value: no option in the menu can change it
    'aria-readonly': (singleSelect && full) || undefined
  } as const

  const search = showSearch && (
    <input
      placeholder={inline ? placeholder : searchPlaceholder}
      className={`msl-input ${cn.input ?? ''}`}
      disabled={disabled}
      // the browser's own history list would cover the menu
      autoComplete='off'
      value={query}
      onChange={(e) => {
        setActive(null)
        setQuery(e.target.value)
      }}
      onPaste={paste}
      ref={inputFld}
      {...(host && combobox)}
    />
  )

  const list = (
    <div
      ref={listRef}
      className={`msl-options ${cn.menu ?? ''}`}
      id={listId}
      role='listbox'
      aria-multiselectable={!singleSelect}
      // else Chrome makes this scroller a tab stop, as no option is tabbable
      tabIndex={-1}
      // a flex column in the stylesheet: a scroller of renderList's shrinks to the menu's height
      data-custom={renderList && ''}
      // the key of loadOptions' list: no group's
      aria-busy={
        !!(lists.get(term + '\0')?.busy || (!loadOptions && loading)) ||
        undefined
      }
    >
      {items.length ? (
        <Options
          opts={items}
          expand={(i) => expand(shown[i])}
          {...{
            isOpen,
            hover,
            addValue,
            checkValueExist,
            isDisabled,
            listId,
            activeIdx,
            valueOf,
            labelOf,
            textOf,
            cn,
            renderList,
            term,
            groupIcon,
            submenuIcon,
            renderGroupTitle,
            toggle,
            loadingLabel,
            errorLabel,
            loadAhead
          }}
        />
      ) : (
        <div className={`msl-option msl-option-disable ${cn.empty ?? ''}`}>
          {typeof emptyDataLabel == 'function'
            ? emptyDataLabel(term)
            : emptyDataLabel}
        </div>
      )}
    </div>
  )

  // menuHeader and menuFooter: around the listbox, outside it. Their keys and clicks are theirs (data-clickable); a
  // click keeps focus where it is, but on a form field
  const slot = (
    s: MultiSelectProps['menuHeader'],
    ref: React.RefObject<HTMLDivElement | null>,
    part: string,
    c?: string
  ) =>
    s != null &&
    s !== false && (
      <div
        ref={ref}
        data-clickable
        onMouseDown={(e) =>
          (e.target as Element).closest('input,textarea,select') ||
          e.preventDefault()
        }
        className={`msl-menu-${part} ${c ?? ''}`}
      >
        {typeof s == 'function'
          ? s(
              ((opts) => ({
                search: term,
                options: opts,
                selected: opts.filter(checkValueExist).length,
                selectAll: () => pickAll(opts, true),
                deselectAll: () => pickAll(opts, false)
              }))(listing())
            )
          : s}
      </div>
    )

  // with searchInMenu the field heads the options, on the side away from the control when opening upward
  const menu = (
    <>
      {!inline && search && (
        <div ref={searchRef} className={`msl-search ${cn.search ?? ''}`}>
          {search}
        </div>
      )}
      {slot(menuHeader, headRef, 'header', cn.menuHeader)}
      {list}
      {slot(menuFooter, footRef, 'footer', cn.menuFooter)}
    </>
  )

  return (
    <div
      ref={componentRef}
      {...attr}
      {...(!host && combobox)}
      onClick={openMenu}
      onFocus={intent(attr?.onFocus)}
      onPointerEnter={intent(attr?.onPointerEnter)}
      // focus leaving it: an open it asked for and yours ignored is over, a later open of yours is from outside.
      // Not the ref: a Suspense boundary hiding it detaches that, and the hidden field loses focus
      onBlur={(e) => {
        attr?.onBlur?.(e)
        e.currentTarget.contains(e.relatedTarget) || (asked.current = false)
      }}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      data-disabled={disabled || undefined}
      data-loading={spin || undefined}
      style={style}
      className={`msl-wrp msl-vars ${className || ''} ${disabled ? 'msl-disabled' : ''}${
        full && !singleSelect ? ' msl-limit-reached' : ''
      }`}
    >
      <input name={name} type='hidden' value={joined} />
      {/* the popover while open, set up by the open menu's effect. Unstyled: the box inside has the looks */}
      <div ref={boxRef}>
        <div
          data-open={present || undefined}
          data-up={(present && up) || undefined}
          className={`msl ${present ? (up ? 'msl-active-up' : 'msl-active') : ''} ${cn.control ?? ''}`}
        >
          {/* in DOM order, so it stacks right with no stylesheet */}
          {present && up && menu}
          <div className={`msl-input-wrp ${cn.values ?? ''}`}>
            {chips && (
              // data-clickable: clicks and keys on any chip markup are the chip's, not the menu's.
              // display: contents keeps this box out of the layout, styled or not
              <div data-clickable style={{ display: 'contents' }}>
                {value.slice(0, maxChips).map((val, i) => (
                  <React.Fragment key={i}>
                    {customChip({
                      label: labelOf(val, asValue),
                      value: valueOf(val),
                      option: val,
                      index: i,
                      total: value.length,
                      disabled,
                      fixed: !!val.fixed,
                      classNames: cn,
                      onDelete: () => {
                        // a custom chip may stay tabbable while disabled, or keep its delete when fixed
                        if (disabled || val.fixed) return
                        // before the delete: an onChange that flushes sync unmounts the chip right away
                        lost.current = keyboardFocus()
                        deleteValue(val)
                      }
                    })}
                  </React.Fragment>
                ))}
              </div>
            )}
            {chips && value.length > maxChips && (
              // the rest, past maxChips: a click opens the menu
              <div data-more className={`msl-chip ${cn.chip ?? ''}`}>
                {moreChipsLabel(value.length - maxChips)}
              </div>
            )}
            {!singleSelect && disableChip && value.length > 0 && (
              <span className={`msl-single-value ${cn.singleValue ?? ''}`}>
                {value.length === 1 ? (
                  labelOf(value[0], asValue)
                ) : (
                  <>
                    {value.length} {chipAlternateText}
                  </>
                )}
              </span>
            )}
            {singleSelect && value.length === 1 && (
              <span className={`msl-single-value ${cn.singleValue ?? ''}`}>
                {labelOf(value[0], asValue)}
              </span>
            )}
            {inline && search}
            {!inline && value.length < 1 && (
              <div
                data-placeholder={placeholder}
                className={`msl-input ${cn.input ?? ''}`}
              />
            )}
          </div>
          {(clearable || downArrow) && (
            <div className={`msl-actions ${cn.actions ?? ''}`}>
              {clearable && value.length > kept.length && (
                <div
                  role='button'
                  // it stops the menu from opening
                  data-clickable
                  aria-label={clearLabel}
                  aria-disabled={disabled}
                  onClick={clearByUser}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      clearByUser()
                      refocus()
                    }
                  }}
                  tabIndex={disabled ? -1 : 0}
                  className={`msl-btn msl-clear-btn ${cn.clearButton ?? ''}`}
                >
                  {closeIcon || <CloseIcon />}
                </div>
              )}
              {downArrow && (
                // decorative: the combobox handles the keyboard
                <div
                  aria-hidden='true'
                  data-handle
                  className={`msl-btn msl-arrow-btn ${cn.arrowButton ?? ''}`}
                >
                  {downArrowIcon || <DownIcon />}
                </div>
              )}
            </div>
          )}
          {present && !up && menu}
        </div>
      </div>
      {/* after the box: a Suspense reveal runs layout effects in order, so its refs are back by then */}
      {closing && <During run={whileClosing} />}
    </div>
  )
}

export default MultiSelect as typeof PublicMultiSelect
