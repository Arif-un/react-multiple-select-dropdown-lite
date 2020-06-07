import React, { useState, memo } from 'react'
import CloseIcon from './CloseIcon';
import DownIcon from './DownIcon';

MultiSelectDropdown.defaultProps = {
  clearable: true,
  downArrow: true,
  width: 300,
  singleSelect: false,
  jsonValue: false,
  defaultValue: '',
  disableChip: false,
  placeholder: 'Select...',
  onChange: () => { },
  options: [{ label: 'Empty', value: '', disabled: true, style: { textAlign: 'center' } }],
}

function MultiSelectDropdown({ options, width, downArrowIcon, clearable, downArrow, onChange, singleSelect, jsonValue, defaultValue, className, placeholder, disableChip }) {

  const [menuOpen, setMenuOpen] = useState(false);

  let preDefinedValue = []
  if (defaultValue !== '' || defaultValue.length > 0) {
    if (typeof defaultValue === 'string') {
      const valueArr = defaultValue.split(",")
      preDefinedValue = options.filter(itm => -1 !== valueArr.indexOf(itm.value))
      if (singleSelect && preDefinedValue.length > 1) {
        preDefinedValue = [preDefinedValue[0]]
      }
    } else if (Array.isArray(preDefinedValue)) {
      preDefinedValue = options.filter(opt => defaultValue.some(pval => opt.value === pval.value));
      if (singleSelect && preDefinedValue.length > 1) {
        preDefinedValue = [preDefinedValue[0]]
      }
    }
  }
  const [value, setValue] = useState(preDefinedValue);
  let stopPropagation = true

  const setNewValue = val => {
    setValue(val)
    if (jsonValue) {
      onChange(val)
    } else {
      let stringvalue = ''
      stringvalue += val.map(itm => itm.value)
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
    } else if (e.target.parentNode.parentNode.parentNode.hasAttribute('data-msl')) {
      parentNode = e.target.parentNode.parentNode.parentNode
    } else if (e.target.parentNode.parentNode.parentNode.parentNode.hasAttribute('data-msl')) {
      parentNode = e.target.parentNode.parentNode.parentNode.parentNode
    }
    if (parentNode !== null) {
      inputNode = parentNode.querySelector('.msl-input')
    }

    if (inputNode !== null) {
      focus ? inputNode.focus() : inputNode.blur()
    }
  }

  const handleMenuBtn = e => {
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
  };

  const handleMenu = e => {
    if (!openable(e)) {
      document.removeEventListener('click', handleMenu)
      setMenuOpen(false)
    } else {
      setMenuOpen(true)
    }
  }

  const openable = e => {
    if (e.target.hasAttribute('data-msl')) {
      return true
    }
    return false
  }

  const handleOutsideClick = e => {
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
    const a = arr.some(itm => itm.value === value.value)
    // console.log('check exist', value.value)
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
        tmp = tmp.filter(itm => itm.value !== options[i].value)
      }
    }
    setNewValue(tmp)
  }

  const deleteValue = i => {
    const tmp = [...value]
    tmp.splice(i, 1)
    setNewValue(tmp)
  }

  const clearValue = () => {
    setNewValue([])
  }
  const showSearchOption = () => {
    if (!singleSelect && !disableChip ) {
      return true
    } else if (singleSelect && !value.length) {
      return true
    }else if(!singleSelect && disableChip && !value.length){
      return true
    }
    return false
  }

  return (
    <>
      {console.log('----------mounted')}
      <div onClick={handleClickInput} style={{ width }} className={`msl-wrp msl-vars ${className}`}>
        <div
          data-msl
          className={`msl ${menuOpen ? "msl-active" : ""} `}
        >
          <div data-msl className="msl-input-wrp"
            style={{ marginRight: clearable && downArrow ? 60 : downArrow || clearable ? 40 : 5 }}>
            {(!singleSelect && !disableChip) && value.map((val, i) => (
              <div key={`chip-${i + 11}`} className="msl-chip">
                {val.label}
                <button onClick={() => deleteValue(i)} className="msl-btn msl-chip-delete flx">
                  <CloseIcon />
                </button>
                <span />
              </div>
            ))}
            {!singleSelect && disableChip && value.length === 1 ? <span className="msl-single-value" data-msl style={{ width: width - (clearable && downArrow ? 60 : downArrow || clearable ? 40 : 5) }}>{value[0].label}d</span> : disableChip && value.length > 1 && <span className="msl-single-value" data-msl style={{ width: width - (clearable && downArrow ? 60 : downArrow || clearable ? 40 : 5) }}>{value.length} Selected</span>}
            {singleSelect && value.length === 1 && <span className="msl-single-value" data-msl style={{ width: width - (clearable && downArrow ? 60 : downArrow || clearable ? 40 : 5) }}>{value[0].label}</span>}
            {showSearchOption() && <div data-msl data-placeholder={placeholder} className="msl-input" contentEditable />}
          </div>
          {(clearable || downArrow) && (
            <div className="msl-actions flx">
              {clearable && (
                <button onClick={clearValue} className="msl-btn msl-clear-btn flx">
                  <CloseIcon />
                </button>
              )}
              {downArrow && (
                <button
                  onClick={handleMenuBtn}
                  className="msl-btn msl-arrow-btn flx"
                  style={{ ...(menuOpen && { transform: "rotate(180deg)" }) }}
                >
                  {downArrowIcon || <DownIcon />}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="msl-options">
          {options.map((opt, i) => (
            <option
              {...!singleSelect && { 'data-msl': true }}
              style={{ ...opt.style && opt.style }}
              onClick={() => { !opt.disabled && addValue(i) }}
              title={opt.label}
              key={opt.value + i + 10}
              className={`msl-option ${checkValueExist(opt, value) && 'msl-option-active'} ${opt.disabled && 'msl-option-disable'} ${opt.classes}`}
              value={opt.value}>
              {opt.label}
            </option>
          ))}
        </div>
      </div>
      <div>asdasd</div>
    </>
  )
}

export default memo(MultiSelectDropdown)
