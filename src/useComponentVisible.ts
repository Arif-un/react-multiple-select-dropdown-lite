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

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close()
      }
    }

    document.addEventListener('keydown', handleHideDropdown, true)
    document.addEventListener('click', handleClickOutside, true)
    return () => {
      document.removeEventListener('keydown', handleHideDropdown, true)
      document.removeEventListener('click', handleClickOutside, true)
    }
  }, [isComponentVisible, onClose])

  return { ref, isComponentVisible, setIsComponentVisible }
}
