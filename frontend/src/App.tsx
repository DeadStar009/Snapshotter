import React, { useEffect } from 'react'
import { useAppStore } from './store'
import { TitleBar } from './components/TitleBar'
import { StatusBar } from './components/StatusBar'
import { Sidebar } from './components/Sidebar'
import { SnapshotList } from './components/SnapshotList'
import { SnapshotDetails } from './components/SnapshotDetails'
import { SettingsView } from './components/SettingsView'
import { ModalRouter } from './components/ModalRouter'
import s from './App.module.css'

export default function App() {
  const loadProjects = useAppStore((st) => st.loadProjects)
  const loadSettings = useAppStore((st) => st.loadSettings)
  const selectedProjectId = useAppStore((st) => st.selectedProjectId)
  const selectProject = useAppStore((st) => st.selectProject)
  const projects = useAppStore((st) => st.projects)
  const view = useAppStore((st) => st.view)

  // Bootstrap
  useEffect(() => {
    Promise.all([loadProjects(), loadSettings()])
  }, [])

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      selectProject(projects[0].id)
    }
  }, [projects.length])

  return (
    <div className={s.root}>
      <TitleBar />

      <div className={s.body}>
        <Sidebar />

        {view === 'settings' ? (
          <SettingsView />
        ) : (
          <main className={s.main}>
            <SnapshotList />
            <SnapshotDetails />
          </main>
        )}
      </div>

      <StatusBar />

      <ModalRouter />
    </div>
  )
}
