import type { AuthUser } from '../types.js'
import { h } from './dom.js'
import { identityFor } from '../identity.js'

export interface ToolbarOptions {
  position: 'bottom-right' | 'bottom-left' | 'bottom-center'
  emoji?: string
  /** Called when the main button is clicked. Host decides whether to open a menu or toggle mode. */
  onClick: (anchor: { x: number; y: number }) => void
  onHide: () => void
}

/**
 * Compact floating button in the bottom corner.
 * - 38px circular button with an emoji (branded, cute, unobtrusive)
 * - Corner count badge (hidden when 0)
 * - Hover reveals a small × to hide the toolbar entirely
 * - Click toggles comment-placement mode
 */
export class Toolbar {
  public readonly el: HTMLElement
  private button: HTMLButtonElement
  private countEl: HTMLSpanElement
  private avatarEl: HTMLElement | null = null
  private hidden = false

  constructor(options: ToolbarOptions) {
    this.countEl = h('span', {
      className: 'vc-toolbar-count',
      dataset: { empty: 'true' },
    }, ['0']) as HTMLSpanElement

    const emoji = h(
      'span',
      { className: 'vc-toolbar-emoji', 'aria-hidden': 'true' },
      [options.emoji ?? '💭'],
    )

    this.button = h(
      'button',
      {
        type: 'button',
        className: 'vc-toolbar',
        dataset: { active: 'false' },
        title: 'Open menu (Alt+C to hide)',
        'aria-label': 'Open Holler menu',
        onClick: (e: MouseEvent) => {
          const rect = this.button.getBoundingClientRect()
          options.onClick({ x: rect.left + rect.width / 2, y: rect.top })
          e.stopPropagation()
        },
      },
      [emoji, this.countEl],
    ) as HTMLButtonElement

    const hideBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-toolbar-hide',
        title: 'Hide (Alt+C to show)',
        'aria-label': 'Hide toolbar',
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          options.onHide()
        },
      },
      ['✕'],
    ) as HTMLButtonElement

    this.el = h(
      'div',
      {
        className: 'vc-toolbar-wrap',
        dataset: { position: options.position, hidden: 'false' },
      },
      [this.button, hideBtn],
    )
  }

  setActive(active: boolean): void {
    this.button.dataset.active = active ? 'true' : 'false'
  }

  setCount(count: number): void {
    this.countEl.textContent = count > 99 ? '99+' : String(count)
    this.countEl.dataset.empty = count === 0 ? 'true' : 'false'
  }

  setUser(user: AuthUser | null): void {
    if (this.avatarEl) {
      this.avatarEl.remove()
      this.avatarEl = null
    }
    if (user) {
      const id = identityFor(user.id, user.displayName ?? user.email)
      this.avatarEl = h('span', { className: 'vc-toolbar-avatar' }, [id.emoji])
      this.avatarEl.style.background = id.color
      this.avatarEl.title = user.displayName ?? user.email ?? ''
      this.el.appendChild(this.avatarEl)
    }
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden
    this.el.dataset.hidden = hidden ? 'true' : 'false'
  }

  isHidden(): boolean {
    return this.hidden
  }
}
