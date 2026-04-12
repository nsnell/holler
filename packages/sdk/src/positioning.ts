/**
 * Percentage-based positioning.
 *
 * A click is stored as (x%, y%) of the scrollable document — NOT the
 * viewport. This means a pin placed while scrolled to the bottom of a
 * 10000px-tall page will remain anchored to that spot even if the page
 * is reloaded fresh.
 */
export interface Point {
  xPercent: number
  yPercent: number
}

/** Compute (x%, y%) from a pointer event relative to the full document. */
export function pointToPercent(clientX: number, clientY: number): Point {
  const docEl = document.documentElement
  const width = Math.max(docEl.scrollWidth, 1)
  const height = Math.max(docEl.scrollHeight, 1)

  const x = clientX + (window.scrollX || window.pageXOffset || 0)
  const y = clientY + (window.scrollY || window.pageYOffset || 0)

  return {
    xPercent: clamp01((x / width) * 100),
    yPercent: clamp01((y / height) * 100),
  }
}

/** Convert stored (x%, y%) back into absolute pixel coordinates on the page. */
export function percentToPixels(p: Point): { left: number; top: number } {
  const docEl = document.documentElement
  return {
    left: (p.xPercent / 100) * docEl.scrollWidth,
    top: (p.yPercent / 100) * docEl.scrollHeight,
  }
}

/**
 * Observe resize and scroll and notify a callback so pins can be
 * re-positioned. Returns a cleanup function.
 */
export function observeLayout(cb: () => void): () => void {
  let raf = 0
  const schedule = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      cb()
    })
  }

  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('scroll', schedule, { passive: true })

  const ro = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null
  ro?.observe(document.documentElement)

  return () => {
    if (raf) cancelAnimationFrame(raf)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('scroll', schedule)
    ro?.disconnect()
  }
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v))
}
