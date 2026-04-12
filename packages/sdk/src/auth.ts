import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { AuthChangeCallback, AuthUser } from './types.js'
import { log, warn } from './debug.js'

/**
 * Auth manager around Supabase Auth.
 * Supports: magic-link sign-in, sign-out, current-user accessor,
 * and an `onAuthChange` callback used by the UI to re-render.
 */
export class AuthManager {
  private currentUser: AuthUser | null = null
  private listeners = new Set<AuthChangeCallback>()
  private unsubscribe: (() => void) | null = null

  constructor(private readonly client: SupabaseClient) {}

  /** Load the current session (if any) and start listening for changes. */
  async init(): Promise<void> {
    try {
      const { data } = await this.client.auth.getSession()
      this.currentUser = data.session?.user ? toAuthUser(data.session.user) : null

      const { data: sub } = this.client.auth.onAuthStateChange((_event, session) => {
        this.currentUser = session?.user ? toAuthUser(session.user) : null
        log('auth state changed', this.currentUser?.email ?? null)
        this.emit()
      })
      this.unsubscribe = () => sub.subscription.unsubscribe()
    } catch (err) {
      warn('AuthManager init failed', err)
    }
  }

  /**
   * Send a magic-link email to the given address. Returns `true` on success.
   * Supabase delivers the callback to the current origin.
   */
  async signIn(email: string): Promise<boolean> {
    try {
      const { error } = await this.client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      })
      if (error) {
        warn('signIn failed', error.message)
        return false
      }
      return true
    } catch (err) {
      warn('signIn threw', err)
      return false
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.client.auth.signOut()
    } catch (err) {
      warn('signOut failed', err)
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser
  }

  /** Register an auth-change listener. Returns an unsubscribe function. */
  onAuthChange(cb: AuthChangeCallback): () => void {
    this.listeners.add(cb)
    // Fire immediately with the current state so subscribers don't race init.
    cb(this.currentUser)
    return () => this.listeners.delete(cb)
  }

  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.listeners.clear()
  }

  private emit(): void {
    for (const cb of this.listeners) {
      try {
        cb(this.currentUser)
      } catch (err) {
        warn('auth listener threw', err)
      }
    }
  }
}

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      user.email ??
      null,
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  }
}
