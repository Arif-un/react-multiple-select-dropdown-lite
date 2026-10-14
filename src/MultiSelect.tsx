import React, { useState, useEffect, useRef, useId } from 'react'
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
import useComponentVisible from './useComponentVisible'

type Item = MultiSelectOption | MultiSelectGroup

// Defaults as parameter defaults: React 19's jsx runtime ignores defaultProps on function components.
const noop = () => {}
const optLabel = (opt: MultiSelectOption) => opt.label
const optValue = (opt: MultiSelectOption) => opt.value
const noStyle = {}
const createText = (text: string) => `Create "${text}"`

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
  largeData,
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
  disableSearch = false
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
  const [search, setSearch] = useState<MultiSelectOption[] | null>(null)
  const items = search || options
  // the Create "..." item last offered by the search
  const createOpt = useRef<MultiSelectOption | null>(null)
  const inputFld = useRef<HTMLInputElement>(null)
  const listId = `msl-listbox${useId()}`
  // the keyboard highlighted option: idx tells repeated values apart
  const [active, setActive] = useState<{ value: string; idx: number } | null>(
    null
  )
  // the last keydown belonged to an IME composition: its Enter confirms the text, not a pick
  const composing = useRef(false)
  const {
    ref: componentRef,
    isComponentVisible: menuOpen,
    setIsComponentVisible: setMenuOpen
  } = useComponentVisible({
    initialIsVisible: false,
    onClose: onMenuClose
  })

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

  useEffect(() => {
    // scrollIntoView is missing in jsdom
    componentRef
      .current!.querySelector('.msl-option-focused')
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx])

  useEffect(() => {
    if (clearAll && value.length) {
      clearValue()
    }
  }, [clearAll])

  // the selection as last set or rendered: a chip's onDelete may run late (after an exit animation)
  const latest = useRef(value)

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
    if (newValObj === createOpt.current) {
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
    setSearch(null)
    // clear search input
    if (inputFld.current) {
      inputFld.current.value = ''
    }
    // unset closeOnSelect: single select closes, multi select stays open
    if (menuOpen && (closeOnSelect ?? singleSelect)) {
      setMenuOpen(false)
      onMenuClose()
    }
  }

  const deleteValue = (opt: MultiSelectOption) =>
    setNewValue(latest.current.filter((itm) => valueOf(itm) !== valueOf(opt)))

  const clearValue = () => {
    setNewValue([])
  }

  // the clear button; clearAll clears without onClear
  const clearByUser = () => {
    clearValue()
    onClear()
  }

  // a keyboard delete unmounts the focused button: keep focus in the widget
  const refocus = () => (inputFld.current || componentRef.current)!.focus()

  // the element with keyboard focus (focus-visible) when a chip was deleted
  const lost = useRef<Element | null>(null)

  useEffect(() => {
    latest.current = value
    const el = lost.current
    lost.current = null
    // the delete unmounted it (the last chip, or a chip keyed by value) and focus fell to the body.
    // A late commit (async onChange) may find the user moved on: leave their focus alone
    el &&
      !el.isConnected &&
      el.ownerDocument.activeElement === el.ownerDocument.body &&
      refocus()
  })

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

  // plain substring match: typed text is not a regex. Our { label, value } options skip a
  // user's filterOption, which expects their own shape. String(): untyped JS often passes numbers
  const matches = (opt: MultiSelectOption, text: string) =>
    filterOption && !ours.has(opt)
      ? filterOption(opt, text)
      : [textOf(opt), valueOf(opt)].some((s) =>
          String(s).toLowerCase().includes(text.toLowerCase())
        )

  // also runs on input: text can arrive without a keyup (context menu paste, drag and drop)
  const handleSearchAndCustomValue = (
    e: React.SyntheticEvent & { key?: string }
  ) => {
    const textValue = (e.target as HTMLInputElement).value
      .trim()
      .replace(/,+/g, '')

    if (textValue) {
      createOpt.current = ourOpt(textValue, createLabel(textValue))
      // Enter reads this, not `search`: that is null when text arrived without a keyup (paste, IME)
      const results = all.filter((opt) => matches(opt, textValue))
      if (customValue && !findOpt(all, textValue)) {
        results.push(createOpt.current)
      }
      setSearch(results)

      if (
        (e.key === 'Enter' || e.key === ',') &&
        results.length &&
        !composing.current
      ) {
        addValue(results[0])
      }
    } else {
      setSearch(null)
    }
  }

  // the target or an ancestor below the wrapper has attr: any icon depth, and never
  // climbs past the wrapper (a ShadowRoot or document has no hasAttribute). A target outside
  // the wrapper's DOM counts too: a portal's, or a chip a sync onChange removed mid-event
  const marked = (target: EventTarget, attr: string) => {
    let el = target as Element | null
    while (el && el !== componentRef.current) {
      if (el.hasAttribute?.(attr)) return true
      el = el.parentNode as Element | null
    }
    return !el
  }

  const focusSearchInput = () => {
    if (inputFld.current) {
      inputFld.current.focus()
    }
  }

  const openMenu = ({ target }: React.SyntheticEvent) => {
    if (!marked(target, 'clickable')) {
      if (marked(target, 'dropdown-handle')) {
        if (!menuOpen) {
          setMenuOpen(true)
          onMenuOpen()
          focusSearchInput()
        } else {
          setMenuOpen(false)
          onMenuClose()
        }
      } else {
        // only when closed: an option click bubbles here and must not undo closeOnSelect
        if (!menuOpen) {
          setMenuOpen(true)
          onMenuOpen()
        }
        focusSearchInput()
      }
    }
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
    // Safari ends the composition before the keydown, leaving only keyCode 229
    composing.current = e.nativeEvent.isComposing || e.keyCode === 229
    if (composing.current) return
    const { key, target } = e
    // our listbox, when the target is JSX in it outside the options: an empty state's button, a group title's
    const box = (target as Element).closest('[role=option],[role=listbox]')
    // chips, the clear button and that JSX handle their own keys
    if (
      disabled ||
      marked(target, 'clickable') ||
      (box?.id === listId && box !== target)
    )
      return
    if (key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      addValue(shown[activeIdx])
      // the search field gives way to the single value: keep focus in the widget
      ;(singleSelect || disableChip) && componentRef.current!.focus()
    } else if (
      key === 'Backspace' &&
      target === inputFld.current &&
      !inputFld.current.value
    ) {
      // a value next to the search field means chips mode
      value.length && deleteValue(value[value.length - 1])
    } else if (
      /^Arrow(Down|Up)$/.test(key) ||
      // with search text, Home/End move the caret
      (/^(Home|End)$/.test(key) &&
        !(target === inputFld.current && inputFld.current.value))
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
    role: 'combobox',
    'aria-expanded': menuOpen,
    'aria-haspopup': 'listbox',
    'aria-controls': listId,
    'aria-activedescendant':
      activeIdx < 0 ? undefined : `${listId}-${activeIdx}`,
    'aria-disabled': disabled,
    // the wrapper's label names whichever element is the combobox
    'aria-label': attr?.['aria-label'],
    'aria-labelledby': attr?.['aria-labelledby']
  } as const

  const getActiveClass = () => {
    const el = componentRef.current!
    const rect = el.getBoundingClientRect()
    const below = window.innerHeight - (rect.top + el.clientHeight)
    // up only if that has more room: else it goes off the top of the page
    if (below < 200 && rect.top > below) {
      return 'msl-active-up'
    }
    return 'msl-active'
  }

  return (
    <div
      ref={componentRef}
      {...attr}
      {...(!showSearchOption() && combobox)}
      onClick={openMenu}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      style={{ ...style }}
      className={`msl-wrp msl-vars ${className || ''} ${
        disabled ? 'msl-disabled' : ''
      }${limit !== null && value.length >= limit ? ' msl-limit-reached' : ''}`}
    >
      <input name={name} type='hidden' value={value.map(valueOf).join(',')} />
      <div data-msl className={`msl ${menuOpen ? getActiveClass() : ''} `}>
        <div data-msl className='msl-input-wrp'>
          {!singleSelect && !disableChip && (
            // clickable: clicks and keys on any chip markup are the chip's, not the menu's.
            // display: contents keeps this box out of the layout, styled or not
            // @ts-expect-error clickable is a custom attribute
            <div clickable='true' style={{ display: 'contents' }}>
              {value.map((val, i) => (
                <React.Fragment key={i}>
                  {customChip({
                    label: labelOf(val),
                    value: valueOf(val),
                    option: val,
                    disabled,
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
            <span className='msl-single-value' data-msl>
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
            <span className='msl-single-value' data-msl>
              {labelOf(value[0])}
            </span>
          )}
          {showSearchOption() && (
            <input
              data-msl
              placeholder={placeholder}
              className='msl-input'
              disabled={disabled}
              // the browser's own history list would cover the menu
              autoComplete='off'
              onKeyUp={handleSearchAndCustomValue}
              onInput={(e) => {
                setActive(null)
                handleSearchAndCustomValue(e)
              }}
              ref={inputFld}
              {...combobox}
            />
          )}
          {!showSearchOption() && value.length < 1 && (
            <div
              data-msl
              data-placeholder={placeholder}
              className='msl-input'
            />
          )}
        </div>
        {(clearable || downArrow) && (
          <div className='msl-actions msl-flx'>
            {clearable && value.length > 0 && (
              <div
                role='button'
                // @ts-expect-error clickable is a custom attribute (it stops the menu from opening)
                clickable='true'
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
                className='msl-btn msl-clear-btn msl-flx'
              >
                {closeIcon || <CloseIcon />}
              </div>
            )}
            {downArrow && (
              // decorative: the combobox handles the keyboard
              <div
                aria-hidden='true'
                dropdown-handle='true'
                className='msl-btn msl-arrow-btn msl-flx'
              >
                {downArrowIcon || <DownIcon />}
              </div>
            )}
          </div>
        )}
      </div>
      <div
        className='msl-options'
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
              singleSelect,
              addValue,
              checkValueExist,
              largeData,
              menuOpen,
              listId,
              activeIdx,
              valueOf,
              labelOf,
              textOf
            }}
          />
        ) : (
          <div className='msl-option msl-option-disable'>{emptyDataLabel}</div>
        )}
      </div>
    </div>
  )
}

export default MultiSelect as typeof PublicMultiSelect
