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
  MultiSelectOption,
  MultiSelectProps
} from './index'
import Options, { isGroup, leave, pop, walk } from './Options'
import type { Row } from './Options'

type Item = MultiSelectOption | MultiSelectGroup

// Defaults as parameter defaults: React 19's jsx runtime ignores defaultProps on function components.
const noop = () => {}
const optLabel = (opt: MultiSelectOption) => opt.label
const optValue = (opt: MultiSelectOption) => opt.value
const noStyle = {}
const createText = (text: string) => `Create "${text}"`
// the viewport less a classic scrollbar. innerHeight too: quirks mode makes the root as tall as the page
const viewHeight = () =>
  Math.min(innerHeight, document.documentElement.clientHeight)

// options we create, { label, value }: the user's getters only know their own shape
const ours = new WeakSet<MultiSelectOption>()
const ourOpt = (value: string, label = value) => {
  const opt: MultiSelectOption = { label, value }
  ours.add(opt)
  return opt
}
// every option, groups and submenus unwrapped, open or not
function flatten(items: readonly Item[], out: MultiSelectOption[] = []) {
  for (const opt of items) {
    if (isGroup(opt)) flatten((opt as MultiSelectGroup).childs, out)
    else out.push(opt as MultiSelectOption)
  }
  return out
}
// runs run while mounted, its cleanup in the commit that unmounts it: a layout effect, never on the server
// (where React 18 warns about one) as it mounts on a user action
function During({ run }: { run: EffectCallback }) {
  useLayoutEffect(run, [])
  return null
}

function MultiSelect({
  options: userOptions,
  downArrowIcon,
  closeIcon,
  clearable = true,
  downArrow = true,
  onChange = noop,
  getLabel = optLabel,
  getValue = optValue,
  filterOption,
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
  onClear = noop,
  chipAlternateText = 'Item Selected',
  clearLabel = 'Clear',
  createLabel = createText,
  customValuesTitle = 'Custom Values',
  customChip = Chip,
  closeOnSelect,
  disableSearch = false,
  searchInMenu = false,
  searchPlaceholder = 'Search...',
  deleteOnBackspace = true,
  classNames: cn = noStyle
}: MultiSelectProps) {
  // selected values; defaultValue is initial only, as in an uncontrolled input
  const [own, setOwn] = useState(() => defaultValue ?? [])
  // with `value` the parent owns the selection: user changes only call onChange
  const controlled = valueProp !== undefined
  // null from untyped JS (useState(null)) is an empty selection, as defaultValue's is
  const keys = (controlled ? valueProp : own) ?? []
  // values created by customValue: they stay listed once deselected
  const [custom, setCustom] = useState<string[]>([])
  const base = userOptions || []
  const known = flatten(base)
  const valueOf = (opt: MultiSelectOption) =>
    ours.has(opt) ? opt.value : getValue(opt)
  const labelOf = (opt: MultiSelectOption) =>
    ours.has(opt) ? opt.label : getLabel(opt)
  // search and the tooltip need text: a JSX label falls back to the label field, if that is text
  const text = (x: unknown) =>
    typeof x === 'string' || typeof x === 'number' ? String(x) : null
  const textOf = (opt: MultiSelectOption, label = labelOf(opt)) =>
    text(label) ?? text(opt.label) ?? ''
  // String(): untyped JS often passes numbers
  const findOpt = (opts: MultiSelectOption[], key: string) =>
    opts.find((opt) => String(valueOf(opt)) === String(key))
  // listed after the user's options: created values, plus with customValue the selected
  // ones the options lack. Once the options have one (they may arrive late, #12), it moves there
  const customOpts = [...custom, ...(customValue ? keys : [])]
    .filter((key, i, arr) => arr.indexOf(key) === i && !findOpt(known, key))
    .map((key) => ourOpt(key))
  const options: readonly Item[] = customOpts.length
    ? [...base, { title: customValuesTitle, type: 'group', childs: customOpts }]
    : base
  const all = [...known, ...customOpts]
  // looked up at render, so options arriving after mount resolve with no effect
  const resolved = keys
    .map((key) => findOpt(all, key))
    .filter((opt) => opt !== undefined)
  const value = singleSelect ? resolved.slice(0, 1) : resolved
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
  const [query, setQuery] = useState('')
  // searched trimmed, commas dropped: a typed comma picks
  const term = query.trim().replace(/,+/g, '')
  // the Create "..." item, for text no option has as its value
  const create =
    customValue &&
    term &&
    !findOpt(all, term) &&
    ourOpt(term, createLabel(term))
  const found = term
    ? all.filter((opt) => matches(opt, term)).concat(create || [])
    : null
  const items = found || options
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
  const searchRef = useRef<HTMLDivElement>(null)
  // picked on open: the menu goes above the input
  const [up, setUp] = useState(false)
  // the latest: an inline one would restart the open menu's listeners on every parent render
  const onClose = useRef(onMenuClose)
  onClose.current = onMenuClose

  // the deepest open submenu, by key: the ones around it are open too
  const [sub, setSub] = useState('')
  // collapsible groups the user toggled, by key: open unless `collapsed`
  const [flipped, setFlipped] = useState<string[]>([])
  const opener = (s: string) => (g: MultiSelectGroup, key: string) =>
    g.type === 'submenu'
      ? (s + '.').startsWith(key + '.')
      : !g.collapsible || !g.collapsed !== flipped.includes(key)
  const isOpen = opener(sub)
  // the rows the keyboard moves over: options, and the titles of submenus and collapsible groups
  const shown = walk(items, isOpen)
  // an option by value, a title by its place in the tree: either holds through a search or a pick
  const idOf = ({ opt, key }: Row) => (isGroup(opt) ? '\0' + key : valueOf(opt))
  // by id once the list changes under it (search, pick, a submenu opening above it)
  const activeIdx = !active
    ? -1
    : shown[active.idx] && idOf(shown[active.idx]) === active.value
      ? active.idx
      : shown.findIndex((r) => idOf(r) === active.value)
  const row = shown[activeIdx]

  useEffect(() => {
    !menuOpen && setActive(null)
  }, [menuOpen])

  // once per open: closes can overlap, as when a pick's onChange moves focus out (a close) and the pick closes too
  const opened = useRef(false)
  // the selection as last set or rendered: a chip's onDelete may run late (after an exit animation)
  const latest = useRef(value)
  // the element with keyboard focus (focus-visible) when a chip was deleted, or the search field a pick may remove
  const lost = useRef<Element | null>(null)

  const open = () => {
    const r = componentRef.current!.getBoundingClientRect()
    const below = viewHeight() - r.bottom
    opened.current = true
    // up only if that has more room: else it goes off the top of the page
    setUp(below < 200 && r.top > below)
    setMenuOpen(true)
    // back mid exit: the same menu
    setClosing(false)
  }

  // focus moves to `to` first. Submenus close with it, each leaving on its own
  const closeMenu = (to?: HTMLElement | null) => {
    if (!opened.current) return
    opened.current = false
    to?.focus({ preventScroll: true })
    setMenuOpen(false)
    setClosing(true)
    setSub('')
    onClose.current()
  }

  // while closing: data-closing on the box, its menu inert. Then it goes, with the search text it shows
  const whileClosing = () => {
    const ctl = boxRef.current!.firstChild as HTMLElement
    const parts = [listRef.current!, searchRef.current]
    // out first: an inert focused element drops focus to the body
    parts.some((el) =>
      el?.contains((ctl.getRootNode() as Document).activeElement)
    ) &&
      ((inline && inputFld.current) || componentRef.current!).focus({
        preventScroll: true
      })
    parts.forEach((el) => el?.setAttribute('inert', ''))
    let on = true
    leave(ctl, () => {
      if (!on) return
      setClosing(false)
      setQuery('')
    })
    return () => {
      on = false
      ctl.removeAttribute('data-closing')
      parts.forEach((el) => el?.removeAttribute('inert'))
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
      // (a searchInMenu field heads it opening down), plus the border there: not the box less the menu, which may
      // overflow its grid row as CSS animates the row from 0fr. Drawn: offsetHeight rounds
      const sh = searchRef.current?.getBoundingClientRect().height || 0
      const b = box.getBoundingClientRect()
      const m = (up ? list : searchRef.current || list).getBoundingClientRect()
      const css = getComputedStyle(box.firstChild as Element)
      const row = up
        ? b.bottom - m.bottom + parseFloat(css.borderTopWidth) * s
        : m.top - b.top + parseFloat(css.borderBottomWidth) * s
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
    ;(inputFld.current || componentRef.current!).focus()
    // here, not in open(): a click's open isn't committed yet, so the menu is there for both
    onMenuOpen()
  }, [menuOpen])

  // after the menu's effect: a key that opens it (End) scrolls once it is placed, its height capped
  useEffect(() => {
    // scrollIntoView is missing in jsdom
    listRef.current
      ?.querySelector('.msl-option-focused')
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx])

  const setNewValue = (val: MultiSelectOption[]) => {
    const values = val.map(valueOf)
    // controlled: the parent may reject it, so the next delete starts from what it renders
    if (!controlled) {
      latest.current = val
      setOwn(values)
    }
    onChange(values, val)
  }

  // valueOf once per selected value: Options asks this twice for every option
  const selected = new Set(value.map(valueOf))
  const checkValueExist = (opt: MultiSelectOption) => selected.has(valueOf(opt))
  // past the limit, unselected options show and announce as disabled. Single select replaces its value, so never
  const full = !singleSelect && value.length >= max
  const isDisabled = (opt: MultiSelectOption) =>
    !!opt.disabled || (full && !checkValueExist(opt))
  // titles are never disabled
  const live = (r: Row) => isGroup(r.opt) || !isDisabled(r.opt)

  const addValue = (newValObj: MultiSelectOption) => {
    // past the limit an unselected pick only calls onChange, the value as it is: no Create, the search and menu stay
    if (full && !checkValueExist(newValObj)) return setNewValue(value)
    // picking Create (click, Enter or comma) adds the typed text as an option
    if (newValObj === create) {
      newValObj = ourOpt(newValObj.value)
      setCustom([...custom, newValObj.value])
    }
    // a selected one toggles off (single select: to none)
    setNewValue(
      checkValueExist(newValObj)
        ? value.filter((itm) => valueOf(itm) !== valueOf(newValObj))
        : singleSelect
          ? [newValObj]
          : [...value, newValObj]
    )
    // unset closeOnSelect: single select closes, multi select stays open.
    // The value takes the search field's place, maybe in a later commit: focus the wrapper, not the field.
    // Left open, the search clears (closing, it does once the menu goes) and focus goes to the wrapper
    // if the field goes (click, Enter, comma). opened, not menuOpen: Enter in the closed field opens the menu in this same event
    if (opened.current && (closeOnSelect ?? singleSelect))
      return closeMenu(
        singleSelect || disableChip ? componentRef.current : null
      )
    setQuery('')
    lost.current = inputFld.current
  }

  const deleteValue = (opt: MultiSelectOption) =>
    setNewValue(latest.current.filter((itm) => valueOf(itm) !== valueOf(opt)))

  // the clear button
  const clearByUser = () => {
    // without the stylesheet's pointer-events: none it is still clickable
    if (disabled) return
    setNewValue([])
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
    let i =
      key === 'Home'
        ? -1
        : key === 'End' || (activeIdx < 0 && dir < 0)
          ? shown.length
          : activeIdx
    for (i += dir; i >= 0 && i < shown.length; i += dir) {
      if (shown[i].level === level && live(shown[i]))
        return setActive({ value: idOf(shown[i]), idx: i })
    }
  }

  // a title's click or Enter: a submenu opens, a collapsible group toggles
  const expand = (r: Row) =>
    r.opt.type === 'submenu'
      ? setSub(r.key)
      : setFlipped(
          flipped.includes(r.key)
            ? flipped.filter((k) => k !== r.key)
            : [...flipped, r.key]
        )

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
      ![...listRef.current!.querySelectorAll<HTMLElement>('*')].some(
        (el) => el.tabIndex >= 0
      )
    )
      // From in the listbox (a clicked option) or a searchInMenu field, which the close makes inert: focus moves to the listbox,
      // the browser tabs on from it, then it closes. Firefox and Safari lose the place of a removed focused element, Firefox of a clicked option.
      // Shift+Tab may land back on a searchInMenu field: the close brings focus to the wrapper
      return listRef.current!.contains(target as Node) ||
        searchRef.current?.contains(target as Node)
        ? (listRef.current!.focus(), setTimeout(() => closeMenu()))
        : closeMenu()
    // our listbox, when the target is JSX in it outside the options: an empty state's button, a group title's
    const box = (target as Element).closest('[role=option],[role=listbox]')
    // chips, the clear button and that JSX handle their own keys
    if (
      disabled ||
      marked(target, 'data-clickable') ||
      (box?.id === listId && box !== target)
    )
      return
    // the first result a click could pick
    const first = found?.find((opt) => !opt.disabled)
    if (key === 'Enter' && row) {
      e.preventDefault()
      row.opt.type === 'submenu'
        ? enter(row)
        : isGroup(row.opt)
          ? expand(row)
          : addValue(row.opt)
    } else if (
      (key === 'ArrowRight' && row?.opt.type === 'submenu') ||
      (key === 'ArrowLeft' && row?.level)
    ) {
      // else the caret moves in the search field
      e.preventDefault()
      key === 'ArrowRight' ? enter(row) : back(row.level)
    } else if ((key === 'Enter' || key === ',') && first) {
      // Prevented: no form submit, and the comma stays out of the field.
      // Opened first, as any key on the closed field opens it (text pasted there)
      e.preventDefault()
      openMenu(e)
      addValue(first)
    } else if (key === 'Backspace' && target === inputFld.current && !query) {
      // chips only: with searchInMenu the field is there next to a single value or count too
      deleteOnBackspace &&
        chips &&
        value.length &&
        deleteValue(value[value.length - 1])
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
    'aria-disabled': disabled
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
      ref={inputFld}
      {...combobox}
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
            cn
          }}
        />
      ) : (
        <div className={`msl-option msl-option-disable ${cn.empty ?? ''}`}>
          {emptyDataLabel}
        </div>
      )}
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
      {list}
    </>
  )

  return (
    <div
      ref={componentRef}
      {...attr}
      {...(!showSearch && combobox)}
      onClick={openMenu}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      data-disabled={disabled || undefined}
      style={style}
      className={`msl-wrp msl-vars ${className || ''} ${disabled ? 'msl-disabled' : ''}${
        full ? ' msl-limit-reached' : ''
      }`}
    >
      <input name={name} type='hidden' value={value.map(valueOf).join(',')} />
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
                {value.map((val, i) => (
                  <React.Fragment key={i}>
                    {customChip({
                      label: labelOf(val),
                      value: valueOf(val),
                      option: val,
                      disabled,
                      classNames: cn,
                      onDelete: () => {
                        // a custom chip may stay tabbable while disabled
                        if (disabled) return
                        // before the delete: an onChange that flushes sync unmounts the chip right away
                        lost.current = keyboardFocus()
                        deleteValue(val)
                      }
                    })}
                  </React.Fragment>
                ))}
              </div>
            )}
            {!singleSelect && disableChip && value.length > 0 && (
              <span className={`msl-single-value ${cn.singleValue ?? ''}`}>
                {value.length === 1 ? (
                  labelOf(value[0])
                ) : (
                  <>
                    {value.length} {chipAlternateText}
                  </>
                )}
              </span>
            )}
            {singleSelect && value.length === 1 && (
              <span className={`msl-single-value ${cn.singleValue ?? ''}`}>
                {labelOf(value[0])}
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
              {clearable && value.length > 0 && (
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
