/** Tiny DOM helper shared across UI modules. */
export interface HProps {
  className?: string
  dataset?: Record<string, string>
  onClick?: (e: MouseEvent) => void
  onInput?: (e: Event) => void
  onSubmit?: (e: Event) => void
  [attr: string]: unknown
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: HProps,
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (props) {
    const { className, dataset, onClick, onInput, onSubmit, ...rest } = props
    if (className) el.className = className
    if (dataset) {
      for (const [k, v] of Object.entries(dataset)) {
        el.dataset[k] = v
      }
    }
    if (onClick) el.addEventListener('click', onClick as EventListener)
    if (onInput) el.addEventListener('input', onInput)
    if (onSubmit) el.addEventListener('submit', onSubmit)
    for (const [k, v] of Object.entries(rest)) {
      if (v === null || v === undefined || v === false) continue
      if (k === 'style' && typeof v === 'string') {
        el.setAttribute('style', v)
      } else {
        el.setAttribute(k, String(v))
      }
    }
  }
  for (const c of children) {
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return el
}

/** Replace element contents with the given children. */
export function replaceChildren(el: Element, children: (Node | string)[]): void {
  el.replaceChildren(
    ...children.map((c) => (typeof c === 'string' ? document.createTextNode(c) : c)),
  )
}

/** Simple initials helper for avatars. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Format a timestamp as "just now", "5m ago", "2h ago", or a short date. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const sec = Math.round((now - then) / 1000)
  if (sec < 45) return 'just now'
  if (sec < 60 * 60) return `${Math.round(sec / 60)}m ago`
  if (sec < 60 * 60 * 24) return `${Math.round(sec / 3600)}h ago`
  if (sec < 60 * 60 * 24 * 7) return `${Math.round(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
