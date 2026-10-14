import type { ReactNode } from 'react'
import CloseIcon from './CloseIcon'

// the default customChip: called as a function, so it can't use hooks
export default function Chip({
  label,
  option,
  disabled,
  onDelete
}: {
  label: ReactNode
  option: { label?: unknown }
  disabled: boolean
  onDelete: () => void
}) {
  // names the value; a JSX label falls back to the label field, as the tooltip does
  const text = [label, option.label].find(
    (x) => typeof x === 'string' || typeof x === 'number'
  )
  return (
    <div className='msl-chip'>
      {label}
      <div
        role='button'
        aria-label={text === undefined ? 'Remove' : `Remove ${text}`}
        onClick={onDelete}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onDelete()
          }
        }}
        tabIndex={disabled ? -1 : 0}
        className='msl-btn msl-chip-delete msl-flx'
      >
        <CloseIcon />
      </div>
      <span />
    </div>
  )
}
