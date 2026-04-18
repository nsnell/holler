import type { Comment } from '../types.js'
import { h, relativeTime, replaceChildren } from './dom.js'

/**
 * Popover that lists all unresolved top-level comments on the current page.
 * Click an item to jump to its pin and open the thread.
 */
export interface UnresolvedPanelOptions {
  comments: Comment[]
  anchor: { x: number; y: number }
  onSelect: (comment: Comment) => void
  onClose: () => void
}

export class UnresolvedPanel {
  public readonly el: HTMLElement
  private listEl: HTMLElement
  private outsideHandler: (e: MouseEvent) => void
  private escHandler: (e: KeyboardEvent) => void

  constructor(private options: UnresolvedPanelOptions) {
    this.listEl = h('div', { className: 'vc-unresolved-list' })

    const closeBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-thread-close',
        'aria-label': 'Close',
        onClick: () => options.onClose(),
      },
      ['✕'],
    )

    const header = h('div', { className: 'vc-unresolved-header' }, [
      h('span', {}, ['Unresolved comments']),
      closeBtn,
    ])

    this.el = h('div', { className: 'vc-unresolved' }, [header, this.listEl])

    this.renderList()
    queueMicrotask(() => this.anchor(options.anchor.x, options.anchor.y))

    this.outsideHandler = (e: MouseEvent) => {
      const path = e.composedPath()
      if (path.includes(this.el)) return
      options.onClose()
    }
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') options.onClose()
    }
    setTimeout(() => {
      window.addEventListener('click', this.outsideHandler, true)
      window.addEventListener('keydown', this.escHandler)
    }, 0)
  }

  update(comments: Comment[]): void {
    this.options = { ...this.options, comments }
    this.renderList()
  }

  destroy(): void {
    window.removeEventListener('click', this.outsideHandler, true)
    window.removeEventListener('keydown', this.escHandler)
    this.el.remove()
  }

  private renderList(): void {
    const unresolved = this.options.comments
      .filter((c) => !c.parent_id && !c.resolved)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    if (unresolved.length === 0) {
      replaceChildren(this.listEl, [
        h('div', { className: 'vc-unresolved-empty' }, [
          'No unresolved comments on this page.',
        ]),
      ])
      return
    }

    const items = unresolved.map((c) =>
      h(
        'button',
        {
          type: 'button',
          className: 'vc-unresolved-item',
          onClick: () => this.options.onSelect(c),
        },
        [
          h('div', { className: 'vc-unresolved-item-meta' }, [
            h('span', {}, [
              (c.is_agent ? '🤖 ' : '') +
                (c.author_display_name ?? (c.is_agent ? 'Agent' : 'Anonymous')),
            ]),
            h('span', {}, [relativeTime(c.created_at)]),
          ]),
          h('div', { className: 'vc-unresolved-item-body' }, [c.body]),
        ],
      ),
    )
    replaceChildren(this.listEl, items)
  }

  private anchor(x: number, y: number): void {
    const rect = this.el.getBoundingClientRect()
    const margin = 12
    let top = y - rect.height - 12
    let left = x - rect.width + 20
    if (top < margin) top = margin
    if (left < margin) left = margin
    if (left + rect.width > window.innerWidth - margin) {
      left = window.innerWidth - rect.width - margin
    }
    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`
  }
}
