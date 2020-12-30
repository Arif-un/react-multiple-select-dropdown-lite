import React from 'react'

export default function CloseIcon() {
  return (
    <svg viewBox='0 0 10 10' className='msl-close-icn'>
      <line
        stroke='currentColor'
        strokeLinecap='round'
        x1='0'
        y1='0'
        x2='10'
        y2='10'
      />
      <line
        stroke='currentColor'
        strokeLinecap='round'
        x1='0'
        y1='10'
        x2='10'
        y2='0'
      />
    </svg>
  )
}
