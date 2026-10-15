import React, { useState, useEffect, useRef, useId } from 'react'
import { createPortal, flushSync } from 'react-dom'
import Chip from './Chip'
import CloseIcon from './CloseIcon'
import DownIcon from './DownIcon'
import type PublicMultiSelect from './index'
import type {
  MultiSelectGroup,
  MultiSelectOption,
  MultiSelectProps
} from './index'
import Options from './Options'
import './styles.css'

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
// the scale ancestors' transforms give: drawn size over layout size, which rounds to whole pixels
const scaleOf = (drawn: number, size: number) =>
  size && Math.abs(drawn - size) >= 1 ? drawn / size : 1

// options we create, { label, value }: the user's getters only know their own shape
const ours = new WeakSet<MultiSelectOption>()
const ourOpt = (value: string, label = value) => {
  const opt = { label, value }
  ours.add(opt)
  return opt
}
// options in render order, groups unwrapped, the way Options.tsx walks them
function flatten(items: readonly Item[], out: MultiSelectOption[] = []) {
  for (const opt of items) {
    if (opt.type === 'group') flatten((opt as MultiSelectGroup).childs, out)
    else out.push(opt as MultiSelectOption)
  }
  return out
}

function MultiSelect({
  options: userOptions,
  downArrowIcon,
  closeIcon,
  clearable = true,
  clearAll = false,
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
  style = noStyle,
  attr,
  disabled = false,
  limit = null,
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
  classNames: cn = noStyle
}: MultiSelectProps) {
  // selected values; defaultValue is initial only, as in an uncontrolled input
  const [own, setOwn] = useState(() => defaultValue ?? [])
  // with `value` the parent owns the selection: user changes only call onChange
  const controlled = valueProp !== undefined
  const keys = controlled ? valueProp : own
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
  // plain substring match: typed text is not a regex. Our { label, value } options skip a
  // user's filterOption, which expects their own shape. String(): untyped JS often passes numbers
  const matches = (opt: MultiSelectOption, text: string) =>
    filterOption && !ours.has(opt)
      ? filterOption(opt, text)
      : [textOf(opt), valueOf(opt)].some((s) =>
          String(s).toLowerCase().includes(text.toLowerCase())
        )
  // the search text, shared by both copies of the field: text that reaches the closed one (paste, drop, IME) shows in the plate's
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
  // the open menu: one plate, portaled out of clipping parents and placed over the hidden wrapper
  const plateRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // picked on open: the menu goes above the input
  const [up, setUp] = useState(false)
  // the text look, direction and language of where the dropdown stands, not of where the plate renders.
  // Read on open, not in render: a hiding Suspense boundary detaches the wrapper's ref, the menu still open
  const [look, setLook] = useState<{
    pos: 'absolute' | 'fixed'
    dir: string
    lang?: string
    vars: object
  }>()
  // an empty box beside the plate, positioned as it is: it measures their containing block
  const probeRef = useRef<HTMLDivElement>(null)
  // the latest: an inline one would restart the open menu's listeners on every parent render
  const onClose = useRef(onMenuClose)
  onClose.current = onMenuClose

  const shown = flatten(items)
  // by value once the list changes under it (search, pick)
  const activeIdx = !active
    ? -1
    : shown[active.idx] && valueOf(shown[active.idx]) === active.value
      ? active.idx
      : shown.findIndex((opt) => valueOf(opt) === active.value)

  useEffect(() => {
    !menuOpen && setActive(null)
  }, [menuOpen])

  // once per open: closes can overlap, as when a pick's onChange moves focus out (a close) and the pick closes too
  const opened = useRef(false)

  // where the plate renders, picked on open: picked again while open, it would remount
  const home = useRef<Element | ShadowRoot | null>(null)

  const open = (key: boolean) => {
    const el = componentRef.current!
    const r = el.getBoundingClientRect()
    const below = viewHeight() - r.bottom
    // an open <dialog> or popover is in the top layer, over <body>, and a modal one makes the rest of the page
    // inert. A fullscreen element is all that shows. Page CSS can't reach into a shadow root.
    // An aria-modal one (react-bootstrap, MUI, Headless UI) traps focus: in <body> the plate would lose it and close.
    // Up the flat tree: slotted into a component, the dropdown may sit in a dialog in its shadow root,
    // then the plate goes in the slotted element, which shows in that dialog
    const root = el.getRootNode() as Document | ShadowRoot
    // the root's own: the document's stands for a fullscreen element in a shadow root by its host
    const full = root.fullscreenElement
    const body = (root as Document).body
    let top: Node | null | undefined = el
    let slotted: Element | undefined
    let pinned = false
    // the highest z-index around it: the plate goes over an overlay the dropdown sits in
    let z = 0
    while (
      top &&
      !(top as Element).matches?.('dialog[open],[popover],[aria-modal=true]')
    ) {
      if ((top as Element).matches) {
        const { position, zIndex } = getComputedStyle(top as Element)
        // a fixed or sticky dropdown stays put as the page scrolls, as a fixed plate does
        pinned ||= /fixed|sticky/.test(position)
        z = Math.max(z, +zIndex || 0)
      }
      const slot: HTMLSlotElement | null = (top as Element).assignedSlot
      // only in the dropdown's own tree: a slotted shadow host shows none of its light DOM
      slotted ||=
        slot && top.getRootNode() == root ? (top as Element) : undefined
      top = slot || top.parentNode || (top as ShadowRoot).host
    }
    home.current = top
      ? top.getRootNode() == root
        ? (top as Element)
        : slotted || (root as ShadowRoot)
      : full?.contains(el)
        ? full
        : body || root
    const { color, fontFamily, direction } = getComputedStyle(el)
    opened.current = true
    const show = () => {
      // up only if that has more room: else it goes off the top of the page
      setUp(below < 200 && r.top > below)
      setLook({
        // in <body> it scrolls with the page on the compositor: a fixed one trails a page scroll by a frame
        pos: home.current == body && !pinned ? 'absolute' : 'fixed',
        dir: direction,
        lang: el.closest<HTMLElement>('[lang]')?.lang,
        // variables, not color and font-family: those, inline, would beat a class on the plate
        vars: {
          '--msl-inherited-color': color,
          '--msl-inherited-font': fontFamily,
          '--msl-inherited-z-index': z
        }
      })
      setMenuOpen(true)
    }
    // a key flushes, so the plate is there for the text it types. Not a click: a click() from an effect
    // would flush inside React's commit, which React warns about
    key ? flushSync(show) : show()
  }

  const controls = (el: HTMLElement) => [
    ...el
      .querySelector('.msl')!
      .querySelectorAll<HTMLElement>('input,button,[tabindex]')
  ]
  // the same control in the wrapper as el in the plate; the wrapper for the plate itself.
  // A stateful customChip's two copies may differ: the chips' controls count from the start, the rest from the end
  const twinOf = (el: Element | null) => {
    if (el === plateRef.current) return componentRef.current
    const a = controls(plateRef.current!)
    const b = controls(componentRef.current!)
    const i = a.indexOf(el as HTMLElement)
    return i < 0
      ? undefined
      : b[
          el!.closest('.msl-input-wrp > [data-clickable]')
            ? i
            : b.length - a.length + i
        ]
  }

  // back: focus was in the plate, so it returns to the same control in the wrapper (or to `to`), and Tab moves on from there
  const closeMenu = (back?: boolean, to?: HTMLElement | null) => {
    const plate = plateRef.current
    if (!opened.current || !plate) return
    opened.current = false
    // found before the close re-renders the wrapper: a pick may unmount it (the search field)
    const twin = to || twinOf((plate.getRootNode() as Document).activeElement)
    const doc = plate.ownerDocument
    const close = () => {
      setMenuOpen(false)
      // the plate's search field is gone with its text
      setQuery('')
    }
    // flushed only to move focus once the plate is gone: other closes can come mid-commit (an autoFocus)
    back ? flushSync(close) : close()
    // only if focus went with the plate: the flushed update may have moved it on (an autoFocus, an effect).
    // Optional: an onChange may have unmounted the whole select
    back &&
      doc.activeElement === doc.body &&
      (twin?.isConnected
        ? twin
        : inputFld.current || componentRef.current
      )?.focus({ preventScroll: true })
    // once focus is back: it may move it on
    onClose.current()
  }

  // listen only while open, so onMenuClose fires once per open -> closed
  useEffect(() => {
    if (!menuOpen) return
    const root = componentRef.current!
    const plate = plateRef.current!
    const probe = probeRef.current!
    // over the hidden wrapper, the menu below (or above) it, as tall as the viewport leaves room for.
    // Follows the wrapper through scrolls, resizes, its own growth and layout shifts.
    // A transformed (filtered, contained) <dialog> or shadow host is the plate's containing block,
    // not the viewport: placed in its box, as the probe measures it. Not the plate: its own transform would count
    // ponytail: two rect reads per frame while open; scroll/resize listeners + ResizeObserver if it ever shows in a profile
    let frame = 0
    const box = plate.querySelector<HTMLElement>('.msl-options')!
    const follow = () => {
      const r = root.getBoundingClientRect()
      const cb = probe.getBoundingClientRect()
      const h = viewHeight()
      // in a scaled part of the page (a zoomable canvas) the plate scales as the dropdown does,
      // less what its containing block scales it, and its offsets are in that block's pixels
      const s = scaleOf(r.width, root.offsetWidth)
      const c = scaleOf(cb.height, probe.offsetHeight)
      const at = {
        left: (r.left - cb.left) / c + 'px',
        width: r.width / s + 'px',
        [up ? 'bottom' : 'top']:
          (up ? cb.bottom - r.bottom : r.top - cb.top) / c + 'px',
        // unset when unscaled, so a class on the plate can scale it (an open animation)
        scale: s == c ? '' : s / c + '',
        'transform-origin': s == c ? '' : up ? '0 100%' : '0 0'
      }
      for (const [k, v] of Object.entries(at)) plate.style.setProperty(k, v)
      // React 18 leaves the portal showing when a Suspense boundary hides the wrapper again: hide it too
      plate.style.display = root.checkVisibility?.() === false ? 'none' : ''
      // on the listbox, the one reader: the stylesheet registers it non-inherited, so a scroll restyles no option
      box.style.setProperty(
        '--msl-menu-room',
        (up ? r.top : h - r.bottom) / s + 'px'
      )
      // missing in jsdom without pretendToBeVisual: a user's tests would crash on every open
      typeof requestAnimationFrame != 'undefined' &&
        (frame = requestAnimationFrame(follow))
    }
    // now, not next frame: placed before it paints
    follow()
    // a scrolling parent clipped it away: close rather than float over that parent's edge.
    // Opened out of view (a key on the focused dropdown, scrolled away): scroll it back instead, a fixed plate
    // can't scroll to itself on focus. Missing in jsdom: a user's tests would crash on every open
    let first = true
    const seen =
      typeof IntersectionObserver != 'undefined' &&
      new IntersectionObserver((es) => {
        // the latest report is the last
        const vis = es[es.length - 1].isIntersecting
        first && !vis
          ? root.scrollIntoView?.({ block: 'nearest' })
          : vis || closeMenu(true)
        first = false
      })
    seen && seen.observe(root)
    // composedPath: in a shadow root the document sees the host as target
    const inside = (e: Event) =>
      e.composedPath().some((el) => el === root || el === plate)
    // Escape from inside goes through onKeyDown, after attr.onKeyDown.
    // Prevented: it closes the menu, not a surrounding <dialog> or popover too
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || inside(e)) return
      e.preventDefault()
      closeMenu(true)
    }
    // clicks, and focus moving out
    const onOutside = (e: Event) => inside(e) || closeMenu()
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('click', onOutside, true)
    document.addEventListener('focusin', onOutside, true)
    return () => {
      frame && cancelAnimationFrame(frame)
      seen && seen.disconnect()
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('click', onOutside, true)
      document.removeEventListener('focusin', onOutside, true)
    }
  }, [menuOpen])

  // in an effect, not open(): flushSync can't commit from inside another commit (a click() from an effect).
  // It runs in the open's commit, so a key that opened the menu types into the plate
  useEffect(() => {
    if (!menuOpen) return
    ;(inputFld.current || plateRef.current!).focus()
    // here, not in open(): a click's open isn't committed yet, so the menu is there for both
    onMenuOpen()
  }, [menuOpen])

  // after the menu's effect: a key that opens it (End) scrolls once it is placed, its height capped
  useEffect(() => {
    // scrollIntoView is missing in jsdom
    plateRef.current
      ?.querySelector('.msl-option-focused')
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx])

  useEffect(() => {
    if (clearAll && value.length) {
      clearValue()
    }
  }, [clearAll])

  // the selection as last set or rendered: a chip's onDelete may run late (after an exit animation)
  const latest = useRef(value)
  // the element with keyboard focus (focus-visible) when a chip was deleted, or the search field a pick may remove
  const lost = useRef<Element | null>(null)

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

  const addValue = (newValObj: MultiSelectOption) => {
    // picking Create (click, Enter or comma) adds the typed text as an option
    if (newValObj === create) {
      newValObj = ourOpt(newValObj.value)
      setCustom([...custom, newValObj.value])
    }
    let tmp = [...value]
    if (singleSelect) {
      if (checkValueExist(newValObj)) {
        tmp = []
      } else {
        tmp = [newValObj]
      }
    } else {
      if (!checkValueExist(newValObj)) {
        if (limit === null) {
          tmp.push(newValObj)
        } else if (limit > value.length) {
          tmp.push(newValObj)
        }
      } else {
        tmp = tmp.filter((itm) => valueOf(itm) !== valueOf(newValObj))
      }
    }
    setNewValue(tmp)
    setQuery('')
    // unset closeOnSelect: single select closes, multi select stays open.
    // The value takes the search field's place, maybe in a later commit: focus the wrapper, not the field.
    // Left open, focus goes to the plate if the field goes (click, Enter, comma).
    // opened, not menuOpen: Enter in the closed field opens the menu in this same event
    opened.current && (closeOnSelect ?? singleSelect)
      ? closeMenu(
          true,
          singleSelect || disableChip ? componentRef.current : null
        )
      : (lost.current = inputFld.current)
  }

  const deleteValue = (opt: MultiSelectOption) =>
    setNewValue(latest.current.filter((itm) => valueOf(itm) !== valueOf(opt)))

  const clearValue = () => {
    setNewValue([])
  }

  // the clear button; clearAll clears without onClear
  const clearByUser = () => {
    // without the stylesheet's pointer-events: none it is still clickable
    if (disabled) return
    clearValue()
    onClear()
  }

  // a keyboard delete unmounts the focused button: keep focus in the widget. Disabled, the field takes none
  const refocus = () =>
    (disabled
      ? componentRef.current
      : inputFld.current || plateRef.current || componentRef.current)!.focus()

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
  // After the effect above, which brings focus back from the closed plate on the next commit:
  // no flushSync in an effect, and from the end of <body> Tab would move on from there
  useEffect(() => {
    if (!disabled) return
    lost.current = plateRef.current
    closeMenu()
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

  const showSearchOption = () => {
    if (disableSearch) {
      return false
    }

    if (!singleSelect && !disableChip) {
      return true
    } else if (singleSelect && !value.length) {
      return true
    } else if (!singleSelect && disableChip && !value.length) {
      return true
    }

    return false
  }

  // the target or an ancestor below the plate or wrapper holding it has attr: any icon depth, never
  // them or above. The plate first: it may sit in the wrapper (slotted into a dialog).
  // A target outside both counts too: a user portal's, or a chip a sync onChange removed mid-event
  const marked = (target: EventTarget, attr: string) => {
    const box = [plateRef.current, componentRef.current].find((el) =>
      el?.contains(target as Node)
    )
    const el = (target as Element).closest(`[${attr}]`)
    return !box || (el !== box && box.contains(el))
  }

  const focusSearchInput = () => {
    if (inputFld.current) {
      inputFld.current.focus()
    }
  }

  // plate events bubble here through the portal
  const openMenu = ({ target, type }: React.SyntheticEvent) => {
    if (disabled || marked(target, 'data-clickable')) return
    if (!menuOpen) open(type === 'keydown')
    else if (marked(target, 'data-handle')) closeMenu(true)
    // not a close: an option click bubbles here and must not undo closeOnSelect.
    // Nor a refocus once closed: an onChange may have moved focus out
    else opened.current && focusSearchInput()
  }

  // moves the highlight over enabled options, staying put at either end
  const highlight = (key: string) => {
    const dir = key === 'ArrowDown' || key === 'Home' ? 1 : -1
    let i =
      key === 'Home'
        ? -1
        : key === 'End' || (activeIdx < 0 && dir < 0)
          ? shown.length
          : activeIdx
    for (i += dir; i >= 0 && i < shown.length; i += dir) {
      if (!shown[i].disabled)
        return setActive({ value: valueOf(shown[i]), idx: i })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    attr?.onKeyDown?.(e)
    // an IME composition's keys: its Enter confirms the text, not a pick.
    // Safari ends the composition before the keydown, leaving only keyCode 229
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const { key, target } = e
    const inMenu = (el?: Element) =>
      el?.closest('[role=listbox]')?.id === listId
    if (menuOpen && key === 'Escape') {
      // it closes the menu, not a surrounding <dialog> or popover too. Stopped too: a modal
      // library's onKeyDown above it in the React tree may ignore defaultPrevented (MUI's does)
      e.preventDefault()
      e.stopPropagation()
      return closeMenu(true)
    }
    if (menuOpen && key === 'Tab') {
      const plate = plateRef.current!
      // the plate is a stop before its controls, as the wrapper is
      // ponytail: tabIndex >= 0 counts disabled and hidden elements as stops; filter them if JSX in the menu has them
      const stops = [plate, ...plate.querySelectorAll<HTMLElement>('*')].filter(
        (el) => el.tabIndex >= 0
      )
      const at = (el: Node) => (target as Node).compareDocumentPosition(el)
      // where the browser moves focus in the plate, also from an option or the listbox, which are no stops
      const next = e.shiftKey
        ? stops.filter((el) => at(el) & 2).pop() // preceding
        : stops.find((el) => at(el) & 4) // following
      // focusable JSX in the menu, which only the plate has: Tab steps through the plate, the menu open
      if (next && stops.some(inMenu)) return
      // else it closes. The plate sits at the end of its container: Tab moves on from the wrapper instead,
      // from the twin of what it leaves, or past the wrapper's controls when it leaves the menu
      const twin = twinOf(target as Element)
      if (twin || !next)
        return closeMenu(
          true,
          twin || controls(componentRef.current!).pop() || componentRef.current
        )
      // from an option or the listbox, back to a control: onto its twin
      e.preventDefault()
      closeMenu(true, twinOf(next))
    }
    // our listbox, when the target is JSX in it outside the options: an empty state's button, a group title's
    const box = (target as Element).closest('[role=option],[role=listbox]')
    // chips, the clear button and that JSX handle their own keys
    if (
      disabled ||
      marked(target, 'data-clickable') ||
      (box?.id === listId && box !== target)
    )
      return
    if (key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      addValue(shown[activeIdx])
    } else if ((key === 'Enter' || key === ',') && found?.length) {
      // the first result. Prevented: no form submit, and the comma stays out of the field.
      // Opened first, as any key on the closed field opens it (text pasted there)
      e.preventDefault()
      openMenu(e)
      addValue(found[0])
    } else if (key === 'Backspace' && target === inputFld.current && !query) {
      // a value next to the search field means chips mode
      value.length && deleteValue(value[value.length - 1])
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
      ;((key === ' ' &&
        (target === e.currentTarget || target === plateRef.current)) ||
        key === 'Enter') &&
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

  // on the wrapper and the plate; className and style only on the wrapper, the plate has classNames.plate
  const state = `${disabled ? 'msl-disabled' : ''}${
    limit !== null && value.length >= limit ? ' msl-limit-reached' : ''
  }`

  // rendered twice while open: the hidden wrapper's copy holds the space, the plate's is live
  const control = (plate: boolean) => (
    <div
      data-open={plate || undefined}
      data-up={(plate && up) || undefined}
      className={`msl ${plate ? (up ? 'msl-active-up' : 'msl-active') : ''} ${cn.control ?? ''}`}
    >
      <div className={`msl-input-wrp ${cn.values ?? ''}`}>
        {!singleSelect && !disableChip && (
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
        {showSearchOption() && (
          <input
            placeholder={placeholder}
            className={`msl-input ${cn.input ?? ''}`}
            disabled={disabled}
            // the browser's own history list would cover the menu
            autoComplete='off'
            value={query}
            onChange={(e) => {
              setActive(null)
              setQuery(e.target.value)
            }}
            ref={plate === menuOpen ? inputFld : undefined}
            {...combobox}
          />
        )}
        {!showSearchOption() && value.length < 1 && (
          <div
            data-placeholder={placeholder}
            className={`msl-input ${cn.input ?? ''}`}
          />
        )}
      </div>
      {(clearable || downArrow) && (
        <div className={`msl-actions msl-flx ${cn.actions ?? ''}`}>
          {clearable && value.length > 0 && (
            <div
              role='button'
              // it stops the menu from opening
              data-clickable
              aria-label={clearLabel}
              onClick={clearByUser}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  clearByUser()
                  refocus()
                }
              }}
              tabIndex={disabled ? -1 : 0}
              className={`msl-btn msl-clear-btn msl-flx ${cn.clearButton ?? ''}`}
            >
              {closeIcon || <CloseIcon />}
            </div>
          )}
          {downArrow && (
            // decorative: the combobox handles the keyboard
            <div
              aria-hidden='true'
              data-handle
              className={`msl-btn msl-arrow-btn msl-flx ${cn.arrowButton ?? ''}`}
            >
              {downArrowIcon || <DownIcon />}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const menu = (
    <div
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
          {...{
            addValue,
            checkValueExist,
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

  return (
    <div
      ref={componentRef}
      {...attr}
      {...(!showSearchOption() && combobox)}
      onClick={openMenu}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      data-disabled={disabled || undefined}
      style={{ ...style, ...(menuOpen && { visibility: 'hidden' }) }}
      className={`msl-wrp msl-vars ${className || ''} ${state}`}
    >
      <input name={name} type='hidden' value={value.map(valueOf).join(',')} />
      {control(false)}
      {menuOpen &&
        look &&
        createPortal(
          <>
            {/* zero width, so it takes no clicks */}
            <div
              ref={probeRef}
              style={{ position: look.pos, top: 0, bottom: 0, left: 0 }}
            />
            <div
              ref={plateRef}
              {...(!showSearchOption() && combobox)}
              tabIndex={0}
              dir={look.dir}
              lang={look.lang}
              style={{
                ...look.vars,
                // left, top and width: set by the open menu's effect, every frame
                position: look.pos,
                // modal libraries (Radix) set pointer-events: none on <body>, where it renders
                pointerEvents: 'auto',
                // in the hidden wrapper when that is what is slotted into a dialog
                visibility: 'visible'
              }}
              className={`msl-plate msl-vars ${state} ${cn.plate ?? ''}`}
            >
              {/* in DOM order, so it stacks right with no stylesheet */}
              {up && menu}
              {control(true)}
              {!up && menu}
            </div>
          </>,
          home.current!
        )}
    </div>
  )
}

export default MultiSelect as typeof PublicMultiSelect
