/**
 * Explore 3D Session Management with Configurable Expiry
 * Configured via VITE_EXPLORE_SESSION_EXPIRY_HOURS (default: 1 hour)
 */

export const EXPLORE_SESSION_EXPIRY_HOURS: number = Math.max(
  0.1,
  Number(import.meta.env.VITE_EXPLORE_SESSION_EXPIRY_HOURS || 1)
)

export const EXPLORE_SESSION_EXPIRY_MS: number = Math.round(
  EXPLORE_SESSION_EXPIRY_HOURS * 60 * 60 * 1000
)

const STORAGE_KEY_AUTH = 'mjp_explore_auth'
const STORAGE_KEY_EXPIRES = 'mjp_explore_auth_expires_at'

/**
 * Returns true if the user is authorized and the session has not expired.
 * If expired, automatically clears the stored session and returns false.
 */
export function isExploreSessionValid(): boolean {
  try {
    const isAuth = sessionStorage.getItem(STORAGE_KEY_AUTH) === 'true'
    if (!isAuth) return false

    const expiresAtStr = sessionStorage.getItem(STORAGE_KEY_EXPIRES)
    if (!expiresAtStr) {
      // Set initial expiry timestamp if missing
      const newExpiry = Date.now() + EXPLORE_SESSION_EXPIRY_MS
      sessionStorage.setItem(STORAGE_KEY_EXPIRES, String(newExpiry))
      return true
    }

    const expiresAt = Number(expiresAtStr)
    if (isNaN(expiresAt) || Date.now() >= expiresAt) {
      clearExploreSession()
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Stores authorization flag and sets the exact expiry timestamp.
 */
export function saveExploreSession(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_AUTH, 'true')
    const expiresAt = Date.now() + EXPLORE_SESSION_EXPIRY_MS
    sessionStorage.setItem(STORAGE_KEY_EXPIRES, String(expiresAt))
  } catch {
    // Storage access fallback
  }
}

/**
 * Clears stored credentials and expiry timestamp.
 */
export function clearExploreSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_AUTH)
    sessionStorage.removeItem(STORAGE_KEY_EXPIRES)
  } catch {
    // Storage access fallback
  }
}

/**
 * Returns remaining session minutes, or 0 if expired/absent.
 */
export function getRemainingSessionMinutes(): number {
  try {
    const expiresAtStr = sessionStorage.getItem(STORAGE_KEY_EXPIRES)
    if (!expiresAtStr) return 0
    const expiresAt = Number(expiresAtStr)
    if (isNaN(expiresAt)) return 0
    const diffMs = expiresAt - Date.now()
    if (diffMs <= 0) return 0
    return Math.ceil(diffMs / (60 * 1000))
  } catch {
    return 0
  }
}
