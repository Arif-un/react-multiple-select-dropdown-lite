import React from 'react'
import CloseIcon from './CloseIcon'
import type { MultiSelectOption } from './index'

export default function Chip({
  value,
  deleteAction
}: {
  value: MultiSelectOption
  deleteAction: () => void
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
        onClick={deleteAction}
        onKeyPress={deleteAction}
        tabIndex={0}
        className='msl-btn msl-chip-delete msl-flx'
      >
        <CloseIcon />
      </div>
      <span />
    </div>
  )
}
