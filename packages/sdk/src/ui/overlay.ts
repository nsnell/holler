import { STYLES, PIN_LAYER_STYLES } from './styles.js'

/**
 * The Overlay owns:
 *   - A shadow-DOM-bearing `<div id="holler-root">` where all
 *     chrome (toolbar, thread, composer, modal) renders.
 *   - A separate `.vc-pin-layer` element appended to `<body>` where
 *     pins render, so they can overlap page content precisely while
 *     still having scoped styles.
 *   - The "comment mode" state toggle: sets a document-level crosshair
 *     cursor and captures clicks to place new pins.
 */
export class Overlay {
  private host: HTMLDivElement
  private shadow: ShadowRoot
  private pinLayer: HTMLDivElement
  private tint: HTMLDivElement
  private pinLayerStyle: HTMLStyleElement
  private active = false
  private onTintClick: ((e: MouseEvent) => void) | null = null

  /** Called when a click-to-place-pin occurs on the host page. */
  public onPlace: ((clientX: number, clientY: number) => void) | null = null

  constructor(theme: 'light' | 'dark') {
    // 1. Shadow-DOM host
    this.host = document.createElement('div')
    this.host.id = 'holler-root'
    this.host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; z-index: 2147483000;'
    this.shadow = this.host.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = STYLES
    this.shadow.appendChild(style)

    const inner = document.createElement('div')
    inner.className = 'vc-root'
    inner.dataset.theme = theme
    this.shadow.appendChild(inner)

    // 2. Pin layer (outside shadow DOM)
    this.pinLayer = document.createElement('div')
    this.pinLayer.className = 'vc-pin-layer'
    this.pinLayer.setAttribute('data-holler-pins', '')

    this.pinLayerStyle = document.createElement('style')
    this.pinLayerStyle.setAttribute('data-holler', 'pin-layer')
    this.pinLayerStyle.textContent = PIN_LAYER_STYLES

    // 3. Tint overlay (also outside shadow DOM so it covers the viewport)
    this.tint = document.createElement('div')
    this.tint.className = 'vc-overlay-tint'
    this.tint.setAttribute('data-holler-tint', '')
    this.tint.style.display = 'none'
  }

  /** Attach to document. Safe to call after DOMContentLoaded. */
  mount(): void {
    document.head.appendChild(this.pinLayerStyle)
    document.body.appendChild(this.pinLayer)
    document.body.appendChild(this.tint)
    document.body.appendChild(this.host)
  }

  /** The shadow root where chrome UI is rendered. */
  getShadow(): ShadowRoot {
    return this.shadow
  }

  /** The element inside the shadow root you should mount UI into. */
  getRoot(): HTMLElement {
    return this.shadow.querySelector('.vc-root') as HTMLElement
  }

  /** The absolutely-positioned layer where pins live. */
  getPinLayer(): HTMLDivElement {
    return this.pinLayer
  }

  setTheme(theme: 'light' | 'dark'): void {
    const root = this.getRoot()
    root.dataset.theme = theme
  }

  isActive(): boolean {
    return this.active
  }

  setActive(active: boolean): void {
    if (this.active === active) return
    this.active = active

    if (active) {
      // The tint overlay becomes the click surface. It sits above the host
      // page but below our pins and chrome, so clicks on buttons/links are
      // naturally blocked (they never receive the event), while pins and
      // the toolbar/thread remain clickable thanks to their higher z-index.
      this.tint.style.display = 'block'
      this.tint.style.pointerEvents = 'auto'
      this.tint.style.cursor = 'crosshair'
      this.onTintClick = (e: MouseEvent) => {
        // Defensive: if for any reason our own chrome bubbles a click to the
        // tint, ignore it. (Normally chrome is above the tint in z-order.)
        const path = e.composedPath()
        if (path.some((n) => n instanceof Element && n.closest?.('#holler-root, .vc-pin-layer'))) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        this.onPlace?.(e.clientX, e.clientY)
      }
      this.tint.addEventListener('click', this.onTintClick)
    } else {
      this.tint.style.display = 'none'
      this.tint.style.pointerEvents = 'none'
      this.tint.style.cursor = ''
      if (this.onTintClick) {
        this.tint.removeEventListener('click', this.onTintClick)
        this.onTintClick = null
      }
    }
  }

  destroy(): void {
    this.setActive(false)
    this.host.remove()
    this.pinLayer.remove()
    this.tint.remove()
    this.pinLayerStyle.remove()
  }
}
