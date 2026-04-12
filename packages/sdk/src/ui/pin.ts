import type { Comment } from '../types.js'
import { percentToPixels } from '../positioning.js'
import { identityFor } from '../identity.js'

/**
 * Render the pin layer for a set of comments.
 * Only top-level comments (parent_id === null) get a pin — replies
 * are shown inside the thread panel.
 */
export interface PinRenderOptions {
  onPinClick: (comment: Comment, el: HTMLElement) => void
}

export class PinLayer {
  private pins = new Map<string, HTMLElement>()
  private tempPin: HTMLElement | null = null
  private hidden = false

  constructor(
    private readonly layer: HTMLElement,
    private readonly options: PinRenderOptions,
  ) {}

  setHidden(hidden: boolean): void {
    this.hidden = hidden
    this.layer.style.display = hidden ? 'none' : ''
  }

  isHidden(): boolean {
    return this.hidden
  }

  /** Replace the current pin set. Re-used on every real-time update. */
  render(comments: Comment[]): void {
    const topLevel = comments.filter((c) => !c.parent_id)
    const seen = new Set<string>()

    topLevel.forEach((c, idx) => {
      seen.add(c.id)
      let el = this.pins.get(c.id) as HTMLButtonElement | undefined
      if (!el) {
        const btn = document.createElement('button')
        btn.className = 'vc-pin'
        btn.type = 'button'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.options.onPinClick(c, btn)
        })
        this.layer.appendChild(btn)
        this.pins.set(c.id, btn)
        el = btn
      }
      // Each author gets their own animal emoji + color, deterministic
      // from their auth ID. Anonymous comments fall back to a number.
      const id = identityFor(c.author_id ?? c.author_display_name, c.author_display_name)
      const hasAuthor = !!(c.author_id || c.author_display_name)
      el.textContent = hasAuthor ? id.emoji : String(idx + 1)
      // Resolved pins always render green, regardless of author identity.
      el.style.background = c.resolved ? '#10b981' : id.color
      el.dataset.resolved = c.resolved ? 'true' : 'false'
      el.title = c.body.slice(0, 80)
      this.positionPin(el, c.x_percent, c.y_percent)
    })

    // Remove pins that no longer exist.
    for (const [id, el] of this.pins) {
      if (!seen.has(id)) {
        el.remove()
        this.pins.delete(id)
      }
    }
  }

  /** Re-position every pin, e.g. after a resize. */
  reposition(comments: Comment[]): void {
    for (const c of comments) {
      const el = this.pins.get(c.id)
      if (el) this.positionPin(el, c.x_percent, c.y_percent)
    }
    if (this.tempPin && this.tempPin.dataset.xp && this.tempPin.dataset.yp) {
      this.positionPin(
        this.tempPin,
        Number(this.tempPin.dataset.xp),
        Number(this.tempPin.dataset.yp),
      )
    }
  }

  /** Place a temporary pin while the user is composing. */
  showTempPin(xPercent: number, yPercent: number): HTMLElement {
    this.removeTempPin()
    const el = document.createElement('button')
    el.className = 'vc-pin'
    el.type = 'button'
    el.dataset.temp = 'true'
    el.dataset.xp = String(xPercent)
    el.dataset.yp = String(yPercent)
    el.textContent = '+'
    this.positionPin(el, xPercent, yPercent)
    this.layer.appendChild(el)
    this.tempPin = el
    return el
  }

  removeTempPin(): void {
    if (this.tempPin) {
      this.tempPin.remove()
      this.tempPin = null
    }
  }

  getPinElement(id: string): HTMLElement | undefined {
    return this.pins.get(id)
  }

  destroy(): void {
    this.pins.forEach((el) => el.remove())
    this.pins.clear()
    this.removeTempPin()
  }

  private positionPin(el: HTMLElement, xPercent: number, yPercent: number): void {
    const { left, top } = percentToPixels({ xPercent, yPercent })
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }
}
