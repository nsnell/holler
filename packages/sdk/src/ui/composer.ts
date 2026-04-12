import { h } from './dom.js'

/**
 * A small popover with a textarea + Submit/Cancel buttons.
 * Anchored near a pin via viewport coordinates. Used for both new
 * top-level comments (attached to a temp pin) and replies (inside
 * the thread panel — see thread.ts, which builds its own composer).
 */
export interface ComposerOptions {
  placeholder?: string
  submitLabel?: string
  onSubmit: (body: string) => void | Promise<void>
  onCancel: () => void
  /** Viewport x/y to anchor near; auto-clamped inside the viewport. */
  anchor: { x: number; y: number }
}

export class Composer {
  public readonly el: HTMLElement
  private textarea: HTMLTextAreaElement
  private submitBtn: HTMLButtonElement
  private submitting = false

  constructor(private readonly options: ComposerOptions) {
    this.textarea = h('textarea', {
      className: 'vc-textarea',
      placeholder: options.placeholder ?? 'Leave a comment…',
      onInput: () => this.syncEnabled(),
    }) as HTMLTextAreaElement
    this.textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        void this.handleSubmit()
      }
    })

    this.submitBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-btn vc-btn-primary',
        disabled: true,
        onClick: () => this.handleSubmit(),
      },
      [options.submitLabel ?? 'Comment'],
    ) as HTMLButtonElement

    const cancelBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-btn vc-btn-ghost',
        onClick: () => options.onCancel(),
      },
      ['Cancel'],
    )

    const hint = h('span', { className: 'vc-row-hint' }, ['⌘↵'])

    this.el = h('div', { className: 'vc-composer' }, [
      this.textarea,
      h('div', { className: 'vc-row' }, [hint, h('span', { style: 'display:flex;gap:8px' }, [cancelBtn, this.submitBtn])]),
    ])

    // Anchor after it's in the DOM so we can measure.
    queueMicrotask(() => {
      this.anchor(options.anchor.x, options.anchor.y)
      this.textarea.focus()
    })
  }

  focus(): void {
    this.textarea.focus()
  }

  private syncEnabled(): void {
    this.submitBtn.disabled = this.submitting || this.textarea.value.trim().length === 0
  }

  private async handleSubmit(): Promise<void> {
    const body = this.textarea.value.trim()
    if (!body || this.submitting) return
    this.submitting = true
    this.submitBtn.disabled = true
    this.textarea.disabled = true
    const originalLabel = this.submitBtn.textContent ?? 'Post'
    this.submitBtn.innerHTML = ''
    const spinner = document.createElement('span')
    spinner.className = 'vc-spinner'
    this.submitBtn.appendChild(spinner)
    this.submitBtn.appendChild(document.createTextNode(' Posting…'))
    try {
      await this.options.onSubmit(body)
    } finally {
      this.submitting = false
      this.submitBtn.textContent = originalLabel
      this.textarea.disabled = false
    }
  }

  /**
   * Position the composer next to a viewport point, keeping it on-screen.
   * The composer is fixed-position, so coordinates are viewport-relative.
   */
  private anchor(x: number, y: number): void {
    const rect = this.el.getBoundingClientRect()
    const margin = 12
    let left = x + 20
    let top = y + 20
    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, x - rect.width - 20)
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, y - rect.height - 20)
    }
    this.el.style.left = `${Math.max(margin, left)}px`
    this.el.style.top = `${Math.max(margin, top)}px`
  }
}
