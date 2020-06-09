import React, { useState } from 'react'
import CloseIcon from './CloseIcon.jsx'
import DownIcon from './DownIcon.jsx'
import './styles.css'

MultiSelect.defaultProps = {
  clearable: true,
  downArrow: true,
  width: 300,
  singleSelect: false,
  jsonValue: false,
  defaultValue: '',
  disableChip: false,
  name: '',
  required: false,
  placeholder: 'Select...',
  onChange: () => {},
  options: [
    {
      label: 'Empty',
      value: '',
      disabled: true,
      style: { textAlign: 'center' }
    }
  ]
}

function MultiSelect({
  options,
  width,
  downArrowIcon,
  clearable,
  downArrow,
  onChange,
  singleSelect,
  jsonValue,
  defaultValue,
  className,
  placeholder,
  disableChip,
  name
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  let preDefinedValue = []
  if (defaultValue !== '' || defaultValue.length > 0) {
    if (typeof defaultValue === 'string') {
      const valueArr = defaultValue.split(',')
      preDefinedValue = options.filter(
        (itm) => valueArr.indexOf(itm.value) !== -1
      )
      if (singleSelect && preDefinedValue.length > 1) {
        preDefinedValue = [preDefinedValue[0]]
      }
    } else if (
      Array.isArray(defaultValue) &&
      defaultValue.length > 0 &&
      typeof defaultValue[0] !== 'string'
    ) {
      preDefinedValue = options.filter((opt) =>
        defaultValue.some((pval) => opt.value === pval.value)
      )
      if (singleSelect && preDefinedValue.length > 1) {
        preDefinedValue = [preDefinedValue[0]]
      }
    } else if (Array.isArray(defaultValue) && defaultValue.length > 0) {
      preDefinedValue = options.filter((opt) =>
        defaultValue.some((pval) => opt.value === pval)
      )
      if (singleSelect && preDefinedValue.length > 1) {
        preDefinedValue = [preDefinedValue[0]]
      }
    }
  }
  const [value, setValue] = useState(preDefinedValue)
  let stopPropagation = true

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

  const inputRefFocus = (e, focus) => {
    let parentNode = null
    let inputNode = null
    if (e.target.hasAttribute('data-msl')) {
      parentNode = e.target
    } else if (e.target.parentNode.hasAttribute('data-msl')) {
      parentNode = e.target.parentNode
    } else if (e.target.parentNode.parentNode.hasAttribute('data-msl')) {
      parentNode = e.target.parentNode.parentNode
    } else if (
      e.target.parentNode.parentNode.parentNode.hasAttribute('data-msl')
    ) {
      parentNode = e.target.parentNode.parentNode.parentNode
    } else if (
      e.target.parentNode.parentNode.parentNode.parentNode.hasAttribute(
        'data-msl'
      )
    ) {
      parentNode = e.target.parentNode.parentNode.parentNode.parentNode
    }
    if (parentNode !== null) {
      inputNode = parentNode.querySelector('.msl-input')
    }

    if (inputNode !== null) {
      focus ? inputNode.focus() : inputNode.blur()
    }
  }

  const handleMenuBtn = (e) => {
    stopPropagation = false
    if (menuOpen) {
      inputRefFocus(e, false)
      setMenuOpen(false)
      document.removeEventListener('click', handleMenu)
    } else {
      inputRefFocus(e, true)
      setMenuOpen(true)
      document.addEventListener('click', handleMenu)
    }
  }

  const handleMenu = (e) => {
    if (!openable(e)) {
      document.removeEventListener('click', handleMenu)
      setMenuOpen(false)
    } else {
      setMenuOpen(true)
    }
  }

  const openable = (e) => {
    if (e.target.hasAttribute('data-msl')) {
      return true
    }
    return false
  }

  const handleOutsideClick = (e) => {
    if (openable(e)) {
      if (!menuOpen) {
        document.addEventListener('click', handleOutsideClick)
      }
      inputRefFocus(e, true)
      setMenuOpen(true)
    } else {
      setMenuOpen(false)
      document.removeEventListener('click', handleOutsideClick)
    }
  }

  const handleClickInput = (e) => {
    if (stopPropagation) {
      handleOutsideClick(e)
    }
  }

  const checkValueExist = (value, arr) => {
    const a = arr.some((itm) => itm.value === value.value)
    return a
  }

  const addValue = (i) => {
    let tmp = [...value]
    if (singleSelect) {
      tmp = [options[i]]
    } else {
      if (!checkValueExist(options[i], value)) {
        tmp.push(options[i])
      } else {
        tmp = tmp.filter((itm) => itm.value !== options[i].value)
      }
    }
    setNewValue(tmp)
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

  return (
    <div
      name={name}
      value={JSON.stringify(value)}
      onClick={handleClickInput}
      style={{ width }}
      className={`msl-wrp msl-vars ${className}`}
    >
      <div data-msl className={`msl ${menuOpen ? 'msl-active' : ''} `}>
        <div
          data-msl
          className='msl-input-wrp'
          style={{
            marginRight:
              clearable && downArrow ? 60 : downArrow || clearable ? 40 : 5
          }}
        >
          {!singleSelect &&
            !disableChip &&
            value.map((val, i) => (
              <div key={`msl-chip-${i + 11}`} className='msl-chip'>
                {val.label}
                <button
                  type='button'
                  aria-label='delete-value'
                  onClick={() => deleteValue(i)}
                  className='msl-btn msl-chip-delete msl-flx'
                >
                  <CloseIcon />
                </button>
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
              contentEditable
            />
          )}
        </div>
        {(clearable || downArrow) && (
          <div className='msl-actions msl-flx'>
            {clearable && (
              <button
                type='button'
                aria-label='close-menu'
                onClick={clearValue}
                className='msl-btn msl-clear-btn msl-flx'
              >
                <CloseIcon />
              </button>
            )}
            {downArrow && (
              <button
                type='button'
                aria-label='toggle-menu'
                onClick={handleMenuBtn}
                className='msl-btn msl-arrow-btn msl-flx'
                style={{ ...(menuOpen && { transform: 'rotate(180deg)' }) }}
              >
                {downArrowIcon || <DownIcon />}
              </button>
            )}
          </div>
        )}
      </div>
      <div className='msl-options'>
        {options.map((opt, i) => (
          <option
            {...(!singleSelect && { 'data-msl': true })}
            style={{ ...(opt.style && opt.style) }}
            onClick={() => {
              !opt.disabled && addValue(i)
            }}
            title={opt.label}
            key={opt.value + i + 10}
            className={`msl-option ${
              checkValueExist(opt, value) && 'msl-option-active'
            } ${opt.disabled && 'msl-option-disable'} ${opt.classes}`}
            value={opt.value}
          >
            {opt.label}
          </option>
        ))}
      </div>
    </div>
  )
}

export default MultiSelect
