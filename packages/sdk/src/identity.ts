/**
 * Deterministic identity → { color, emoji, initial }.
 *
 * Each user gets a stable color + animal emoji derived from a hash of
 * their auth user ID (or display name as a fallback). Two users with
 * the same first initial will look visually distinct, and the same
 * user always renders the same way across sessions and devices.
 */

/**
 * 12 well-spaced, accessible-on-white-text colors.
 * Picked to be distinct at small sizes (32px pins).
 */
const COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#d946ef', // fuchsia
  '#06b6d4', // cyan
]

/**
 * 20 cute animal emojis from Unicode 6.0 (2010) — guaranteed to render
 * on every modern OS without falling back to tofu boxes.
 */
const EMOJIS = [
  '🐼', '🦊', '🐻', '🐨', '🐱',
  '🐶', '🐰', '🐯', '🐸', '🦁',
  '🐮', '🐷', '🐙', '🐝', '🦋',
  '🐢', '🐳', '🐬', '🦉', '🦄',
]

export interface Identity {
  /** Hex color for the avatar/pin background. */
  color: string
  /** Animal emoji that uniquely identifies this user. */
  emoji: string
  /** Single-letter fallback for contexts where emoji feels wrong. */
  initial: string
}

/** Anonymous identity used when we have no seed at all. */
const ANON: Identity = { color: '#9ca3af', emoji: '👤', initial: '?' }

/** Identity for agent-authored comments (posted via the CLI). */
export const AGENT_IDENTITY: Identity = {
  color: '#475569',
  emoji: '🤖',
  initial: 'A',
}

/**
 * djb2 hash. Tiny, fast, well-distributed for short strings —
 * good enough for picking palette indices.
 */
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
  }
  return Math.abs(h | 0)
}

/**
 * Resolve a stable identity for a given seed.
 * Pass the auth user ID when possible (UUID — most stable).
 * Fall back to display name if there's no ID.
 */
export function identityFor(
  seed: string | null | undefined,
  displayName?: string | null,
): Identity {
  if (!seed) return ANON
  const h = hash(seed)
  // Use independent moduli so color and emoji aren't correlated.
  const color = COLORS[h % COLORS.length]
  const emoji = EMOJIS[(h >> 3) % EMOJIS.length]
  const initial = (displayName?.trim()[0] ?? seed[0] ?? '?').toUpperCase()
  return { color, emoji, initial }
}
