/**
 * GSAP / ScrollTrigger Inspired Animation System
 * Manages IntersectionObserver triggers, staggered reveals, smooth easing, and interactive counter animations.
 */

export function initScrollAnimations() {
  if (typeof window === 'undefined') return () => {}

  // Observer for fade-in / slide-up reveals
  const revealElements = document.querySelectorAll(
    '.gsap-fade-up, .gsap-reveal, .gsap-stagger, .comparison-card, .benefit-card, .audience-card, .trust-pillar-item'
  )

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -80px 0px',
    threshold: 0.15
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('gsap-in-view')
        // Optional: unobserve once revealed for performance
        obs.unobserve(entry.target)
      }
    })
  }, observerOptions)

  revealElements.forEach((el) => {
    el.classList.add('gsap-anim-ready')
    observer.observe(el)
  })

  // Staggered child reveals inside containers
  const staggerContainers = document.querySelectorAll('.marketing-grid-4, .marketing-grid-3, .marketing-comparison-grid')
  staggerContainers.forEach((container) => {
    const children = container.children
    Array.from(children).forEach((child, index) => {
      child.style.transitionDelay = `${index * 90}ms`
    })
  })

  return () => {
    observer.disconnect()
  }
}
