/* eslint-disable no-labels */
import React, { useState, useEffect, useRef } from 'react'
import CloseIcon from './CloseIcon.jsx'
import DownIcon from './DownIcon.jsx'
import Options from './Options'
import './styles.css'
import useComponentVisible from './useComponentVisible.jsx'

MultiSelect.defaultProps = {
  clearable: true,
  downArrow: true,
  width: 300,
  singleSelect: false,
  jsonValue: false,
  defaultValue: '',
  disableChip: false,
  name: '',
  style: {},
  disabled: false,
  limit: null,
  emptyDataLabel: 'No Data Found',
  placeholder: 'Select...',
  onChange: () => { },
  options: [
    {
      label: 'Empty',
      value: '',
      disabled: true,
      style: { textAlign: 'center' }
    }
  ],
  customValue: false
}

function MultiSelect({
  options: userOptions,
  width,
  downArrowIcon,
  closeIcon,
  clearable,
  downArrow,
  onChange,
  singleSelect,
  jsonValue,
  defaultValue,
  className,
  placeholder,
  disableChip,
  name,
  style,
  attr,
  largeData,
  disabled,
  limit,
  emptyDataLabel,
  customValue
}) {
  const [value, setValue] = useState([])
  const [options, setOptions] = useState(userOptions || [])
  const [search, setSearch] = useState(null)
  const inputFld = useRef(null)
  const {
    ref,
    isComponentVisible: menuOpen,
    setIsComponentVisible: setMenuOpen
  } = useComponentVisible(false)

  const getValueObjFromOptios = (defaultValue, options) => {
    if (!defaultValue) return []
    let defaultValArr = defaultValue
    const extraValues = []
    const searchedOptions = []

    if (typeof defaultValue === 'string') {
      defaultValArr = defaultValue.split(',')
    }

    const setExtraValue = (value) => {
      if (typeof value === 'string') {
        extraValues.push({ label: value, value })
      } else if (typeof value === 'object') {
        const newValueObj = { label: value, value }
        if ('label' in value && typeof value.label === 'string') {
          newValueObj.label = value.label
        } else if ('title' in value) {
          newValueObj.label = value.title
        }
        extraValues.push(newValueObj)
      }
    }

    for (let i = 0; i < defaultValArr.length; i++) {
      if (typeof defaultValArr[i] === 'string') {
        const optObject = searchOptions(
          defaultValArr[i],
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
          defaultValArr[i].value,
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

    let customValuesGroup = []
    if (extraValues.length) {
      customValuesGroup = createCustomValueAndOption(extraValues)
    }
    setOptions([...options, ...customValuesGroup])
    return [...searchedOptions, ...extraValues]
  }
  useEffect(() => {
    setOptions(userOptions)
  }, [userOptions])

  useEffect(() => {
    let preDefinedValue = getValueObjFromOptios(defaultValue, options)

    if (singleSelect && preDefinedValue.length > 0) {
      preDefinedValue = [preDefinedValue[0]]
    }

    setValue(preDefinedValue)
  }, [defaultValue])

  const setNewValue = (val) => {
    setValue(val)
    if (jsonValue) {
      onChange(val)
    } else {
      let stringvalue = ''
      stringvalue += val.map((itm) => itm.value)
      onChange(stringvalue)
    }
  }

  const checkValueExist = (value, arr) => {
    const bool = arr.some((itm) => itm.value === value.value)
    return bool
  }

  const filterCreateOpt = ({ label, value }) => {
    if (typeof label !== 'object' && label.match(/Create "|"+/g)) {
      label = label.replace(/Create "|"+/g, '')
    }
    return { label, value }
  }

  const addValue = (newValObj) => {
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

  const deleteValue = (i) => {
    const tmp = [...value]
    tmp.splice(i, 1)
    setNewValue(tmp)
  }

  const clearValue = () => {
    setNewValue([])
  }

  const showSearchOption = () => {
    if (!singleSelect && !disableChip) {
      return true
    } else if (singleSelect && !value.length) {
      return true
    } else if (!singleSelect && disableChip && !value.length) {
      return true
    }
    return false
  }

  const searchOptions = (str, options, exact, type) => {
    const searchedOptions = []
    const searchedOptValues = []

    const searchInOptions = (opt) => {
      for (let i = 0; i < opt.length; i++) {
        if (opt[i]?.type === 'group') {
          searchInOptions(opt[i].childs)
        } else if (!exact) {
          if (
            typeof opt[i].label !== 'object' &&
            opt[i].label.match(new RegExp(`${str}`, 'gi'))
          ) {
            searchedOptions.push(opt[i])
          } else if (
            typeof opt[i].label === 'object' &&
            opt[i]?.title?.match(new RegExp(`${str}`, 'gi'))
          ) {
            searchedOptions.push(opt[i])
          } else if (opt[i].value.match(new RegExp(`${str}`, 'gi'))) {
            searchedOptValues.push(opt[i])
          }
        } else if (exact) {
          if (opt[i][type] === str) {
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
    searchInOptions(options)
    return [...searchedOptions, ...searchedOptValues]
  }

  const createCustomValueAndOption = (valueObj) => {
    const customValuesGroup = []
    const customValuesIndx = options.findIndex(
      (opt) => opt?.type === 'group' && opt?.title === 'Custom Values'
    )

    if (customValuesIndx === -1) {
      customValuesGroup.push({
        title: 'Custom Values',
        type: 'group',
        childs: [...valueObj]
      })
    } else if (Array.isArray(valueObj)) {
      valueObj.map((value) => options[customValuesIndx].childs.push(value))
    } else if (typeof valueObj === 'object') {
      options[customValuesIndx].childs.push(valueObj)
    }
    setOptions([...options, ...customValuesGroup])

    return customValuesGroup
  }

  const handleSearchAndCustomValue = (e) => {
    const textValue = e.target.textContent.trim().replace(/,+/g, '')

    if (textValue) {
      const newValue = {
        label: `Create "${textValue}"`,
        value: textValue
      }

      const searchedOptions = searchOptions(textValue, options)

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
        setSearch(searchedOptions)
      } else {
        customValue ? setSearch([newValue]) : setSearch([])
      }

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
          search.length > 0 && addValue(search[0])
        }
      }
    } else {
      setSearch(null)
    }
  }

  const checkIsDropdownHandle = (target) => {
    if (
      target.hasAttribute('dropdown-handle') ||
      target.parentNode.hasAttribute('dropdown-handle') ||
      target.parentNode.parentNode.hasAttribute('dropdown-handle')
    ) {
      return true
    }
  }

  const openMenu = ({ target }) => {
    if (checkIsDropdownHandle(target)) {
      setMenuOpen(!menuOpen)
    } else {
      setMenuOpen(true)
    }
  }

  const showChipText = (opt) => {
    if (typeof opt.label === 'object') {
      return opt?.title || opt.value
    } else {
      return opt.label
    }
  }

  return (
    <div
      ref={ref}
      {...attr}
      onClick={openMenu}
      tabIndex='0'
      onKeyPress={openMenu}
      style={{ ...style, width }}
      className={`msl-wrp msl-vars ${className} ${disabled ? 'msl-disabled' : ''
        }`}
    >
      <input name={name} type='hidden' value={value?.map((itm) => itm.value)} />
      <div data-msl className={`msl ${menuOpen ? 'msl-active' : ''} `}>
        <div
          data-msl
          className='msl-input-wrp'
          style={{
            width: `calc(100% - ${clearable && downArrow
                ? '60px'
                : downArrow || clearable
                  ? '40px'
                  : '5px'
              }`
          }}
        >
          {!singleSelect &&
            !disableChip &&
            value.map((val, i) => (
              <div key={`msl-chip-${i + 11}`} className='msl-chip'>
                {showChipText(val)}
                <div
                  role='button'
                  aria-label='delete-value'
                  onClick={() => deleteValue(i)}
                  onKeyPress={() => deleteValue(i)}
                  tabIndex='0'
                  className='msl-btn msl-chip-delete msl-flx'
                >
                  <CloseIcon />
                </div>
                <span />
              </div>
            ))}
          {!singleSelect && disableChip && value.length === 1 ? (
            <span
              className='msl-single-value'
              data-msl
              style={{
                width:
                  width -
                  (clearable && downArrow
                    ? 60
                    : downArrow || clearable
                      ? 40
                      : 5)
              }}
            >
              {value[0].label}d
            </span>
          ) : (
              disableChip &&
              value.length > 1 && (
                <span
                  className='msl-single-value'
                  data-msl
                  style={{
                    width:
                      width -
                      (clearable && downArrow
                        ? 60
                        : downArrow || clearable
                          ? 40
                          : 5)
                  }}
                >
                  {value.length} Selected
                </span>
              )
            )}
          {singleSelect && value.length === 1 && (
            <span
              className='msl-single-value'
              data-msl
              style={{
                width:
                  width -
                  (clearable && downArrow
                    ? 60
                    : downArrow || clearable
                      ? 40
                      : 5)
              }}
            >
              {value[0].label}
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
        </div>
        {(clearable || downArrow) && (
          <div className='msl-actions msl-flx'>
            {clearable && value.length > 0 && (
              <div
                role='button'
                aria-label='close-menu'
                onClick={clearValue}
                onKeyPress={clearValue}
                tabIndex='0'
                className='msl-btn msl-clear-btn msl-flx'
              >
                {closeIcon || <CloseIcon />}
              </div>
            )}
            {downArrow && (
              <div
                role='button'
                tabIndex='0'
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

export default MultiSelect
