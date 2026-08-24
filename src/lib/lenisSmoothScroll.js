/**
 * Lenis-Inspired Pure JavaScript Physics Smooth Scroll Engine
 * Provides buttery-smooth inertial scrolling, momentum physics, and requestAnimationFrame synchronization.
 */

class SmoothScroller {
  constructor(options = {}) {
    this.options = {
      lerp: options.lerp || 0.09, // Lower = smoother/heavier, Higher = more responsive
      wheelMultiplier: options.wheelMultiplier || 0.9,
      touchMultiplier: options.touchMultiplier || 1.2,
      smoothTouch: options.smoothTouch !== undefined ? options.smoothTouch : false,
      ...options
    }

    this.targetY = window.scrollY
    this.currentY = window.scrollY
    this.isScrolling = false
    this.rafId = null
    this.isTouch = false
    this.listeners = new Set()

    this.onWheel = this.onWheel.bind(this)
    this.onTouchStart = this.onTouchStart.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.onScroll = this.onScroll.bind(this)
    this.raf = this.raf.bind(this)

    this.init()
  }

  init() {
    // Check for reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    // Set scroll restoration to manual so scroll positions don't jump
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }

    window.addEventListener('wheel', this.onWheel, { passive: false })
    window.addEventListener('touchstart', this.onTouchStart, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: true })
    window.addEventListener('scroll', this.onScroll, { passive: true })

    this.targetY = window.scrollY
    this.currentY = window.scrollY
    this.startRaf()
  }

  onWheel(e) {
    // Don't intercept if modifier keys are pressed or inside a scrolling sub-panel
    if (e.ctrlKey || e.metaKey || e.altKey) return

    let target = e.target
    while (target && target !== document.body) {
      const overflowY = window.getComputedStyle(target).overflowY
      if ((overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight) {
        // Let scrollable modals/sub-containers scroll naturally
        return
      }
      target = target.parentElement
    }

    e.preventDefault()

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const delta = e.deltaY * this.options.wheelMultiplier

    this.targetY = Math.max(0, Math.min(maxScroll, this.targetY + delta))
    this.startRaf()
  }

  onTouchStart() {
    this.isTouch = true
    this.targetY = window.scrollY
    this.currentY = window.scrollY
  }

  onTouchMove() {
    if (!this.options.smoothTouch) {
      this.targetY = window.scrollY
      this.currentY = window.scrollY
    }
  }

  onScroll() {
    if (!this.isScrolling) {
      this.targetY = window.scrollY
      this.currentY = window.scrollY
    }
  }

  raf() {
    const diff = this.targetY - this.currentY
    const delta = diff * this.options.lerp

    this.currentY += delta

    if (Math.abs(diff) > 0.5) {
      this.isScrolling = true
      window.scrollTo(0, Math.round(this.currentY))
      this.emit('scroll', { scroll: this.currentY, velocity: delta })
      this.rafId = requestAnimationFrame(this.raf)
    } else {
      this.currentY = this.targetY
      window.scrollTo(0, this.targetY)
      this.isScrolling = false
      this.emit('scroll', { scroll: this.currentY, velocity: 0 })
      this.rafId = null
    }
  }

  startRaf() {
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.raf)
    }
  }

  scrollTo(target, options = {}) {
    let top = 0
    if (typeof target === 'number') {
      top = target
    } else if (typeof target === 'string') {
      const el = document.querySelector(target)
      if (el) top = el.getBoundingClientRect().top + window.scrollY - (options.offset || 0)
    } else if (target instanceof HTMLElement) {
      top = target.getBoundingClientRect().top + window.scrollY - (options.offset || 0)
    }

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    this.targetY = Math.max(0, Math.min(maxScroll, top))

    if (options.immediate) {
      this.currentY = this.targetY
      window.scrollTo(0, this.targetY)
    } else {
      this.startRaf()
    }
  }

  on(event, callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  emit(event, data) {
    for (const cb of this.listeners) {
      try {
        cb(data)
      } catch (err) {
        console.error(err)
      }
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    window.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('touchstart', this.onTouchStart)
    window.removeEventListener('touchmove', this.onTouchMove)
    window.removeEventListener('scroll', this.onScroll)
    this.listeners.clear()
  }
}

let instance = null

export function initSmoothScroll(options = {}) {
  if (typeof window === 'undefined') return null
  if (!instance) {
    instance = new SmoothScroller(options)
  }
  return instance
}

export function getSmoothScroller() {
  return instance
}
