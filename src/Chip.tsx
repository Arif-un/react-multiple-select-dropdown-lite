import type { ReactNode } from 'react'
import CloseIcon from './CloseIcon'

// the default customChip: called as a function, so it can't use hooks
export default function Chip({
  label,
  disabled,
  onDelete
}: {
  label: ReactNode
  disabled: boolean
  onDelete: () => void
}) {
  return (
    <div className='msl-chip'>
      {label}
      <div
        role='button'
        aria-label='delete-value'
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
