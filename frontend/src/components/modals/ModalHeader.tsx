import React from 'react'
import s from './ModalHeader.module.css'

interface Props {
  icon: string
  title: string
  onClose: () => void
}

export function ModalHeader({ icon, title, onClose }: Props) {
  return (
    <div className={s.root}>
      <div className={s.left}>
        <span className={`material-symbols-outlined ${s.icon}`}>{icon}</span>
        <span className={`label-caps ${s.title}`}>{title}</span>
      </div>
      <button className={s.closeBtn} onClick={onClose} aria-label="Close">
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  )
}
