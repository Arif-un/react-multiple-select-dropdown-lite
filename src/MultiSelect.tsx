import React, { useState, useEffect, useRef, useId } from 'react'
import Chip from './Chip'
import { CloseIcon, DownIcon } from './icons'
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

// options we create, { label, value }: the user's getters only know their own shape
const ours = new WeakSet<MultiSelectOption>()
const ourOpt = (value: string, label = value) => {
  const opt: MultiSelectOption = { label, value }
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
  // a search field, unless a value takes its place (single select, disableChip)
  const showSearch =
    !disableSearch && (!value.length || (!singleSelect && !disableChip))
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
  // picked on open: the menu goes above the input
  const [up, setUp] = useState(false)
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
  // the selection as last set or rendered: a chip's onDelete may run late (after an exit animation)
  const latest = useRef(value)
  // the element with keyboard focus (focus-visible) when a chip was deleted, the search field a pick may remove,
  // or the element focused when the menu closed (an option)
  const lost = useRef<Element | null>(null)

  const open = () => {
    const r = componentRef.current!.getBoundingClientRect()
    const below = viewHeight() - r.bottom
    opened.current = true
    // up only if that has more room: else it goes off the top of the page
    setUp(below < 200 && r.top > below)
    setMenuOpen(true)
  }

  // focus moves to `to` first. back: if the close removes the focused element (an option),
  // the effect after it brings focus back to the search field or the wrapper.
  // No ref while a Suspense boundary hides it: focus left with it
  const closeMenu = (back?: boolean, to?: HTMLElement | null) => {
    if (!opened.current) return
    opened.current = false
    to?.focus({ preventScroll: true })
    back &&
      componentRef.current &&
      (lost.current = (
        componentRef.current.getRootNode() as Document
      ).activeElement)
    setMenuOpen(false)
    // the search text goes with the menu
    setQuery('')
    onClose.current()
  }

  // listen only while open, so onMenuClose fires once per open -> closed
  useEffect(() => {
    if (!menuOpen) return
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
    if (box.showPopover) {
      box.setAttribute('popover', 'manual')
      box.showPopover()
    }
    // over the wrapper, the menu below (or above) it, as tall as the viewport leaves room for.
    // Follows the wrapper through scrolls, resizes, its own growth and layout shifts.
    // ponytail: three rects read per frame while open; scroll/resize listeners + ResizeObserver if it ever shows in a profile
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
      // the control's own height, the box less the options: the wrapper keeps it, as the box left the flow.
      // Drawn: offsetHeight rounds
      const row =
        box.getBoundingClientRect().height - list.getBoundingClientRect().height
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
        (up ? r.top : h - bottom) / s + 'px'
      )
      // missing in jsdom without pretendToBeVisual: a user's tests would crash on every open
      typeof requestAnimationFrame != 'undefined' &&
        (frame = requestAnimationFrame(follow))
    }
    // now, not next frame: placed before it paints
    follow()
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
          : vis || closeMenu(true)
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
      // without the attribute it is hidden, and back in the flow
      box.removeAttribute('popover')
      box.removeAttribute('style')
      root.style.minHeight = minHeight
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
    setQuery('')
    // unset closeOnSelect: single select closes, multi select stays open.
    // The value takes the search field's place, maybe in a later commit: focus the wrapper, not the field.
    // Left open, focus goes to the wrapper if the field goes (click, Enter, comma).
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
    disabled && closeMenu(false, componentRef.current)
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
    else if (marked(target, 'data-handle')) closeMenu(true)
    // not a close: an option click bubbles here and must not undo closeOnSelect.
    // Nor a refocus once closed: an onChange may have moved focus out
    else opened.current && inputFld.current?.focus()
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
      if (!isDisabled(shown[i]))
        return setActive({ value: valueOf(shown[i]), idx: i })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    attr?.onKeyDown?.(e)
    // an IME composition's keys: its Enter confirms the text, not a pick.
    // Safari ends the composition before the keydown, leaving only keyCode 229
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const { key, target } = e
    if (menuOpen && key === 'Escape') {
      // it closes the menu, not a surrounding <dialog> or popover too. Stopped too: a modal
      // library's onKeyDown above it in the React tree may ignore defaultPrevented (MUI's does)
      e.preventDefault()
      e.stopPropagation()
      return closeMenu(true)
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
      return closeMenu()
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
    if (key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      addValue(shown[activeIdx])
    } else if ((key === 'Enter' || key === ',') && first) {
      // Prevented: no form submit, and the comma stays out of the field.
      // Opened first, as any key on the closed field opens it (text pasted there)
      e.preventDefault()
      openMenu(e)
      addValue(first)
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

  const menu = (
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
          {...{
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
          data-open={menuOpen || undefined}
          data-up={(menuOpen && up) || undefined}
          className={`msl ${menuOpen ? (up ? 'msl-active-up' : 'msl-active') : ''} ${cn.control ?? ''}`}
        >
          {/* in DOM order, so it stacks right with no stylesheet */}
          {menuOpen && up && menu}
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
            {showSearch && (
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
                ref={inputFld}
                {...combobox}
              />
            )}
            {!showSearch && value.length < 1 && (
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
          {menuOpen && !up && menu}
        </div>
      </div>
    </div>
  )
}

export default MultiSelect as typeof PublicMultiSelect
