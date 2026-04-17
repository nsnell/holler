import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  Comment,
  ShortcutSpec,
  HollerConfig,
  HollerInstance,
} from './types.js'
import { createSupabaseClient, type SupabaseClient } from './client.js'
import { AuthManager } from './auth.js'
import { CommentsStore } from './comments.js'
import { observeLayout, pointToPercent } from './positioning.js'
import { Overlay } from './ui/overlay.js'
import { PinLayer } from './ui/pin.js'
import { Toolbar } from './ui/toolbar.js'
import { Composer } from './ui/composer.js'
import { ThreadPanel } from './ui/thread.js'
import { AuthModal } from './ui/auth-modal.js'
import { ProfileModal } from './ui/profile-modal.js'
import { Menu } from './ui/menu.js'
import { CommentsPanel } from './ui/comments-panel.js'
import { percentToPixels } from './positioning.js'
import { captureElementContext, serializeContext } from './element-context.js'
import { setDebug, log, warn } from './debug.js'

export type {
  Comment,
  HollerConfig,
  HollerInstance,
  NewCommentInput,
  AuthUser,
} from './types.js'

/** Tracks the active instance to prevent duplicates. */
let activeInstance: HollerInstance | null = null

/**
 * Initialize Holler on the current page.
 * If a prior instance exists it is destroyed automatically before
 * creating the new one — safe to call multiple times.
 */
export function initHoller(config: HollerConfig): HollerInstance {
  if (activeInstance) {
    warn('Destroying previous Holler instance before reinitializing.')
    activeInstance.destroy()
    activeInstance = null
  }
  validateConfig(config)
  setDebug(!!config.debug)

  let pagePath = window.location.pathname
  const theme = resolveTheme(config.theme)
  const requireAuth = config.requireAuth ?? true

  const client: SupabaseClient = createSupabaseClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
  )
  const auth = new AuthManager(client)
  const comments = new CommentsStore(client)

  const overlay = new Overlay(theme)
  let pinLayer: PinLayer | null = null
  let toolbar: Toolbar | null = null
  let composer: Composer | null = null
  let threadPanel: ThreadPanel | null = null
  let authModal: AuthModal | null = null
  let menu: Menu | null = null
  let profileModal: ProfileModal | null = null
  let commentsPanel: CommentsPanel | null = null
  let stopLayoutObserver: (() => void) | null = null
  let realtimeChannel: RealtimeChannel | null = null
  let keyHandler: ((e: KeyboardEvent) => void) | null = null
  let restoreHistoryPatch: (() => void) | null = null
  let destroyed = false

  // Local cache of comments for the current page.
  let localComments: Comment[] = []

  // -------- helpers --------

  const byId = (id: string): Comment | undefined =>
    localComments.find((c) => c.id === id)

  const repliesOf = (id: string): Comment[] =>
    localComments
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))

  const topLevelCount = (): number => localComments.filter((c) => !c.parent_id).length

  const unresolvedCount = (): number =>
    localComments.filter((c) => !c.parent_id && !c.resolved).length

  const refreshCount = () => toolbar?.setCount(unresolvedCount())

  const renderPins = () => {
    pinLayer?.render(localComments)
    refreshCount()
  }

  const closeComposer = () => {
    if (composer) {
      composer.el.remove()
      composer = null
    }
    pinLayer?.removeTempPin()
  }

  const closeThread = () => {
    if (threadPanel) {
      threadPanel.destroy()
      threadPanel = null
    }
  }

  const closeModal = () => {
    if (authModal) {
      authModal.el.remove()
      authModal = null
    }
  }

  const closeProfile = () => {
    if (profileModal) {
      profileModal.el.remove()
      profileModal = null
    }
  }

  const closeMenu = () => {
    if (menu) {
      menu.destroy()
      menu = null
    }
  }

  const closeCommentsPanel = () => {
    if (commentsPanel) {
      commentsPanel.destroy()
      commentsPanel = null
    }
  }

  const openAuthModal = (): Promise<boolean> => {
    return new Promise((resolve) => {
      closeModal()
      authModal = new AuthModal({
        onSubmit: async (email) => auth.signIn(email),
        onClose: () => {
          closeModal()
          resolve(false)
        },
      })
      overlay.getRoot().appendChild(authModal.el)
      const unsub = auth.onAuthChange((user) => {
        if (user) {
          unsub()
          closeModal()
          resolve(true)
        }
      })
    })
  }

  const showProfileIfNeeded = (): Promise<boolean> => {
    if (!auth.needsProfile()) return Promise.resolve(true)
    const user = auth.getCurrentUser()
    if (!user) return Promise.resolve(false)

    return new Promise((resolve) => {
      closeProfile()
      profileModal = new ProfileModal({
        email: user.email ?? '',
        onSubmit: async (first, last) => {
          const ok = await auth.updateProfile(first, last)
          if (ok) {
            closeProfile()
            toolbar?.setUser(auth.getCurrentUser())
            resolve(true)
          }
          return ok
        },
      })
      overlay.getRoot().appendChild(profileModal.el)
    })
  }

  const ensureAuthed = async (): Promise<boolean> => {
    if (!requireAuth) return true
    if (auth.getCurrentUser()) {
      return showProfileIfNeeded()
    }
    const authed = await openAuthModal()
    if (!authed) return false
    return showProfileIfNeeded()
  }

  const openThreadFor = (comment: Comment, pinEl: HTMLElement) => {
    closeComposer()
    closeThread()

    const rect = pinEl.getBoundingClientRect()
    const anchor = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const user = auth.getCurrentUser()
    const canResolve = !!user && user.id === comment.author_id // TODO: add site-owner check

    threadPanel = new ThreadPanel({
      root: comment,
      replies: repliesOf(comment.id),
      currentUser: user,
      canResolve: canResolve || !requireAuth,
      anchor,
      onClose: () => closeThread(),
      onReply: async (body) => {
        if (!(await ensureAuthed())) return
        await comments.createComment({
          siteId: config.siteId,
          pagePath,
          xPercent: comment.x_percent,
          yPercent: comment.y_percent,
          body,
          parentId: comment.id,
        })
      },
      onToggleResolved: async (next) => {
        if (next) await comments.resolveComment(comment.id)
        else await comments.unresolveComment(comment.id)
      },
      onDelete: async (commentId) => {
        await comments.deleteComment(commentId)
      },
    })
    overlay.getRoot().appendChild(threadPanel.el)
  }

  const openComposerAt = async (clientX: number, clientY: number) => {
    const { xPercent, yPercent } = pointToPercent(clientX, clientY)
    const elementCtx = captureElementContext(clientX, clientY, xPercent, yPercent)

    if (!(await ensureAuthed())) return

    closeComposer()
    closeThread()

    pinLayer?.showTempPin(xPercent, yPercent)

    composer = new Composer({
      placeholder: 'Leave a comment…',
      submitLabel: 'Post',
      anchor: { x: clientX, y: clientY },
      onCancel: () => closeComposer(),
      onSubmit: async (body) => {
        const created = await comments.createComment({
          siteId: config.siteId,
          pagePath,
          xPercent,
          yPercent,
          body,
          viewportWidth: window.innerWidth,
          elementSelector: elementCtx ? serializeContext(elementCtx) : undefined,
        })
        closeComposer()
        if (!created) {
          warn('Failed to create comment')
          return
        }
        // Optimistic: inject into local state if realtime hasn't yet.
        if (!localComments.find((c) => c.id === created.id)) {
          localComments = [...localComments, created]
          renderPins()
        }
      },
    })
    overlay.getRoot().appendChild(composer.el)
  }

  const toggleCommentMode = () => {
    const next = !overlay.isActive()
    overlay.setActive(next)
    toolbar?.setActive(next)
    if (!next) closeComposer()
  }

  const openMenu = (anchor: { x: number; y: number }) => {
    closeMenu()
    closeCommentsPanel()
    const active = overlay.isActive()
    const pinsHidden = pinLayer?.isHidden() ?? false
    const user = auth.getCurrentUser()

    menu = new Menu({
      anchor,
      onClose: () => closeMenu(),
      items: [
        { type: 'header', label: 'holler', icon: true },
        {
          label: active ? 'Exit comment mode' : 'Start commenting',
          hint: active ? 'Esc' : '',
          onClick: () => toggleCommentMode(),
        },
        {
          label: pinsHidden ? 'Show pins' : 'Hide pins',
          onClick: () => {
            pinLayer?.setHidden(!pinsHidden)
          },
        },
        {
          label: `Comments${topLevelCount() > 0 ? ` (${topLevelCount()})` : ''}`,
          onClick: () => openCommentsPanel(anchor),
        },
        'separator',
        {
          label: 'Hide toolbar',
          hint: 'Alt+C',
          onClick: () => instance.hide(),
        },
        ...(user
          ? ([
              'separator' as const,
              {
                label: 'Sign out',
                hint: user.email ?? '',
                onClick: () => {
                  void auth.signOut()
                },
              },
            ])
          : []),
      ],
    })
    overlay.getRoot().appendChild(menu.el)
  }

  const jumpToComment = (comment: Comment) => {
    // Scroll the comment into view, then open its thread.
    const { left, top } = percentToPixels({
      xPercent: comment.x_percent,
      yPercent: comment.y_percent,
    })
    window.scrollTo({
      left: Math.max(0, left - window.innerWidth / 2),
      top: Math.max(0, top - window.innerHeight / 2),
      behavior: 'smooth',
    })
    // After scroll settles, find the pin element and open its thread.
    setTimeout(() => {
      const el = pinLayer?.getPinElement(comment.id)
      if (el) openThreadFor(comment, el)
    }, 350)
  }

  const openCommentsPanel = (anchor: { x: number; y: number }) => {
    closeCommentsPanel()
    commentsPanel = new CommentsPanel({
      comments: localComments,
      anchor,
      onClose: () => closeCommentsPanel(),
      onSelect: (c) => {
        closeCommentsPanel()
        jumpToComment(c)
      },
    })
    overlay.getRoot().appendChild(commentsPanel.el)
  }

  /** Refetch comments + re-subscribe when the SPA route changes. */
  const onPathChange = async (nextPath: string) => {
    if (nextPath === pagePath) return
    log('page path changed', pagePath, '→', nextPath)
    pagePath = nextPath
    closeComposer()
    closeThread()
    closeCommentsPanel()
    if (realtimeChannel) {
      client.removeChannel(realtimeChannel).catch(() => {})
      realtimeChannel = null
    }
    localComments = await comments.fetchComments(config.siteId, pagePath)
    renderPins()
    realtimeChannel = comments.subscribeToComments(
      config.siteId,
      pagePath,
      handleRealtime,
    )
  }

  const handleRealtime = (event: 'insert' | 'update' | 'delete', row: Comment) => {
    log('realtime', event, row.id)
    if (event === 'delete') {
      localComments = localComments.filter((c) => c.id !== row.id)
    } else if (event === 'insert') {
      if (!localComments.find((c) => c.id === row.id)) {
        localComments = [...localComments, row]
      }
    } else if (event === 'update') {
      localComments = localComments.map((c) => (c.id === row.id ? row : c))
    }
    // Refresh the open thread panel if the change affects it.
    if (threadPanel && (event === 'insert' || event === 'update')) {
      const rootId = row.parent_id ?? row.id
      const root = byId(rootId)
      if (root) threadPanel.update(root, repliesOf(root.id))
    }
    renderPins()
    commentsPanel?.update(localComments)
  }

  // -------- bootstrap --------

  const boot = async () => {
    try {
      await auth.init()

      // Fetch existing comments before mounting pins so we render in one pass.
      localComments = await comments.fetchComments(config.siteId, pagePath)

      overlay.mount()

      pinLayer = new PinLayer(overlay.getPinLayer(), {
        onPinClick: (c, el) => {
          const root = localComments.find((x) => x.id === c.id) ?? c
          openThreadFor(root, el)
        },
      })

      toolbar = new Toolbar({
        position: config.position ?? 'bottom-center',
        emoji: config.emoji,
        onClick: (anchor) => openMenu(anchor),
        onHide: () => instance.hide(),
      })
      overlay.getRoot().appendChild(toolbar.el)
      toolbar.setUser(auth.getCurrentUser())
      auth.onAuthChange((user) => toolbar?.setUser(user))

      // If the user just landed after a magic link click and hasn't
      // set their name yet, prompt them immediately.
      if (auth.needsProfile()) {
        void showProfileIfNeeded()
      }

      renderPins()

      // Keyboard shortcuts:
      //   - Alt+C (configurable) toggles toolbar visibility
      //   - Esc exits comment mode / closes the composer
      const shortcut = resolveShortcut(config.toggleShortcut)
      keyHandler = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null
        const typing = !!(target && isEditable(target))

        if (e.key === 'Escape') {
          // Don't hijack Esc while the user is typing in our own composer
          // or reply field — let that field handle it naturally.
          if (typing) return
          if (composer) {
            e.preventDefault()
            closeComposer()
            return
          }
          if (overlay.isActive()) {
            e.preventDefault()
            toggleCommentMode()
            return
          }
        }

        if (shortcut && matchesShortcut(e, shortcut)) {
          if (typing) return
          e.preventDefault()
          if (toolbar?.isHidden()) instance.show()
          else instance.hide()
        }
      }
      window.addEventListener('keydown', keyHandler)

      stopLayoutObserver = observeLayout(() => {
        pinLayer?.reposition(localComments)
      })

      overlay.onPlace = (x, y) => {
        void openComposerAt(x, y)
      }

      // Real-time subscription.
      realtimeChannel = comments.subscribeToComments(
        config.siteId,
        pagePath,
        handleRealtime,
      )

      // SPA route detection: patch history API + listen to popstate so
      // pins re-fetch when the host app navigates client-side.
      restoreHistoryPatch = observeRouteChanges(() => {
        void onPathChange(window.location.pathname)
      })
    } catch (err) {
      warn('init failed', err)
    }
  }

  void boot()

  // -------- public instance --------

  const instance: HollerInstance = {
    toggle: () => {
      const next = !overlay.isActive()
      overlay.setActive(next)
      toolbar?.setActive(next)
      if (!next) closeComposer()
    },
    hide: () => {
      // When hiding, also exit comment mode so we don't leave a
      // crosshair cursor stranded on the host page.
      if (overlay.isActive()) {
        overlay.setActive(false)
        toolbar?.setActive(false)
        closeComposer()
      }
      toolbar?.setHidden(true)
    },
    show: () => {
      toolbar?.setHidden(false)
    },
    setPinsVisible: (visible: boolean) => {
      pinLayer?.setHidden(!visible)
    },
    setPagePath: (path: string) => {
      void onPathChange(path)
    },
    getComments: async () => {
      return comments.fetchComments(config.siteId, pagePath)
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      if (activeInstance === instance) activeInstance = null
      if (keyHandler) {
        window.removeEventListener('keydown', keyHandler)
        keyHandler = null
      }
      restoreHistoryPatch?.()
      restoreHistoryPatch = null
      stopLayoutObserver?.()
      stopLayoutObserver = null
      if (realtimeChannel) {
        client.removeChannel(realtimeChannel).catch(() => {})
        realtimeChannel = null
      }
      closeMenu()
      closeCommentsPanel()
      closeProfile()
      closeComposer()
      closeThread()
      closeModal()
      pinLayer?.destroy()
      pinLayer = null
      auth.destroy()
      overlay.destroy()
    },
  }

  activeInstance = instance
  return instance
}

// -------- config + theme helpers --------

function validateConfig(config: HollerConfig): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Holler: config object required')
  }
  if (!config.supabaseUrl) throw new Error('Holler: supabaseUrl is required')
  if (!config.supabaseAnonKey) throw new Error('Holler: supabaseAnonKey is required')
  if (!config.siteId) throw new Error('Holler: siteId is required')
}

/** Resolve a user shortcut config into a concrete spec or null. */
function resolveShortcut(
  value: HollerConfig['toggleShortcut'],
): ShortcutSpec | null {
  if (value === false) return null
  if (value && typeof value === 'object') return value
  // Default: Alt+C — doesn't collide with common browser/OS shortcuts.
  return { key: 'c', alt: true }
}

/** Does this KeyboardEvent match the shortcut spec? */
function matchesShortcut(e: KeyboardEvent, s: ShortcutSpec): boolean {
  if (e.key.toLowerCase() !== s.key.toLowerCase()) return false
  if (!!s.alt !== e.altKey) return false
  if (!!s.ctrl !== e.ctrlKey) return false
  if (!!s.meta !== e.metaKey) return false
  if (!!s.shift !== e.shiftKey) return false
  return true
}

/** True if the target is a text field we shouldn't hijack keys from. */
function isEditable(el: HTMLElement): boolean {
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Observe SPA route changes without monkey-patching history.
 *
 * We listen to `popstate` (back/forward) and poll `location.pathname`
 * on a short interval to catch programmatic pushState/replaceState.
 * This avoids conflicts with analytics libraries (PostHog, Sentry, etc.)
 * that also patch history.
 */
function observeRouteChanges(onChange: () => void): () => void {
  let lastPath = window.location.pathname
  const check = () => {
    const current = window.location.pathname
    if (current !== lastPath) {
      lastPath = current
      try { onChange() } catch { /* swallow */ }
    }
  }
  window.addEventListener('popstate', check)
  const interval = setInterval(check, 300)
  return () => {
    window.removeEventListener('popstate', check)
    clearInterval(interval)
  }
}

function resolveTheme(theme?: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// -------- auto-init from <script> tag --------

/**
 * When the UMD bundle loads via a <script> tag with data-* attributes,
 * auto-initialize. The ESM build won't trigger this because
 * document.currentScript is null during module evaluation.
 */
function autoInitFromScriptTag(): void {
  if (typeof document === 'undefined') return
  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    (document.querySelector('script[data-site-id][data-supabase-url]') as HTMLScriptElement | null)
  if (!script) return

  const supabaseUrl = script.getAttribute('data-supabase-url')
  const supabaseAnonKey = script.getAttribute('data-supabase-anon-key')
  const siteId = script.getAttribute('data-site-id')
  if (!supabaseUrl || !supabaseAnonKey || !siteId) return

  const theme = (script.getAttribute('data-theme') as HollerConfig['theme']) ?? 'auto'
  const position =
    (script.getAttribute('data-position') as HollerConfig['position']) ?? 'bottom-center'
  const emoji = script.getAttribute('data-emoji') ?? undefined
  const debug = script.hasAttribute('data-debug')

  const start = () => {
    try {
      const inst = initHoller({
        supabaseUrl,
        supabaseAnonKey,
        siteId,
        theme,
        position,
        emoji,
        debug,
      })
      ;(window as unknown as { Holler?: unknown }).Holler = Object.assign(
        (window as unknown as { Holler?: object }).Holler ?? {},
        { instance: inst },
      )
    } catch (err) {
      warn('auto-init failed', err)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}

autoInitFromScriptTag()
