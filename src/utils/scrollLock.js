import { useEffect } from 'react'

// Reference-counted scroll lock for all modals, popups, and lightboxes across the application.
let lockCount = 0
let prevBodyOverflow = ''
let prevHtmlOverflow = ''
let prevPaddingRight = ''

export function lockScroll() {
  lockCount++
  if (lockCount === 1) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      
      prevBodyOverflow = document.body.style.overflow
      prevHtmlOverflow = document.documentElement.style.overflow
      prevPaddingRight = document.body.style.paddingRight

      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.documentElement.classList.add('modal-open-scroll-locked')
      document.body.classList.add('modal-open-scroll-locked')

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    }
  }
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
      document.body.style.paddingRight = prevPaddingRight
      document.documentElement.classList.remove('modal-open-scroll-locked')
      document.body.classList.remove('modal-open-scroll-locked')
    }
  }
}

export function useScrollLock(active = true) {
  useEffect(() => {
    if (active) {
      lockScroll()
      return () => {
        unlockScroll()
      }
    }
  }, [active])
}
