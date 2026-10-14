import type { ReactNode } from 'react'
import CloseIcon from './CloseIcon'

export default function Chip({
  label,
  disabled,
  deleteAction
}: {
  label: ReactNode
  disabled?: boolean
  deleteAction: (byKey?: boolean) => void
}) {
  return (
    // @ts-expect-error clickable is a custom attribute (it stops the menu from opening)
    <div clickable='true' className='msl-chip'>
      {label}
      <div
        role='button'
        // @ts-expect-error see above
        clickable='true'
        aria-label='delete-value'
        onClick={() => deleteAction()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            deleteAction(true)
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
