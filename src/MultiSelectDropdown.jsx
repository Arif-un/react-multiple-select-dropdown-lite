import React, { useState, useRef, memo } from 'react'
import CloseIcon from './CloseIcon';
import DownIcon from './DownIcon';

MultiSelectDropdown.defaultProps = {
  clearable: true,
  downArrow: true
}

function MultiSelectDropdown(props) {
  const { options, width, downArrowIcon, clearable, downArrow, onChange } = props;
  const mslInputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [value, setValue] = useState([]);
  let stopPropagation = true

  const setNewValue = val => {
    setValue(val)
    onChange(val)
  }

  const inputRefFocus = (e, focus) => {
    let parentNode = null
    let inputNode = null
    if(e.target.hasAttribute('data-msl')){
      parentNode = e.target
    }else if (e.target.parentNode.hasAttribute('data-msl')) {
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
      console.log('----------',inputNode)
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
    const tmp = [...value]
    if (!checkValueExist(options[i], value)) {
      tmp.push(options[i])
      setNewValue(tmp)
    } else {
      deleteValue(i)
    }
  }

  const deleteValue = i => {
    const tmp = [...value]
    tmp.splice(i, 1)
    setNewValue(tmp)
  }

  const clearValue = () => {
    setNewValue([])
  }

  return (
    <>
      {console.log('----------mounted')}
      <div onClick={handleClickInput} style={{ width }} className="msl-wrp">
        <div
          data-msl
          className={`msl ${menuOpen ? "msl-active" : ""}`}
        >
          <div data-msl className="msl-input-wrp"
            style={{ marginRight: clearable && downArrow ? 60 : downArrow || clearable ? 40 : 0 }}>
            {value.map((val, i) => (
              <div key={`chip-${i + 11}`} className="msl-chip">
                {val.label}
                <button onClick={() => deleteValue(i)} className="msl-btn msl-chip-delete flx">
                  <CloseIcon />
                </button>
                <span />
              </div>
            ))}
            <div data-msl /* onBlur={onInputBlur} */ ref={mslInputRef} className="msl-input" contentEditable />
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
              data-msl
              onClick={() => addValue(i)}
              title={opt.label}
              key={opt.value + i + 10}
              className={`msl-option ${checkValueExist(opt, value) && 'msl-option-active'}`}
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
