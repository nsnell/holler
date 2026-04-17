import { h } from './dom.js'

/**
 * Small modal that asks the user for their first and last name.
 * Shown once after their first magic-link sign-in, before they
 * can post their first comment.
 */
export interface ProfileModalOptions {
  email: string
  onSubmit: (firstName: string, lastName: string) => Promise<boolean>
}

export class ProfileModal {
  public readonly el: HTMLElement
  private firstInput: HTMLInputElement
  private lastInput: HTMLInputElement
  private submitBtn: HTMLButtonElement
  private errorEl: HTMLParagraphElement
  private submitting = false

  constructor(options: ProfileModalOptions) {
    this.firstInput = h('input', {
      type: 'text',
      className: 'vc-input',
      placeholder: 'First name',
      autocomplete: 'given-name',
    }) as HTMLInputElement

    this.lastInput = h('input', {
      type: 'text',
      className: 'vc-input',
      placeholder: 'Last name',
      autocomplete: 'family-name',
    }) as HTMLInputElement

    this.errorEl = h('p', { style: 'color:#F87171;font-size:12px;margin:0' }, []) as HTMLParagraphElement

    this.submitBtn = h(
      'button',
      {
        type: 'button',
        className: 'vc-btn vc-btn-primary',
        style: 'width:100%',
        onClick: () => { void this.handleSubmit(options) },
      },
      ['Continue'],
    ) as HTMLButtonElement

    // Submit on Enter in either input
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { void this.handleSubmit(options) }
    }
    this.firstInput.addEventListener('keydown', onKey)
    this.lastInput.addEventListener('keydown', onKey)

    const modal = h('div', { className: 'vc-modal' }, [
      h('h2', {}, ['What should we call you?']),
      h('p', {}, [`Signed in as ${options.email}`]),
      h('div', { style: 'display:flex;gap:8px' }, [this.firstInput, this.lastInput]),
      this.errorEl,
      this.submitBtn,
    ])

    this.el = h(
      'div',
      { className: 'vc-modal-backdrop' },
      [modal],
    )

    queueMicrotask(() => this.firstInput.focus())
  }

  private async handleSubmit(options: ProfileModalOptions): Promise<void> {
    const first = this.firstInput.value.trim()
    const last = this.lastInput.value.trim()
    if (!first) {
      this.errorEl.textContent = 'First name is required.'
      this.firstInput.focus()
      return
    }
    if (this.submitting) return
    this.submitting = true
    this.submitBtn.disabled = true
    this.submitBtn.textContent = 'Saving…'
    const ok = await options.onSubmit(first, last)
    if (!ok) {
      this.submitting = false
      this.submitBtn.disabled = false
      this.submitBtn.textContent = 'Continue'
      this.errorEl.textContent = 'Something went wrong. Try again.'
      return
    }
    // Success — the caller removes this modal.
  }
}
