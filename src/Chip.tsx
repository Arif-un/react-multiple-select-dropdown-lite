import type { ReactNode } from 'react'
import { CloseIcon } from './icons'
import type { MultiSelectClassNames } from './index'

// the default customChip: called as a function, so it can't use hooks
export default function Chip({
  label,
  option,
  disabled,
  fixed,
  classNames,
  onDelete
}: {
  label: ReactNode
  option: { label?: unknown }
  disabled: boolean
  fixed: boolean
  classNames: MultiSelectClassNames
  onDelete: () => void
}) {
  // names the value; a JSX label falls back to the label field, as the tooltip does
  const text = [label, option.label].find(
    (x) => typeof x === 'string' || typeof x === 'number'
  )
  return (
    <div
      data-fixed={fixed || undefined}
      className={`msl-chip ${classNames.chip ?? ''}`}
    >
      {label}
      {!fixed && (
        <div
          role='button'
          aria-label={text === undefined ? 'Remove' : `Remove ${text}`}
          aria-disabled={disabled}
          onClick={onDelete}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onDelete()
            }
          }}
          tabIndex={disabled ? -1 : 0}
          className={`msl-btn msl-chip-delete ${classNames.chipDelete ?? ''}`}
        >
          <CloseIcon />
        </div>
      )}
    </div>
  )
}
