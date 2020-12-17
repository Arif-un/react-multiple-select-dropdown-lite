import React from 'react'
import CloseIcon from './CloseIcon'

export default function Chip({ value, deleteAction }) {
  const showChipText = (opt) => {
    if (typeof opt.label === 'object') {
      return opt?.title || opt.value
    } else {
      return opt.label
    }
  }

  return (
    <div clickable='true' className='msl-chip'>
      {showChipText(value)}
      <div
        role='button'
        clickable='true'
        aria-label='delete-value'
        onClick={deleteAction}
        onKeyPress={deleteAction}
        tabIndex='0'
        className='msl-btn msl-chip-delete msl-flx'
      >
        <CloseIcon />
      </div>
      <span />
    </div>
  )
}
