import React, { useState, useEffect, useRef } from 'react'
import Chip from './Chip'
import CloseIcon from './CloseIcon'
import DownIcon from './DownIcon'
import type PublicMultiSelect from './index'
import type {
  MultiSelectBaseProps,
  MultiSelectGroup,
  MultiSelectOption
} from './index'
import Options from './Options'
import './styles.css'
import useComponentVisible from './useComponentVisible'

type Item = MultiSelectOption | MultiSelectGroup
type DefaultValueItem = Exclude<
  MultiSelectBaseProps['defaultValue'],
  string | undefined
>[number]

// both onChange modes in one; the parameter defaults below fill the gaps
type Props = MultiSelectBaseProps & {
  jsonValue?: boolean
  onChange?: (value: string | MultiSelectOption[]) => void
}

// Defaults as parameter defaults: React 19's jsx runtime ignores defaultProps on function components.
// Objects live here so their identity is stable (a new options array per render would loop the options effect).
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

// aria ids: useId (React 18+) keeps SSR and hydration in sync. Older React has no
// SSR-safe id, so a counter sets it after mount: server and first client render both omit it
let lastId = 0
/* v8 ignore next -- the counter is for React < 18 (covered by the React 16/17 CI jobs) */
const useListId: () => string | undefined = React.useId
  ? () => `msl-listbox${React.useId()}`
  : () => {
      const [id, setId] = useState<string>()
      useEffect(() => setId(`msl-listbox-${++lastId}`), [])
      return id
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
  options: userOptions = emptyOptions,
  downArrowIcon,
  closeIcon,
  clearable = true,
  clearAll = false,
  downArrow = true,
  onChange = noop,
  singleSelect = false,
  jsonValue = false,
  defaultValue = '',
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
}: Props) {
  const [value, setValue] = useState<MultiSelectOption[]>([])
  // values created by customValue, listed after the user's options.
  // Own state, so a parent passing a new options array doesn't wipe them
  const [custom, setCustom] = useState<MultiSelectOption[]>([])
  const base = userOptions || []
  const options: readonly Item[] = custom.length
    ? [...base, { title: 'Custom Values', type: 'group', childs: custom }]
    : base
  const [search, setSearch] = useState<MultiSelectOption[] | null>(null)
  const items = search || options
  // the Create "..." item last offered by the search
  const createOpt = useRef<MultiSelectOption | null>(null)
  const inputFld = useRef<HTMLDivElement>(null)
  const listId = useListId()
  // the keyboard highlighted option: idx tells repeated values apart
  const [active, setActive] = useState<{ value: string; idx: number } | null>(
    null
  )
  // the last keydown belonged to an IME composition: its Enter confirms the text, not a pick
  const composing = useRef(false)
  // the user changed the value since defaultValue last changed
  const userChanged = useRef(false)
  // with `value` the parent owns the selection: user changes only call onChange
  const controlled = valueProp !== undefined
  const selected = controlled ? valueProp : defaultValue
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

  const getValueObjFromOptions = (
    defaultValue: Props['defaultValue'],
    options: readonly Item[]
  ): MultiSelectOption[] => {
    if (!defaultValue) return []
    let defaultValArr = defaultValue as DefaultValueItem[]
    const extraValues: MultiSelectOption[] = []
    const searchedOptions: MultiSelectOption[] = []

    if (typeof defaultValue === 'string') {
      defaultValArr = defaultValue.split(',')
    }

    const setExtraValue = (value: DefaultValueItem) => {
      if (typeof value === 'string') {
        extraValues.push({ label: value, value })
      } else {
        // a JSX label falls back to title, then value, as in chips
        const label =
          typeof value.label === 'string'
            ? value.label
            : value.title || value.value
        extraValues.push({ label, value: value.value })
      }
    }

    for (let i = 0; i < defaultValArr.length; i++) {
      if (typeof defaultValArr[i] === 'string') {
        const optObject = searchOptions(
          defaultValArr[i] as string,
          options,
          true,
          'value'
        )
        if (optObject.length > 0) {
          searchedOptions.push(optObject[0])
        } else if (customValue) {
          setExtraValue(defaultValArr[i])
        }
      } else if (typeof defaultValArr[i] === 'object') {
        const optObject = searchOptions(
          (defaultValArr[i] as Exclude<DefaultValueItem, string>).value,
          options,
          true,
          'value'
        )
        if (optObject.length > 0) {
          searchedOptions.push(optObject[0])
        } else if (customValue) {
          setExtraValue(defaultValArr[i])
        }
      }
    }

    // created values stay, as without a parent; ones the options now have go (#12)
    setCustom((prev) =>
      [...prev, ...extraValues].filter(
        (opt, i, all) =>
          all.findIndex((o) => o.value === opt.value) === i &&
          !flatten(options).some((o) => o.value === opt.value)
      )
    )
    return [...searchedOptions, ...extraValues]
  }

  useEffect(() => {
    if (clearAll && value.length) {
      clearValue()
    }
  }, [clearAll])

  useEffect(() => {
    userChanged.current = false
  }, [selected])

  // options too, as they may arrive after mount (#12). Not after a user change:
  // parents often pass a new options array on every render
  useEffect(() => {
    if (userChanged.current) return
    let preDefinedValue = getValueObjFromOptions(selected, userOptions)

    if (singleSelect && preDefinedValue.length) {
      preDefinedValue = [preDefinedValue[0]]
    }

    setValue(preDefinedValue)
  }, [selected, userOptions])

  const setNewValue = (val: MultiSelectOption[]) => {
    if (!controlled) {
      userChanged.current = true
      setValue(val)
    }
    if (jsonValue) {
      onChange(val)
    } else {
      let stringvalue = ''
      stringvalue += val.map((itm) => itm.value)
      onChange(stringvalue)
    }
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
      setCustom([...custom, newValObj])
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
      inputFld.current.innerHTML = ''
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

  const searchOptions = (
    str: string,
    options: readonly Item[],
    exact?: boolean,
    type?: 'value'
  ) => {
    const searchedOptions: MultiSelectOption[] = []
    const searchedOptValues: MultiSelectOption[] = []

    // groups recurse first, so the rest of the loop only sees options
    const searchInOptions = (opt: MultiSelectOption[]) => {
      for (let i = 0; i < opt.length; i++) {
        if (opt[i]?.type === 'group') {
          searchInOptions(opt[i].childs as MultiSelectOption[])
        } else if (!exact) {
          // plain substring match: typed text is not a regex.
          // String(): untyped JS often passes numbers
          const needle = str.toLowerCase()
          if (
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
        } else {
          if (String(opt[i][type!]) === str) {
            searchedOptions.push(opt[i])
          }
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
    const textValue = (e.target as HTMLElement)
      .textContent!.trim()
      .replace(/,+/g, '')

    if (textValue) {
      createOpt.current = {
        label: `Create "${textValue}"`,
        value: textValue
      }
      // Enter reads this, not `search`: that is null when text arrived without a keyup (paste, IME)
      const results = searchOptions(textValue, options)
      if (
        customValue &&
        !searchOptions(textValue, options, true, 'value').length
      ) {
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
      !inputFld.current.textContent
    ) {
      // a value next to the search field means chips mode
      value.length && deleteValue(value.length - 1)
    } else if (
      /^Arrow(Down|Up)$/.test(key) ||
      // with search text, Home/End move the caret
      (/^(Home|End)$/.test(key) &&
        !(target === inputFld.current && inputFld.current.textContent))
    ) {
      e.preventDefault()
      highlight(key)
      openMenu(e)
    } else if (
      key === 'Enter' ||
      (key.length === 1 && !e.ctrlKey && !e.metaKey)
    ) {
      // Space on the wrapper would scroll the page; Enter in the search adds a line break
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
      <input name={name} type='hidden' value={value?.map((itm) => itm.value)} />
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
            <div
              data-msl
              data-placeholder={placeholder}
              className='msl-input'
              contentEditable={!disabled}
              onKeyUp={handleSearchAndCustomValue}
              onInput={(e) => {
                setActive(null)
                handleSearchAndCustomValue(e)
              }}
              onPaste={(e) => {
                // plain text only: a rich paste keeps its formatting in a contentEditable.
                // jsdom has no execCommand: then the browser default runs
                const text = e.clipboardData.getData('text/plain')
                document.execCommand?.(
                  'insertText',
                  false,
                  text.replace(/\s+/g, ' ')
                ) && e.preventDefault()
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
