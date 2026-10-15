import type { ReactElement, ReactNode } from 'react'
import type {
  MultiSelectClassNames,
  MultiSelectGroup,
  MultiSelectOption
} from './index'

// options and groups share one loop, told apart by `type` at runtime
type Item = MultiSelectOption & MultiSelectGroup

function Options({
  opts,
  addValue,
  checkValueExist,
  isDisabled,
  listId,
  activeIdx,
  valueOf,
  labelOf,
  textOf,
  cn
}: {
  opts: ReadonlyArray<MultiSelectOption | MultiSelectGroup>
  addValue: (opt: MultiSelectOption) => void
  checkValueExist: (opt: MultiSelectOption) => boolean
  isDisabled: (opt: MultiSelectOption) => boolean
  listId: string
  activeIdx: number
  valueOf: (opt: MultiSelectOption) => string
  labelOf: (opt: MultiSelectOption) => ReactNode
  textOf: (opt: MultiSelectOption, label?: ReactNode) => string
  cn: MultiSelectClassNames
}) {
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
            role='presentation'
            className={`msl-grp-title ${cn.groupTitle ?? ''}`}
          >
            {opt.title}
          </div>
        ]
        if (opt.childs.length > 0) {
          addInArr(opt.childs as Item[], childs)
        } else {
          childs.push(
            <div
              key='msl-grp-empty'
              className={`msl-option msl-option-disable ${cn.empty ?? ''}`}
            >
              {opt.emptyDataLabel || 'No Data Found'}
            </div>
          )
        }
        out.push(
          <div
            key={titleId}
            role='group'
            aria-labelledby={titleId}
            className={`msl-grp ${cn.group ?? ''}`}
          >
            {childs}
          </div>
        )
      } else {
        const idx = n++
        // getLabel once: it may build JSX
        const label = labelOf(opt)
        const off = isDisabled(opt)
        out.push(
          <div
            id={`${listId}-${idx}`}
            role='option'
            aria-selected={checkValueExist(opt)}
            aria-disabled={off}
            tabIndex={-1}
            key={`${i}-${valueOf(opt)}`}
            style={opt.style}
            // opt.disabled, not off: past the limit a pick still calls onChange, the value unchanged
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
            } ${off ? 'msl-option-disable' : ''} ${
              opt.classes ?? ''
            }${idx === activeIdx ? ' msl-option-focused' : ''} ${cn.option ?? ''}`}
            data-focused={idx === activeIdx || undefined}
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
  return <>{addInArr(opts as Item[], [])}</>
}

export default Options
