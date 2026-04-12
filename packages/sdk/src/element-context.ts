/**
 * Capture rich context about the DOM element under a click point.
 *
 * This is stored in the `element_selector` column as a JSON string so
 * that agents can understand WHAT the comment is about — not just where
 * it is on the page. An agent sees:
 *
 *   selector: "nav > ul > li:nth-child(3) > a.nav-link"
 *   tag: "a"
 *   text: "Pricing"
 *   region: "top-left"
 *
 * …and can immediately reason about it.
 */

export interface ElementContext {
  /** CSS selector path to the element. */
  selector: string
  /** Tag name (lowercase). */
  tag: string
  /** Visible text content, trimmed and truncated. */
  text: string
  /** Coarse page region: "top-left", "center", "bottom-right", etc. */
  region: string
  /** Key attributes if present (id, class, href, role, aria-label, data-testid, alt, placeholder). */
  attributes: Record<string, string>
}

/** Capture element context from a viewport click point. */
export function captureElementContext(
  clientX: number,
  clientY: number,
  xPercent: number,
  yPercent: number,
): ElementContext | null {
  const el = document.elementFromPoint(clientX, clientY)
  if (!el || el === document.documentElement || el === document.body) {
    return {
      selector: 'body',
      tag: 'body',
      text: '',
      region: describeRegion(xPercent, yPercent),
      attributes: {},
    }
  }

  return {
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    text: extractText(el),
    region: describeRegion(xPercent, yPercent),
    attributes: extractAttributes(el),
  }
}

/** Serialize to a JSON string for storage in the `element_selector` column. */
export function serializeContext(ctx: ElementContext): string {
  return JSON.stringify(ctx)
}

/** Parse the stored JSON back to a context object. Returns null if not valid JSON. */
export function parseContext(raw: string | null | undefined): ElementContext | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    if (typeof obj.selector === 'string') return obj as unknown as ElementContext
    return null
  } catch {
    return null
  }
}

/**
 * Build a CSS selector path from the element up to the body.
 * Uses id (most specific), then tag + nth-child, capped at 5 levels.
 */
function buildSelector(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  let depth = 0

  while (current && current !== document.body && current !== document.documentElement && depth < 5) {
    let segment = current.tagName.toLowerCase()

    if (current.id) {
      parts.unshift(`#${current.id}`)
      break
    }

    const classList = Array.from(current.classList)
      .filter((c) => !c.startsWith('vc-') && !c.startsWith('hl-'))
      .slice(0, 2)
    if (classList.length > 0) {
      segment += '.' + classList.join('.')
    }

    const parent: Element | null = current.parentElement
    if (parent) {
      const tag = current.tagName
      const siblings = Array.from(parent.children).filter(
        (child: Element) => child.tagName === tag,
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        segment += `:nth-child(${index})`
      }
    }

    parts.unshift(segment)
    current = parent
    depth++
  }

  return parts.join(' > ') || 'body'
}

/** Extract the most relevant visible text from the element. */
function extractText(el: Element): string {
  // For inputs, use placeholder or value
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return (el.placeholder || el.value || '').trim().slice(0, 150)
  }
  // For images, use alt text
  if (el instanceof HTMLImageElement) {
    return (el.alt || el.title || '').trim().slice(0, 150)
  }
  // For other elements, get direct text content (not deeply nested)
  const text = el.textContent?.trim() ?? ''
  // If the text is very long, the element is probably a container — truncate aggressively
  if (text.length > 200) {
    // Try to get just the first child text node
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim()
        if (t && t.length > 0) return t.slice(0, 150)
      }
    }
    return text.slice(0, 150) + '…'
  }
  return text.slice(0, 150)
}

/** Pick out useful attributes for agent context. */
function extractAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  const keys = [
    'id', 'href', 'role', 'aria-label', 'data-testid',
    'alt', 'placeholder', 'type', 'name', 'title',
  ]
  for (const key of keys) {
    const val = el.getAttribute(key)
    if (val) attrs[key] = val.slice(0, 200)
  }
  // Include a summary of classes (first 3, skip internal prefixes)
  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith('vc-') && !c.startsWith('hl-'))
    .slice(0, 3)
  if (classes.length > 0) attrs['class'] = classes.join(' ')
  return attrs
}

/** Convert percentage position to a human-readable region. */
function describeRegion(xPercent: number, yPercent: number): string {
  const vertical = yPercent < 33 ? 'top' : yPercent < 66 ? 'middle' : 'bottom'
  const horizontal = xPercent < 33 ? 'left' : xPercent < 66 ? 'center' : 'right'
  if (vertical === 'middle' && horizontal === 'center') return 'center'
  return `${vertical}-${horizontal}`
}
