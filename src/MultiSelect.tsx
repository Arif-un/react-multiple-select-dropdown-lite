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

// climbed without null checks below, as in v2.0.6
interface Climbable {
  hasAttribute(name: string): boolean
  parentNode: Climbable
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
  chipAlternateText = 'Item Selected',
  closeOnSelect = true,
  disableSearch = false
}: Props) {
  const [value, setValue] = useState<MultiSelectOption[]>([])
  const [options, setOptions] = useState<readonly Item[]>(userOptions || [])
  const [search, setSearch] = useState<MultiSelectOption[] | null>(null)
  const inputFld = useRef<HTMLDivElement>(null)
  const {
    ref: componentRef,
    isComponentVisible: menuOpen,
    setIsComponentVisible: setMenuOpen
  } = useComponentVisible({
    initialIsVisible: false,
    onClose: onMenuClose
  })

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
        // current behavior: value stays the whole object
        const newValueObj = { label: value, value } as unknown as {
          label: unknown
          value: string
        }
        if ('label' in value && typeof value.label === 'string') {
          newValueObj.label = value.label
        } else if ('title' in value) {
          newValueObj.label = value.title
        }
        extraValues.push(newValueObj as MultiSelectOption)
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

    let customValuesGroup: MultiSelectGroup[] = []
    if (extraValues.length) {
      customValuesGroup = createCustomValueAndOption(extraValues)
    }
    setOptions([...userOptions, ...customValuesGroup])
    return [...searchedOptions, ...extraValues]
  }

  useEffect(() => {
    if (clearAll && value.length) {
      clearValue()
    }
  }, [clearAll])

  useEffect(() => {
    setOptions(userOptions)
  }, [userOptions])

  useEffect(() => {
    let preDefinedValue = getValueObjFromOptions(defaultValue, options)

    if (singleSelect && preDefinedValue.length) {
      preDefinedValue = [preDefinedValue[0]]
    }

    setValue(preDefinedValue)
    // close on option select
    if (closeOnSelect && singleSelect) {
      setMenuOpen(false)
    }
  }, [defaultValue])

  const setNewValue = (val: MultiSelectOption[]) => {
    setValue(val)
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

  const filterCreateOpt = ({ label, value }: MultiSelectOption) => {
    /* v8 ignore else -- label is always 'Create "..."' */
    if (typeof label !== 'object' && label.match(/Create "|"+/g)) {
      label = label.replace(/Create "|"+/g, '')
    }
    return { label, value }
  }

  const addValue = (newValObj: MultiSelectOption) => {
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
  }

  const deleteValue = (i: number) => {
    const tmp = [...value]
    tmp.splice(i, 1)
    setNewValue(tmp)
  }

  const clearValue = () => {
    setNewValue([])
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
          // plain substring match: typed text is not a regex
          const needle = str.toLowerCase()
          if (
            typeof opt[i].label !== 'object' &&
            (opt[i].label as string).toLowerCase().includes(needle)
          ) {
            searchedOptions.push(opt[i])
          } else if (
            typeof opt[i].label === 'object' &&
            opt[i]?.title?.toLowerCase().includes(needle)
          ) {
            searchedOptions.push(opt[i])
          } else if (opt[i].value.toLowerCase().includes(needle)) {
            searchedOptValues.push(opt[i])
          }
        } else {
          if (opt[i][type!] === str) {
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

  const createCustomValueAndOption = (
    valueObj: MultiSelectOption | MultiSelectOption[]
  ) => {
    const customValuesGroup: MultiSelectGroup[] = []
    const customValuesIndx = options.findIndex(
      (opt) => opt?.type === 'group' && opt?.title === 'Custom Values'
    )

    if (customValuesIndx === -1) {
      customValuesGroup.push({
        title: 'Custom Values',
        type: 'group',
        // published bundles compiled `[...valueObj]` loosely to concat, which also accepts a single object
        childs: ([] as MultiSelectOption[]).concat(valueObj)
      })
    } else if (Array.isArray(valueObj)) {
      valueObj.map((value) =>
        ((options[customValuesIndx] as MultiSelectGroup).childs as Item[]).push(
          value
        )
      )
    } else {
      ;((options[customValuesIndx] as MultiSelectGroup).childs as Item[]).push(
        valueObj
      )
    }
    setOptions([...options, ...customValuesGroup])

    return customValuesGroup
  }

  const handleSearchAndCustomValue = (e: React.KeyboardEvent) => {
    const textValue = (e.target as HTMLElement)
      .textContent!.trim()
      .replace(/,+/g, '')

    if (textValue) {
      const newValue = {
        label: `Create "${textValue}"`,
        value: textValue
      }

      const searchedOptions = searchOptions(textValue, options)
      // Enter reads this, not `search`: that is null when text arrived without a keyup (paste, IME)
      let results = searchedOptions

      if (searchedOptions.length) {
        if (customValue) {
          const exactOptionValue = searchOptions(
            textValue,
            options,
            true,
            'value'
          )

          !exactOptionValue.length && searchedOptions.push(newValue)
        }
      } else if (customValue) {
        results = [newValue]
      }
      setSearch(results)

      const filteredNewValue = filterCreateOpt(newValue)

      if (e.key === 'Enter' || e.key === ',') {
        if (
          customValue &&
          !searchedOptions.length &&
          !checkValueExist(filteredNewValue, value)
        ) {
          createCustomValueAndOption(filteredNewValue)

          addValue(newValue)
        } else {
          results.length > 0 && addValue(results[0])
        }
      }
    } else {
      setSearch(null)
    }
  }

  const nonClickableItem = (target: Climbable) => {
    if (
      target.hasAttribute('clickable') ||
      target.parentNode.hasAttribute('clickable') ||
      target.parentNode.parentNode.hasAttribute('clickable') ||
      target.parentNode.parentNode.parentNode.hasAttribute('clickable')
    ) {
      return false
    }
    return true
  }

  const checkIsDropdownHandle = (target: Climbable) => {
    if (
      target.hasAttribute('dropdown-handle') ||
      target.parentNode.hasAttribute('dropdown-handle') ||
      target.parentNode.parentNode.hasAttribute('dropdown-handle')
    ) {
      return true
    }
  }

  const focusSearchInput = () => {
    if (inputFld.current) {
      inputFld.current.focus()
    }
  }

  const openMenu = ({ target }: React.SyntheticEvent) => {
    if (nonClickableItem(target as unknown as Climbable)) {
      if (checkIsDropdownHandle(target as unknown as Climbable)) {
        if (!menuOpen) {
          setMenuOpen(true)
          onMenuOpen()
          focusSearchInput()
        } else {
          setMenuOpen(false)
          onMenuClose()
        }
      } else {
        setMenuOpen(true)
        onMenuOpen()
        focusSearchInput()
      }
    }
  }

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
    if (window.innerHeight - (rect.top + el.clientHeight) < 200) {
      return 'msl-active-up'
    }
    return 'msl-active'
  }

  return (
    <div
      ref={componentRef}
      {...attr}
      onClick={openMenu}
      tabIndex={0}
      onKeyPress={openMenu}
      style={{ ...style }}
      className={`msl-wrp msl-vars ${className || ''} ${
        disabled ? 'msl-disabled' : ''
      }`}
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
                deleteAction={() => deleteValue(i)}
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
              ref={inputFld}
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
                onClick={clearValue}
                onKeyPress={clearValue}
                tabIndex={0}
                className='msl-btn msl-clear-btn msl-flx'
              >
                {closeIcon || <CloseIcon />}
              </div>
            )}
            {downArrow && (
              <div
                role='button'
                tabIndex={0}
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
      <div className='msl-options'>
        {!search && options.length ? (
          <Options
            opts={options}
            {...{
              singleSelect,
              addValue,
              checkValueExist,
              value,
              largeData,
              menuOpen
            }}
          />
        ) : search && search.length ? (
          <Options
            opts={search}
            {...{
              singleSelect,
              addValue,
              checkValueExist,
              value,
              largeData,
              menuOpen
            }}
          />
        ) : (
          ((search && !search.length) || (options && !options.length)) && (
            <option className='msl-option msl-option-disable'>
              {emptyDataLabel}
            </option>
          )
        )}
      </div>
    </div>
  )
}

export default MultiSelect as typeof PublicMultiSelect
