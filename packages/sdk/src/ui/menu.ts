import { h } from './dom.js'

/**
 * Small floating popover anchored above the toolbar.
 * Items are declarative so the host can rebuild the menu per-open.
 */
export interface MenuItem {
  label: string
  hint?: string
  variant?: 'primary' | 'default'
  disabled?: boolean
  onClick?: () => void
}

export interface MenuHeader {
  type: 'header'
  label: string
  icon?: boolean
}

export type MenuEntry = MenuItem | MenuHeader | 'separator'

export interface MenuOptions {
  items: MenuEntry[]
  anchor: { x: number; y: number }
  onClose: () => void
}

export class Menu {
  public readonly el: HTMLElement
  private outsideHandler: (e: MouseEvent) => void
  private escHandler: (e: KeyboardEvent) => void

  constructor(options: MenuOptions) {
    const items = options.items.map((item) => {
      if (item === 'separator') {
        return h('div', { className: 'vc-menu-sep', 'aria-hidden': 'true' })
      }
      if ('type' in item && item.type === 'header') {
        const children: (Node | string)[] = []
        if (item.icon) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 28 28')
          svg.setAttribute('fill', 'none')
          svg.setAttribute('class', 'vc-menu-header-icon')
          svg.innerHTML = '<rect x="2" y="2" width="24" height="19" rx="5" fill="#FFE14D"/><polygon points="5,21 5,27 12,21" fill="#FFE14D"/>'
          children.push(svg)
        }
        children.push(item.label)
        return h('div', { className: 'vc-menu-header' }, children)
      }
      const mi = item as MenuItem
      return h(
        'button',
        {
          type: 'button',
          className: 'vc-menu-item',
          dataset: {
            variant: mi.variant ?? 'default',
            disabled: mi.disabled ? 'true' : 'false',
          },
          onClick: () => {
            if (mi.disabled) return
            mi.onClick?.()
            options.onClose()
          },
        },
        [
          h('span', { className: 'vc-menu-label' }, [mi.label]),
          mi.hint ? h('span', { className: 'vc-menu-hint' }, [mi.hint]) : '',
        ],
      )
    })

    this.el = h('div', { className: 'vc-menu', role: 'menu' }, items)
    queueMicrotask(() => this.anchor(options.anchor.x, options.anchor.y))

    // Close on outside click (window-level, since menu itself lives in shadow).
    this.outsideHandler = (e: MouseEvent) => {
      const path = e.composedPath()
      if (path.includes(this.el)) return
      options.onClose()
    }
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') options.onClose()
    }
    // Defer so the current click (the one that opened us) doesn't immediately close.
    setTimeout(() => {
      window.addEventListener('click', this.outsideHandler, true)
      window.addEventListener('keydown', this.escHandler)
    }, 0)
  }

  destroy(): void {
    window.removeEventListener('click', this.outsideHandler, true)
    window.removeEventListener('keydown', this.escHandler)
    this.el.remove()
  }

  private anchor(x: number, y: number): void {
    const rect = this.el.getBoundingClientRect()
    const margin = 12
    // Prefer opening above the anchor (toolbar is bottom-right).
    let top = y - rect.height - 12
    let left = x - rect.width + 20
    if (top < margin) top = y + 20
    if (left < margin) left = margin
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin
    }
    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`
  }
}
