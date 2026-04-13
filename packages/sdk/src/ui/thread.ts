import type { Comment, AuthUser } from '../types.js'
import { h, relativeTime, replaceChildren } from './dom.js'
import { identityFor } from '../identity.js'

/**
 * Thread popover anchored to a pin. Shows the original comment,
 * any replies, a reply composer, and (for site owners / authors)
 * a resolve toggle.
 */
export interface ThreadOptions {
  root: Comment
  replies: Comment[]
  currentUser: AuthUser | null
  canResolve: boolean
  anchor: { x: number; y: number }
  onReply: (body: string) => void | Promise<void>
  onToggleResolved: (nextResolved: boolean) => void | Promise<void>
  onDelete: (commentId: string) => void | Promise<void>
  onClose: () => void
}

export class ThreadPanel {
  public readonly el: HTMLElement
  private bodyEl: HTMLElement
  private replyTextarea: HTMLTextAreaElement
  private replyBtn: HTMLButtonElement
  private resolveBtn: HTMLButtonElement
  private submitting = false
  private outsideHandler: ((e: MouseEvent) => void) | null = null
  private escHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(private options: ThreadOptions) {
    this.bodyEl = h('div', { className: 'vc-thread-body' })

    this.replyTextarea = h('textarea', {
      className: 'vc-textarea',
      placeholder: 'Reply…',
      onInput: () => this.syncEnabled(),
    }) as HTMLTextAreaElement
    this.replyTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        void this.handleReply()
      }
    })

    this.replyBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-btn vc-btn-primary',
        disabled: true,
        onClick: () => this.handleReply(),
      },
      ['Reply'],
    ) as HTMLButtonElement

    this.resolveBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-btn vc-btn-resolve',
        onClick: () => this.handleToggleResolved(),
      },
      [options.root.resolved ? 'Unresolve' : 'Resolve'],
    ) as HTMLButtonElement

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

    const header = h('div', { className: 'vc-thread-header' }, [
      h('div', { className: 'vc-thread-title' }, [
        options.root.resolved ? 'Resolved thread' : 'Thread',
      ]),
      closeBtn,
    ])

    const actions = options.canResolve
      ? h('div', { className: 'vc-thread-actions' }, [this.resolveBtn])
      : null

    const footer = h('div', { className: 'vc-thread-footer' }, [
      this.replyTextarea,
      h('div', { className: 'vc-row' }, [this.replyBtn]),
    ])

    const children: Node[] = [header, this.bodyEl]
    if (actions) children.push(actions)
    children.push(footer)

    this.el = h('div', { className: 'vc-thread' }, children)
    this.renderMessages()

    queueMicrotask(() => this.anchor(options.anchor.x, options.anchor.y))

    this.outsideHandler = (e: MouseEvent) => {
      if (e.composedPath().includes(this.el)) return
      options.onClose()
    }
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't close if typing in the reply textarea
        if (e.target === this.replyTextarea) return
        options.onClose()
      }
    }
    setTimeout(() => {
      window.addEventListener('click', this.outsideHandler!, true)
      window.addEventListener('keydown', this.escHandler!)
    }, 0)
  }

  update(root: Comment, replies: Comment[]): void {
    this.options = { ...this.options, root, replies }
    this.resolveBtn.textContent = root.resolved ? 'Unresolve' : 'Resolve'
    const title = this.el.querySelector('.vc-thread-title')
    if (title) title.textContent = root.resolved ? 'Resolved thread' : 'Thread'
    this.renderMessages()
  }

  private renderMessages(): void {
    const all = [this.options.root, ...this.options.replies]
    const items = all.map((c) => this.messageEl(c))
    replaceChildren(this.bodyEl, items)
  }

  private messageEl(c: Comment): HTMLElement {
    const isRemoved = c.body === '[removed]'

    if (isRemoved) {
      return h('div', { className: 'vc-msg' }, [
        h('div', { className: 'vc-msg-body', style: 'color:var(--vc-text-dim);font-style:italic' }, [
          'Comment removed',
        ]),
      ])
    }

    const id = identityFor(c.author_id ?? c.author_display_name, c.author_display_name)
    const avatar = h('div', { className: 'vc-toolbar-avatar' }, [id.emoji])
    avatar.style.background = id.color

    const metaChildren: (Node | string)[] = [
      avatar,
      h('span', { className: 'vc-msg-author' }, [c.author_display_name ?? 'Anonymous']),
      h('span', {}, [relativeTime(c.created_at)]),
    ]

    const user = this.options.currentUser
    const isAuthor = !!(user && c.author_id === user.id)
    const ageMs = Date.now() - new Date(c.created_at).getTime()
    const withinWindow = ageMs < 30 * 60 * 1000

    if (isAuthor && withinWindow) {
      const deleteBtn = h(
        'button',
        {
          type: 'button',
          className: 'vc-btn-ghost',
          style: 'font-size:11px;margin-left:auto',
          onClick: () => { void this.options.onDelete(c.id) },
        },
        ['Delete'],
      )
      metaChildren.push(deleteBtn)
    }

    const meta = h('div', { className: 'vc-msg-meta' }, metaChildren)
    const body = h('div', { className: 'vc-msg-body' }, [c.body])
    return h('div', { className: 'vc-msg' }, [meta, body])
  }

  private syncEnabled(): void {
    this.replyBtn.disabled = this.submitting || this.replyTextarea.value.trim().length === 0
  }

  private async handleReply(): Promise<void> {
    const body = this.replyTextarea.value.trim()
    if (!body || this.submitting) return
    this.submitting = true
    this.replyBtn.disabled = true
    this.replyTextarea.disabled = true
    this.replyBtn.innerHTML = ''
    const spinner = document.createElement('span')
    spinner.className = 'vc-spinner'
    this.replyBtn.appendChild(spinner)
    this.replyBtn.appendChild(document.createTextNode(' Replying…'))
    try {
      await this.options.onReply(body)
      this.replyTextarea.value = ''
    } finally {
      this.submitting = false
      this.replyTextarea.disabled = false
      this.replyBtn.textContent = 'Reply'
      this.syncEnabled()
    }
  }

  private async handleToggleResolved(): Promise<void> {
    await this.options.onToggleResolved(!this.options.root.resolved)
  }

  destroy(): void {
    if (this.outsideHandler) {
      window.removeEventListener('click', this.outsideHandler, true)
      this.outsideHandler = null
    }
    if (this.escHandler) {
      window.removeEventListener('keydown', this.escHandler)
      this.escHandler = null
    }
    this.el.remove()
  }

  private anchor(x: number, y: number): void {
    const rect = this.el.getBoundingClientRect()
    const margin = 12
    let left = x + 24
    let top = y - rect.height / 2
    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, x - rect.width - 24)
    }
    if (top < margin) top = margin
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin)
    }
    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`
  }
}
