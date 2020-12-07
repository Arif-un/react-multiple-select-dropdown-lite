import React from 'react'

function Options({
  opts,
  singleSelect,
  addValue,
  checkValueExist,
  value,
  largeData,
  menuOpen
}) {
  if (largeData && !menuOpen) return null
  const optsArr = []
  function addInArr(opts) {
    for (const [i, opt] of opts.entries()) {
      if (opt.type === 'group') {
        optsArr.push(
          <div key={opt.title + i} data-msl className='msl-grp-title'>
            {opt.title}
          </div>
        )
        if (opt.childs.length > 0) {
          addInArr(opt.childs)
        } else {
          optsArr.push(
            <option className='msl-option msl-option-disable'>
              {opt.emptyDataLabel || 'No Data Found'}
            </option>
          )
        }
      } else {
        optsArr.push(
          <div
            tabIndex='0'
            key={opt.value + opt.label + i + 10}
            {...(!singleSelect && { 'data-msl': true })}
            style={{
              ...(opt.style && opt.style)
            }}
            onClick={() => {
              !opt.disabled && addValue(opt)
            }}
            onKeyPress={(e) => {
              e.key === 'Enter' && !opt.disabled && addValue(opt)
            }}
            title={typeof opt.label === 'object' ? opt?.title : opt.label}
            className={`msl-option ${checkValueExist(opt, value) ? 'msl-option-active' : ''
              } ${opt.disabled ? 'msl-option-disable' : ''} ${opt.classes !== undefined ? opt.classes : ''
              }`}
            value={opt.value}
          >
            {opt.label}
          </div>
        )
      }
    }
  }
  addInArr(opts)
  return <div>{optsArr}</div>
}

export default Options
