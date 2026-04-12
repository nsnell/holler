let debugEnabled = false

export function setDebug(on: boolean): void {
  debugEnabled = on
}

/** Debug logger. No-op unless the SDK was initialized with `debug: true`. */
export function log(...args: unknown[]): void {
  if (debugEnabled) {
    // eslint-disable-next-line no-console
    console.log('[holler]', ...args)
  }
}

/** Always-on warning. Kept narrow — only real errors reach the host console. */
export function warn(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn('[holler]', ...args)
}
