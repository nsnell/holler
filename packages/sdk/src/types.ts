/** Public configuration passed to {@link initHoller}. */
export interface HollerConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  siteId: string
  theme?: 'light' | 'dark' | 'auto'
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  requireAuth?: boolean
  /**
   * Emoji shown on the floating toolbar button. Defaults to 💭.
   * Pick whatever fits your brand: 💬 💭 ✨ 🐛 📝 🗯️ 🎯 etc.
   */
  emoji?: string
  /**
   * Keyboard shortcut that toggles toolbar visibility.
   * Specified as an object describing the key + modifiers.
   * Defaults to Alt+C (Option+C on macOS).
   * Pass `false` to disable the shortcut entirely.
   */
  toggleShortcut?: ShortcutSpec | false
  /** Enable verbose console logging. Off by default. */
  debug?: boolean
}

/**
 * Keyboard shortcut descriptor. Matched against KeyboardEvent fields:
 *   - `key` is the character or named key (e.g. "c", "/", "Escape").
 *   - modifiers default to false (meaning "must NOT be held").
 */
export interface ShortcutSpec {
  key: string
  alt?: boolean
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
}

/** Handle returned by {@link initHoller}. */
export interface HollerInstance {
  /** Tear down the SDK: remove UI, unsubscribe, release all listeners. */
  destroy(): void
  /** Toggle comment-placement mode. */
  toggle(): void
  /** Hide the floating toolbar entirely (comments/pins remain visible). */
  hide(): void
  /** Show the floating toolbar again. */
  show(): void
  /** Hide or show the pin layer. */
  setPinsVisible(visible: boolean): void
  /**
   * Change the current page path and re-fetch comments for it.
   * SPAs that don't use History API should call this on route change.
   */
  setPagePath(path: string): void
  /** Fetch all comments for the current page (top-level + replies). */
  getComments(): Promise<Comment[]>
}

/** A single comment row, matching the `holler_comments` table. */
export interface Comment {
  id: string
  site_id: string
  page_path: string
  x_percent: number
  y_percent: number
  viewport_width: number | null
  body: string
  author_id: string | null
  author_display_name: string | null
  author_avatar_url: string | null
  parent_id: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  element_selector: string | null
  created_at: string
  updated_at: string
}

export interface NewCommentInput {
  siteId: string
  pagePath: string
  xPercent: number
  yPercent: number
  body: string
  parentId?: string | null
  viewportWidth?: number
  /** JSON-encoded element context captured at click time. */
  elementSelector?: string
}

export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type AuthChangeCallback = (user: AuthUser | null) => void
