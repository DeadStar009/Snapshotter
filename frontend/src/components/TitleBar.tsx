import React from 'react'
import { windowClose, windowMinimize, windowToggleMaximize } from '../wailsApi'
import s from './TitleBar.module.css'

interface Props {
  title?: string
  subtitle?: string
}

export function TitleBar({ title = 'Snapshot Vault', subtitle }: Props) {
  return (
    <header
      className={s.root}
      style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
    >
      <div className={s.left}>
        <span className={`material-symbols-outlined ${s.icon}`}>inventory_2</span>
        <span className={s.title}>{title}</span>
        {subtitle && (
          <>
            <span className={s.divider} />
            <span className={s.subtitle}>{subtitle}</span>
          </>
        )}
      </div>

      <div
        className={s.controls}
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        <button
          className={s.btn}
          onClick={windowMinimize}
          aria-label="Minimize"
          title="Minimize"
        >
          <span className="material-symbols-outlined">minimize</span>
        </button>
        <button
          className={s.btn}
          onClick={windowToggleMaximize}
          aria-label="Maximize"
          title="Maximize"
        >
          <span className="material-symbols-outlined">check_box_outline_blank</span>
        </button>
        <button
          className={`${s.btn} ${s.close}`}
          onClick={windowClose}
          aria-label="Close"
          title="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </header>
  )
}
