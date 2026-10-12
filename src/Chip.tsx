import React from 'react'
import CloseIcon from './CloseIcon'
import type { MultiSelectOption } from './index'

export default function Chip({
  value,
  disabled,
  deleteAction
}: {
  value: MultiSelectOption
  disabled?: boolean
  deleteAction: (byKey?: boolean) => void
}) {
  const showChipText = (opt: MultiSelectOption) => {
    if (typeof opt.label === 'object') {
      return opt?.title || opt.value
    } else {
      return opt.label
    }
  }

  return (
    // @ts-expect-error clickable is a custom attribute (it stops the menu from opening)
    <div clickable='true' className='msl-chip'>
      {showChipText(value)}
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
