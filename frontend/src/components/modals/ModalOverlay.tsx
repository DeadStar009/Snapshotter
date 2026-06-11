import React, { useEffect } from 'react'
import s from './ModalOverlay.module.css'

interface Props {
  onClose?: () => void
  children: React.ReactNode
  maxWidth?: number
}

export function ModalOverlay({ onClose, children, maxWidth = 520 }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className={s.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className={s.dialog} style={{ maxWidth }} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}
