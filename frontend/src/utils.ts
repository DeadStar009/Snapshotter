/**
 * Shared utility functions for the frontend.
 */

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

/** Format ISO date string to compact display format */
export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toISOString().replace('T', ' ').slice(0, 16)
}

/** Return a relative time description (e.g. "2 hours ago") */
export function relativeTime(iso: string): string {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(iso).slice(0, 10)
}

/** Truncate a path for display */
export function truncatePath(path: string, maxLen = 40): string {
  if (path.length <= maxLen) return path
  const parts = path.replace(/\\/g, '/').split('/')
  if (parts.length <= 2) return '...' + path.slice(-maxLen + 3)
  return '.../' + parts.slice(-2).join('/')
}

/** Extract the last segment of a path as the display name */
export function pathBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] ?? path
}

/** Clamp a string to maxLen characters */
export function clamp(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

/** Simple classname combiner */
export function cx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
