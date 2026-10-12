import React from 'react'
import type { MultiSelectGroup, MultiSelectOption } from './index'

// options and groups share one loop, told apart by `type` at runtime
type Item = MultiSelectOption & MultiSelectGroup

function Options({
  opts,
  singleSelect,
  addValue,
  checkValueExist,
  value,
  largeData,
  menuOpen,
  listId,
  activeIdx
}: {
  opts: ReadonlyArray<MultiSelectOption | MultiSelectGroup>
  singleSelect?: boolean
  addValue: (opt: MultiSelectOption) => void
  checkValueExist: (opt: MultiSelectOption, arr: MultiSelectOption[]) => boolean
  value: MultiSelectOption[]
  largeData?: boolean
  menuOpen: boolean
  listId?: string
  activeIdx: number
}) {
  if (largeData && !menuOpen) return null
  // counts options only, like MultiSelect's flattened list
  let n = 0
  let g = 0
  function addInArr(opts: Item[], out: React.ReactElement[]) {
    for (const [i, opt] of opts.entries()) {
      if (opt.type === 'group') {
        // the title names the group, as in the APG grouped listbox
        const titleId = /* v8 ignore next */ listId && `${listId}-g${g++}`
        const childs = [
          <div
            key='msl-grp-title'
            id={titleId}
            data-msl
            role='presentation'
            className='msl-grp-title'
          >
            {opt.title}
          </div>
        ]
        if (opt.childs.length > 0) {
          addInArr(opt.childs as Item[], childs)
        } else {
          childs.push(
            <option
              key='msl-grp-empty'
              className='msl-option msl-option-disable'
            >
              {opt.emptyDataLabel || 'No Data Found'}
            </option>
          )
        }
        out.push(
          <div key={opt.title + i} role='group' aria-labelledby={titleId}>
            {childs}
          </div>
        )
      } else {
        const idx = n++
        out.push(
          <div
            // no listId only before mount on React < 18
            id={/* v8 ignore next */ listId && `${listId}-${idx}`}
            role='option'
            aria-selected={checkValueExist(opt, value)}
            aria-disabled={!!opt.disabled}
            tabIndex={-1}
            key={opt.value + opt.label + i + 10}
            {...(!singleSelect && { 'data-msl': true })}
            style={{
              ...(opt.style && opt.style)
            }}
            onClick={() => {
              !opt.disabled && addValue(opt)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // else the wrapper picks the highlighted option too
                e.stopPropagation()
                !opt.disabled && addValue(opt)
              }
            }}
            title={typeof opt.label === 'object' ? opt?.title : opt.label}
            className={`msl-option ${
              checkValueExist(opt, value) ? 'msl-option-active' : ''
            } ${opt.disabled ? 'msl-option-disable' : ''} ${
              opt.classes !== undefined ? opt.classes : ''
            }${idx === activeIdx ? ' msl-option-focused' : ''}`}
            // @ts-expect-error value is not a div attribute; kept, users and tests read it
            value={opt.value}
          >
            {opt.label}
          </div>
        )
      }
    }
    return out
  }
  return <div>{addInArr(opts as Item[], [])}</div>
}

export default Options
