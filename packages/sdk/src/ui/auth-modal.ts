import { h } from './dom.js'

/**
 * Centered sign-in modal. MVP supports magic-link email only;
 * OAuth buttons are Phase 2.
 */
export interface AuthModalOptions {
  onSubmit: (email: string) => Promise<boolean>
  onClose: () => void
}

export class AuthModal {
  public readonly el: HTMLElement
  private emailInput: HTMLInputElement
  private submitBtn: HTMLButtonElement
  private messageEl: HTMLParagraphElement
  private sent = false

  constructor(options: AuthModalOptions) {
    this.emailInput = h('input', {
      type: 'email',
      className: 'vc-input',
      placeholder: 'you@example.com',
      autocomplete: 'email',
    }) as HTMLInputElement

    this.submitBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-btn vc-btn-primary',
        onClick: async () => {
          const email = this.emailInput.value.trim()
          if (!email || !/.+@.+\..+/.test(email)) {
            this.setMessage('Enter a valid email address.')
            return
          }
          this.submitBtn.disabled = true
          const ok = await options.onSubmit(email)
          this.submitBtn.disabled = false
          if (ok) {
            this.sent = true
            this.setMessage('Check your email for the magic link.')
            this.emailInput.disabled = true
            this.submitBtn.textContent = 'Sent ✓'
            this.submitBtn.disabled = true
          } else {
            this.setMessage('Something went wrong. Try again.')
          }
        },
      },
      ['Send magic link'],
    ) as HTMLButtonElement

    const closeBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-modal-close',
        'aria-label': 'Close',
        onClick: () => options.onClose(),
      },
      ['✕'],
    )

    this.messageEl = h('p', {}, [
      'Enter your email and we will send you a one-click sign-in link.',
    ]) as HTMLParagraphElement

    const modal = h('div', { className: 'vc-modal' }, [
      closeBtn,
      h('h2', {}, ['Sign in to comment']),
      this.messageEl,
      this.emailInput,
      this.submitBtn,
    ])

    this.el = h(
      'div',
      {
        className: 'vc-modal-backdrop',
        onClick: (e: MouseEvent) => {
          if (e.target === this.el) options.onClose()
        },
      },
      [modal],
    )

    queueMicrotask(() => {
      if (!this.sent) this.emailInput.focus()
    })
  }

  private setMessage(msg: string): void {
    this.messageEl.textContent = msg
  }
}
