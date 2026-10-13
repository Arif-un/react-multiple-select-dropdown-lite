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
const noStyle = {}
const emptyOptions: readonly Item[] = [
  {
    label: 'Empty',
    value: '',
    disabled: true,
    style: { textAlign: 'center' }
  }
]

// options in render order, groups unwrapped, the way Options.tsx walks them
function flatten(items: readonly Item[], out: MultiSelectOption[] = []) {
  for (const opt of items) {
    if (opt.type === 'group') flatten((opt as MultiSelectGroup).childs, out)
    else out.push(opt as MultiSelectOption)
  }
  return out
}

function MultiSelect({
  options: userOptions = emptyOptions,
  downArrowIcon,
  closeIcon,
  clearable = true,
  clearAll = false,
  downArrow = true,
  onChange = noop,
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
  // String(): untyped JS often passes numbers
  const findOpt = (opts: MultiSelectOption[], key: string) =>
    opts.find((opt) => String(opt.value) === String(key))
  // listed after the user's options: created values, plus with customValue the selected
  // ones the options lack. Once the options have one (they may arrive late, #12), it moves there
  const customOpts = [...custom, ...(customValue ? keys : [])]
    .filter((key, i, arr) => arr.indexOf(key) === i && !findOpt(known, key))
    .map((key) => ({ label: key, value: key }))
  const options: readonly Item[] = customOpts.length
    ? [...base, { title: 'Custom Values', type: 'group', childs: customOpts }]
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
    : shown[active.idx]?.value === active.value
      ? active.idx
      : shown.findIndex((opt) => opt.value === active.value)

  useEffect(() => {
    !menuOpen && setActive(null)
  }, [menuOpen])

  useEffect(() => {
    // scrollIntoView is missing in jsdom
    componentRef
      .current!.querySelector('.msl-option-focused')
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIdx])

  const calculatedWidth = `calc(100% - ${
    clearable && downArrow ? 60 : downArrow || clearable ? 40 : 5
  }px)`

  useEffect(() => {
    if (clearAll && value.length) {
      clearValue()
    }
  }, [clearAll])

  const setNewValue = (val: MultiSelectOption[]) => {
    const values = val.map((opt) => opt.value)
    if (!controlled) setOwn(values)
    onChange(values, val)
  }

  const checkValueExist = (
    value: MultiSelectOption,
    arr: MultiSelectOption[]
  ) => {
    const bool = arr.some((itm) => itm.value === value.value)
    return bool
  }

  const addValue = (newValObj: MultiSelectOption) => {
    // picking Create (click, Enter or comma) adds the typed text as an option
    if (newValObj === createOpt.current) {
      newValObj = { label: newValObj.value, value: newValObj.value }
      setCustom([...custom, newValObj.value])
    }
    let tmp = [...value]
    if (singleSelect) {
      if (checkValueExist(newValObj, value)) {
        tmp = []
      } else {
        tmp = [newValObj]
      }
    } else {
      if (!checkValueExist(newValObj, value)) {
        if (limit === null) {
          tmp.push(newValObj)
        } else if (limit > value.length) {
          tmp.push(newValObj)
        }
      } else {
        tmp = tmp.filter((itm) => itm.value !== newValObj.value)
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

  const deleteValue = (i: number) => {
    const tmp = [...value]
    tmp.splice(i, 1)
    setNewValue(tmp)
  }

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

  const searchOptions = (str: string, options: readonly Item[]) => {
    const searchedOptions: MultiSelectOption[] = []
    const searchedOptValues: MultiSelectOption[] = []
    // plain substring match: typed text is not a regex.
    // String(): untyped JS often passes numbers
    const needle = str.toLowerCase()

    // groups recurse first, so the rest of the loop only sees options
    const searchInOptions = (opt: MultiSelectOption[]) => {
      for (let i = 0; i < opt.length; i++) {
        if (opt[i]?.type === 'group') {
          searchInOptions(opt[i].childs as MultiSelectOption[])
        } else if (
          typeof opt[i].label !== 'object' &&
          String(opt[i].label).toLowerCase().includes(needle)
        ) {
          searchedOptions.push(opt[i])
        } else if (
          typeof opt[i].label === 'object' &&
          opt[i]?.title?.toLowerCase().includes(needle)
        ) {
          searchedOptions.push(opt[i])
        } else if (String(opt[i].value).toLowerCase().includes(needle)) {
          searchedOptValues.push(opt[i])
        }
        if (typeof opt[i].label === 'object' && !('title' in opt[i])) {
          console.warn(
            '[multiselect] you must provide a title property as typeof string, if you want to render jsx in option label'
          )
        }
      }
    }
    searchInOptions(options as MultiSelectOption[])
    return [...searchedOptions, ...searchedOptValues]
  }

  // also runs on input: text can arrive without a keyup (context menu paste, drag and drop)
  const handleSearchAndCustomValue = (
    e: React.SyntheticEvent & { key?: string }
  ) => {
    const textValue = (e.target as HTMLInputElement).value
      .trim()
      .replace(/,+/g, '')

    if (textValue) {
      createOpt.current = {
        label: `Create "${textValue}"`,
        value: textValue
      }
      // Enter reads this, not `search`: that is null when text arrived without a keyup (paste, IME)
      const results = searchOptions(textValue, options)
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
  // climbs past the wrapper (a ShadowRoot or document has no hasAttribute)
  const marked = (target: EventTarget, attr: string) => {
    for (
      let el = target as Element | null;
      el && el !== componentRef.current;
      el = el.parentNode as Element | null
    ) {
      if (el.hasAttribute?.(attr)) return true
    }
    return false
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
        return setActive({ value: shown[i].value, idx: i })
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    attr?.onKeyDown?.(e)
    // Safari ends the composition before the keydown, leaving only keyCode 229
    composing.current = e.nativeEvent.isComposing || e.keyCode === 229
    if (composing.current) return
    const { key, target } = e
    // chips and the clear button handle their own keys
    if (disabled || marked(target, 'clickable')) return
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
      value.length && deleteValue(value.length - 1)
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

  const showLabel = (optionObj: MultiSelectOption) => {
    if (typeof optionObj.label === 'object') {
      return optionObj?.title || optionObj.value
    } else {
      return optionObj.label
    }
  }

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
      <input
        name={name}
        type='hidden'
        value={value.map((opt) => opt.value).join(',')}
      />
      <div data-msl className={`msl ${menuOpen ? getActiveClass() : ''} `}>
        <div
          data-msl
          className='msl-input-wrp'
          style={{ width: calculatedWidth }}
        >
          {!singleSelect &&
            !disableChip &&
            value.map((val, i) => (
              <Chip
                key={`msl-chip-${i + 11}`}
                value={val}
                disabled={disabled}
                deleteAction={(byKey) => {
                  deleteValue(i)
                  // index keys: only the last chip's button goes away
                  byKey && i === value.length - 1 && refocus()
                }}
              />
            ))}
          {!singleSelect && disableChip && value.length > 0 && (
            <span className='msl-single-value' data-msl>
              {value.length === 1
                ? showLabel(value[0])
                : `${value.length} ${chipAlternateText}`}
            </span>
          )}
          {singleSelect && value.length === 1 && (
            <span className='msl-single-value' data-msl>
              {showLabel(value[0])}
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
                aria-label='close-menu'
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
                style={{ ...(menuOpen && { transform: 'rotate(180deg)' }) }}
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
              value,
              largeData,
              menuOpen,
              listId,
              activeIdx
            }}
          />
        ) : (
          <option className='msl-option msl-option-disable'>
            {emptyDataLabel}
          </option>
        )}
      </div>
    </div>
  )
}

export default MultiSelect as typeof PublicMultiSelect
