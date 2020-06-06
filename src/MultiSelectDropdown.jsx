import React, { useState, useRef } from 'react'
import CloseIcon from './CloseIcon';
import DownIcon from './DownIcon';

MultiSelectDropdown.defaultProps = {
  clearable: true,
  downArrow: true
}

export default function MultiSelectDropdown(props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { options, width, downArrowIcon, clearable, downArrow } = props;
  const mslRef = useRef(null);
  const mslInputRef = useRef(null);
  // const mslInputRef = useRef(null);

  const handleKeyUp = e => {
    console.log(e.target.innerHTML);
  };

  const handleClick = e => {
    /* if (menuOpen) {
      mslInputRef.current.blur()
      setMenuOpen(false)
    } else {
      mslInputRef.current.focus()
      setMenuOpen(true)
    }
 */
    //console.log(e.target)
  }

  const handleOnFocus = e => {
    console.log(e.target)
    mslInputRef.current.focus()
    setMenuOpen(true)
    // setMenuOpen(true);
    // e.target.querySelector(".msl-input").focus();
  };

  const onInputBlur = e => {
    setMenuOpen(false);
  };

  const handleMenu = e => {
    e.preventDefault();
    if (menuOpen) {
      setMenuOpen(false);
    } else {
      setMenuOpen(true);
    }
  };
  return (
    <>
      <div style={{ width }} className="msl-wrp">
        <div
          ref={mslRef}
          className={`msl ${menuOpen ? "msl-active" : ""}`}
          tabIndex="0"
          onClick={handleClick}
          onFocus={handleOnFocus}
          onBlur={onInputBlur}
        >
          <div className="msl-input-wrp"
            style={{ marginRight: clearable && downArrow ? 60 : downArrow || clearable ? 40 : 0 }}>
            <div className="msl-chip">
              dsadasdf{" "}
              <button className="msl-btn msl-chip-delete flx">
                <CloseIcon />
              </button>
              <span />
            </div>
            <div className="msl-chip">
              dsadasdsdasdf
               <button className="msl-btn msl-chip-delete flx">
                <CloseIcon />
              </button>
            </div>
            <div ref={mslInputRef} tabIndex="0" className="msl-input" contentEditable />
          </div>
          {(clearable || downArrow) && (
            <div className="msl-actions flx">
              {clearable && (
                <button className="msl-btn msl-clear-btn flx">
                  <CloseIcon />
                </button>
              )}
              {downArrow && (
                <button
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
          {options.map(opt => (
            <option className="msl-option" value={opt.value}>
              {opt.label}
            </option>
          ))}
        </div>
      </div>
      asdasd
    </>
  )
}
