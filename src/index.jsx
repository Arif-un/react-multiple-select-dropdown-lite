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
  onChange: () => {},
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
  // const [menuOpen, setMenuOpen] = useState(false)
  const [value, setValue] = useState([])
  const [options, setOptions] = useState(userOptions || [])
  const [search, setSearch] = useState(null)
  const inputFld = useRef(null)
  const {
    ref,
    isComponentVisible: menuOpen,
    setIsComponentVisible: setMenuOpen
  } = useComponentVisible(false)

  const preparDefaultValue = (defaultValue) => {
    let defaultValArr = defaultValue
    if (typeof defaultValue === 'string') {
      defaultValArr = defaultValue.split(',')
    }
    const optionString = JSON.stringify(options)
    const extraValues = []

    const setExtraValue = (value) => {
      extraValues.push({ label: value, value })
      return { label: value, value }
    }

    const defaultValueObj = []

    for (const value of defaultValArr) {
      const matchedVals = optionString.match(
        new RegExp(
          `{+?.[^{]*?"${value
            .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') // escape special chars
            .replace(/"/g, '\\\\$&')}"}`, // escape " as \\
          'g'
        )
      )

      if (matchedVals) {
        if (matchedVals.length === 1) {
          defaultValueObj.push(JSON.parse(matchedVals))
        } else if (matchedVals.length > 1) {
          defaultValueObj.push(JSON.parse(`[${matchedVals.join(',')}]`))
        }
      } else if (value !== '' && value !== null && customValue) {
        setExtraValue(value)
        defaultValueObj.push({ label: value, value })
      }
    }

    setOptions([...options, ...extraValues])
    return defaultValueObj
  }

  const filterExtraCustomVal = (valArrObj) => {
    const optionString = JSON.stringify(options)
    return valArrObj.filter(
      (obj) =>
        !JSON.parse(
          optionString.match(new RegExp(`{+?.[^{]*?${obj.value}"}`, 'g'))
        )
    )
  }

  useEffect(() => {
    setOptions(userOptions)
  }, [userOptions])

  useEffect(() => {
    let preDefinedValue = []
    if (defaultValue !== '' || defaultValue.length > 0) {
      // when default value is string and value separated comma
      if (typeof defaultValue === 'string') {
        preDefinedValue = preparDefaultValue(defaultValue)
        if (singleSelect && preDefinedValue.length > 1) {
          preDefinedValue = [preDefinedValue[0]]
        }
      } else if (
        Array.isArray(defaultValue) &&
        defaultValue.length > 0 &&
        typeof defaultValue[0] !== 'string'
      ) {
        // when default value is array of object
        preDefinedValue = defaultValue // set array as default
        const extraValue = filterExtraCustomVal(defaultValue)
        setOptions([...options, ...extraValue])
        if (singleSelect && preDefinedValue.length > 1) {
          preDefinedValue = [preDefinedValue[0]]
        }
      } else if (Array.isArray(defaultValue) && defaultValue.length > 0) {
        // when default value is array of string
        preDefinedValue = preparDefaultValue(defaultValue)
        if (singleSelect && preDefinedValue.length > 1) {
          preDefinedValue = [preDefinedValue[0]]
        }
      }
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
    if (label.match(/Create "|"+/g)) {
      label = label.replace(/Create "|"+/g, '')
    }
    return { label, value }
  }

  const addValue = (newValObj) => {
    newValObj = filterCreateOpt(newValObj)
    let tmp = [...value]
    if (singleSelect) {
      tmp = [newValObj]
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
    // clear input
    inputFld.current.innerHTML = ''
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

  const searchValue = (e) => {
    const textValue = e.target.textContent.trim().replace(/,+/g, '')

    if (textValue) {
      const newValue = {
        label: `Create "${textValue}"`,
        value: textValue
      }

      const optionsString = JSON.stringify(options)

      const searchedOptions = optionsString.match(
        new RegExp(
          `{"label":+?.[^{]*?(${textValue.replace(
            /[-[\]{}()*+?.,\\^$|#\s]/g,
            '\\$&'
          )})+?.[^{]*?}`,
          'gi'
        )
      )

      if (searchedOptions) {
        const searchedOptionsArr = JSON.parse(`[${searchedOptions}]`)

        if (customValue) {
          const exactOptionValue = optionsString.match(
            new RegExp(
              `{"label":(.[^{]*?)"value":"${textValue.replace(
                /[-[\]{}()*+?.,\\^$|#\s]/g,
                '\\$&'
              )}"}`,
              'gi'
            )
          )

          !exactOptionValue && searchedOptionsArr.push(newValue)
        }
        setSearch(searchedOptionsArr)
      } else {
        customValue ? setSearch([newValue]) : setSearch([])
      }

      if (e.key === 'Enter' || e.key === ',') {
        if (
          customValue &&
          !searchedOptions &&
          !checkValueExist(filterCreateOpt(newValue), value)
        ) {
          setOptions([...options, filterCreateOpt(newValue)])
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

  return (
    <div
      ref={ref}
      {...attr}
      onClick={openMenu}
      style={{ ...style, width }}
      className={`msl-wrp msl-vars ${className} ${
        disabled ? 'msl-disabled' : ''
      }`}
    >
      <input name={name} type='hidden' value={value.map((itm) => itm.value)} />
      <div data-msl className={`msl ${menuOpen ? 'msl-active' : ''} `}>
        <div
          data-msl
          className='msl-input-wrp'
          style={{
            width: `calc(100% - ${
              clearable && downArrow
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
                {val.label}
                <div
                  role='button'
                  aria-label='delete-value'
                  onClick={() => deleteValue(i)}
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
              onKeyUp={searchValue}
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
                className='msl-btn msl-clear-btn msl-flx'
              >
                {closeIcon || <CloseIcon />}
              </div>
            )}
            {downArrow && (
              <div
                role='button'
                aria-label='toggle-menu'
                dropdown-handle='true'
                // onClick={() => setMenuOpen(!menuOpen)}
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
