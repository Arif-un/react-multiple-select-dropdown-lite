import type { ReactElement, ReactNode } from 'react'
import type { MultiSelectGroup, MultiSelectOption } from './index'

// options and groups share one loop, told apart by `type` at runtime
type Item = MultiSelectOption & MultiSelectGroup

function Options({
  opts,
  singleSelect,
  addValue,
  checkValueExist,
  largeData,
  menuOpen,
  listId,
  activeIdx,
  valueOf,
  labelOf,
  textOf
}: {
  opts: ReadonlyArray<MultiSelectOption | MultiSelectGroup>
  singleSelect?: boolean
  addValue: (opt: MultiSelectOption) => void
  checkValueExist: (opt: MultiSelectOption) => boolean
  largeData?: boolean
  menuOpen: boolean
  listId: string
  activeIdx: number
  valueOf: (opt: MultiSelectOption) => string
  labelOf: (opt: MultiSelectOption) => ReactNode
  textOf: (opt: MultiSelectOption, label?: ReactNode) => string
}) {
  if (largeData && !menuOpen) return null
  // counts options only, like MultiSelect's flattened list
  let n = 0
  let g = 0
  function addInArr(opts: Item[], out: ReactElement[]) {
    for (const [i, opt] of opts.entries()) {
      if (opt.type === 'group') {
        // the title names the group, as in the APG grouped listbox
        const titleId = `${listId}-g${g++}`
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
            <div key='msl-grp-empty' className='msl-option msl-option-disable'>
              {opt.emptyDataLabel || 'No Data Found'}
            </div>
          )
        }
        out.push(
          <div key={titleId} role='group' aria-labelledby={titleId}>
            {childs}
          </div>
        )
      } else {
        const idx = n++
        // getLabel once: it may build JSX
        const label = labelOf(opt)
        out.push(
          <div
            id={`${listId}-${idx}`}
            role='option'
            aria-selected={checkValueExist(opt)}
            aria-disabled={!!opt.disabled}
            tabIndex={-1}
            key={`${i}-${valueOf(opt)}`}
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
            title={textOf(opt, label)}
            className={`msl-option ${
              checkValueExist(opt) ? 'msl-option-active' : ''
            } ${opt.disabled ? 'msl-option-disable' : ''} ${
              opt.classes !== undefined ? opt.classes : ''
            }${idx === activeIdx ? ' msl-option-focused' : ''}`}
            // @ts-expect-error value is not a div attribute; kept, users and tests read it
            value={valueOf(opt)}
          >
            {label}
          </div>
        )
      }
    }
    return out
  }
  return <div>{addInArr(opts as Item[], [])}</div>
}

export default Options
