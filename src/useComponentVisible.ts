import { useRef, useState, useEffect } from 'react'

export default function useComponentVisible({
  initialIsVisible,
  onClose
}: {
  initialIsVisible: boolean
  onClose: () => void
}) {
  const [isComponentVisible, setIsComponentVisible] = useState(initialIsVisible)
  const ref = useRef<HTMLDivElement>(null)

  // listen only while open, so onClose fires once per open -> closed
  useEffect(() => {
    if (!isComponentVisible) return

    const close = () => {
      setIsComponentVisible(false)
      onClose()
    }

    const handleHideDropdown = (event: KeyboardEvent) => {
      event.key === 'Escape' && close()
    }

    // clicks, and focus moving out (Tab). composedPath: in a shadow root the document sees the host as target
    const handleClickOutside = (event: Event) => {
      if (ref.current && !event.composedPath().includes(ref.current)) {
        close()
      }
    }

    document.addEventListener('keydown', handleHideDropdown, true)
    document.addEventListener('click', handleClickOutside, true)
    document.addEventListener('focusin', handleClickOutside, true)
    return () => {
      document.removeEventListener('keydown', handleHideDropdown, true)
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('focusin', handleClickOutside, true)
    }
  }, [isComponentVisible, onClose])

  return { ref, isComponentVisible, setIsComponentVisible }
}
