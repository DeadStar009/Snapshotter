import React from 'react'
import { useAppStore } from '../store'
import { formatBytes } from '../utils'
import s from './StatusBar.module.css'

export function StatusBar() {
  const statusMessage = useAppStore((st) => st.statusMessage)
  const snapshots = useAppStore((st) => st.snapshots)
  const error = useAppStore((st) => st.error)
  const setError = useAppStore((st) => st.setError)

  const totalBytes = snapshots.reduce((acc, sn) => acc + sn.sizeBytes, 0)

  return (
    <footer className={s.root}>
      <div className={s.left}>
        {error ? (
          <span className={s.errorMsg}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'var(--c-error)' }}>error</span>
            <span style={{ color: 'var(--c-error)' }}>{error}</span>
            <button
              className={s.dismissBtn}
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </span>
        ) : (
          <span className={s.status}>
            <span className={`${s.dot} pulse`} />
            {statusMessage}
          </span>
        )}
        {totalBytes > 0 && (
          <>
            <span className={s.sep}>|</span>
            <span className={s.item}>LOADED: {formatBytes(totalBytes)}</span>
          </>
        )}
      </div>

      <div className={s.right}>
        <span className={s.item}>V 1.0.0</span>
      </div>
    </footer>
  )
}
