import type { Comment } from '../types.js'
import { h, relativeTime, replaceChildren } from './dom.js'
import { identityFor } from '../identity.js'

/**
 * Popover listing all comments on the current page, with filter tabs:
 * All, Unresolved, Resolved. Click a comment to scroll to its pin.
 */
export type FilterTab = 'all' | 'unresolved' | 'resolved'

export interface CommentsPanelOptions {
  comments: Comment[]
  anchor: { x: number; y: number }
  initialTab?: FilterTab
  onSelect: (comment: Comment) => void
  onClose: () => void
}

export class CommentsPanel {
  public readonly el: HTMLElement
  private listEl: HTMLElement
  private activeTab: FilterTab
  private tabButtons: Map<FilterTab, HTMLButtonElement> = new Map()
  private outsideHandler: (e: MouseEvent) => void
  private escHandler: (e: KeyboardEvent) => void

  constructor(private options: CommentsPanelOptions) {
    this.activeTab = options.initialTab ?? 'unresolved'
    this.listEl = h('div', { className: 'vc-unresolved-list' })

    const closeBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-thread-close',
        style: 'color:#5C5C72',
        'aria-label': 'Close',
        onClick: () => options.onClose(),
      },
      ['✕'],
    )

    const tabs = this.buildTabs()
    const header = h('div', { className: 'vc-unresolved-header' }, [tabs, closeBtn])

    this.el = h('div', { className: 'vc-unresolved' }, [header, this.listEl])

    this.renderList()

    this.outsideHandler = (e: MouseEvent) => {
      if (e.composedPath().includes(this.el)) return
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
    this.syncTabCounts()
  }

  destroy(): void {
    window.removeEventListener('click', this.outsideHandler, true)
    window.removeEventListener('keydown', this.escHandler)
    this.el.remove()
  }

  private buildTabs(): HTMLElement {
    const tabs: FilterTab[] = ['unresolved', 'resolved', 'all']
    const labels: Record<FilterTab, string> = {
      unresolved: 'Open',
      resolved: 'Resolved',
      all: 'All',
    }

    const btns = tabs.map((tab) => {
      const btn = h(
        'button',
        {
          type: 'button',
          className: 'vc-tab',
          dataset: { active: tab === this.activeTab ? 'true' : 'false' },
          onClick: () => this.setTab(tab),
        },
        [labels[tab]],
      ) as HTMLButtonElement
      this.tabButtons.set(tab, btn)
      return btn
    })

    return h('div', { className: 'vc-tabs' }, btns)
  }

  private setTab(tab: FilterTab): void {
    this.activeTab = tab
    for (const [t, btn] of this.tabButtons) {
      btn.dataset.active = t === tab ? 'true' : 'false'
    }
    this.renderList()
  }

  private syncTabCounts(): void {
    const topLevel = this.options.comments.filter((c) => !c.parent_id)
    const counts: Record<FilterTab, number> = {
      all: topLevel.length,
      unresolved: topLevel.filter((c) => !c.resolved).length,
      resolved: topLevel.filter((c) => c.resolved).length,
    }
    const labels: Record<FilterTab, string> = {
      all: 'All',
      unresolved: 'Open',
      resolved: 'Resolved',
    }
    for (const [tab, btn] of this.tabButtons) {
      btn.textContent = counts[tab] > 0 ? `${labels[tab]} (${counts[tab]})` : labels[tab]
    }
  }

  private renderList(): void {
    const topLevel = this.options.comments
      .filter((c) => !c.parent_id)
      .filter((c) => {
        if (this.activeTab === 'unresolved') return !c.resolved
        if (this.activeTab === 'resolved') return c.resolved
        return true
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    if (topLevel.length === 0) {
      const msg =
        this.activeTab === 'unresolved'
          ? 'No open comments on this page.'
          : this.activeTab === 'resolved'
            ? 'No resolved comments on this page.'
            : 'No comments on this page yet. Comments are page-specific.'
      replaceChildren(this.listEl, [
        h('div', { className: 'vc-unresolved-empty' }, [msg]),
      ])
      this.syncTabCounts()
      return
    }

    const replies = this.options.comments.filter((c) => !!c.parent_id)

    const items = topLevel.map((c) => {
      const id = identityFor(c.author_id ?? c.author_display_name, c.author_display_name)
      const replyCount = replies.filter((r) => r.parent_id === c.id).length
      const badge = c.resolved
        ? h('span', { className: 'vc-comment-badge', dataset: { variant: 'resolved' } }, ['Resolved'])
        : h('span', { className: 'vc-comment-badge', dataset: { variant: 'open' } }, ['Open'])

      return h(
        'button',
        {
          type: 'button',
          className: 'vc-unresolved-item',
          onClick: () => this.options.onSelect(c),
        },
        [
          h('div', { className: 'vc-unresolved-item-meta' }, [
            h('span', { style: 'display:inline-flex;align-items:center;gap:4px' }, [
              h('span', { style: `font-size:14px` }, [id.emoji]),
              h('span', {}, [c.author_display_name ?? 'Anonymous']),
            ]),
            h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, [
              badge,
              h('span', {}, [relativeTime(c.created_at)]),
            ]),
          ]),
          h('div', { className: 'vc-unresolved-item-body' }, [c.body]),
          replyCount > 0
            ? h('div', { className: 'vc-unresolved-item-meta', style: 'margin-top:2px' }, [
                h('span', { style: 'font-size:11px;color:var(--vc-text-muted)' }, [
                  `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`,
                ]),
              ])
            : document.createTextNode(''),
        ],
      )
    })
    replaceChildren(this.listEl, items)
    this.syncTabCounts()
  }

}
