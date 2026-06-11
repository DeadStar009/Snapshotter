// ============================================================
// Domain types — mirror the Go models exactly
// ============================================================

export type ChangeType = 'added' | 'modified' | 'deleted' | 'unchanged'

export interface Project {
  id: string
  name: string
  rootPath: string
  ignoreRules: string[]
  createdAt: string
  updatedAt: string
}

export interface ProjectStats {
  snapshotCount: number
  storageBytes: number
}

export interface Snapshot {
  id: string
  projectId: string
  name: string
  notes: string
  sizeBytes: number
  fileCount: number
  folderCount: number
  isPinned: boolean
  storagePath: string
  createdAt: string
}

export interface SnapshotEntry {
  id: string
  snapshotId: string
  relativePath: string
  sizeBytes: number
  changeType: ChangeType
  isDir: boolean
}

export interface ChangeSummary {
  modified: number
  added: number
  deleted: number
}

export interface RestorePreview {
  snapshotId: string
  snapshotName: string
  createdAt: string
  sizeBytes: number
  filesToRestore: number
  filesToDelete: number
  preservedDirs: string[]
  changeSummary: ChangeSummary
}

export interface AppSettings {
  vaultRoot: string
}

// ---- UI-only state types ----

export type AppView = 'snapshots' | 'settings'

export type ModalType =
  | 'none'
  | 'create-snapshot'
  | 'restore-confirm'
  | 'rename-snapshot'
  | 'delete-confirm'
  | 'add-project'
  | 'app-settings'

export interface ModalState {
  type: ModalType
  snapshotId?: string
  projectId?: string
}
