package models

import "time"

// ChangeType represents how a file changed relative to the previous snapshot.
type ChangeType string

const (
	ChangeAdded     ChangeType = "added"
	ChangeModified  ChangeType = "modified"
	ChangeDeleted   ChangeType = "deleted"
	ChangeUnchanged ChangeType = "unchanged"
)

// Project represents a tracked source code directory.
type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	RootPath    string    `json:"rootPath"`
	IgnoreRules []string  `json:"ignoreRules"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ProjectStats holds computed statistics for a project (not stored directly).
type ProjectStats struct {
	SnapshotCount int    `json:"snapshotCount"`
	StorageBytes  int64  `json:"storageBytes"`
	CurrentState  string `json:"currentState"` // "clean" | "modified" | "unknown"
}

// Snapshot is a point-in-time capture of a project's state.
type Snapshot struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"projectId"`
	Name        string    `json:"name"`
	Notes       string    `json:"notes"`
	SizeBytes   int64     `json:"sizeBytes"`
	FileCount   int       `json:"fileCount"`
	FolderCount int       `json:"folderCount"`
	IsPinned    bool      `json:"isPinned"`
	StoragePath string    `json:"storagePath"`
	CreatedAt   time.Time `json:"createdAt"`
}

// SnapshotEntry is a single file/folder record within a snapshot.
type SnapshotEntry struct {
	ID           string     `json:"id"`
	SnapshotID   string     `json:"snapshotId"`
	RelativePath string     `json:"relativePath"`
	SizeBytes    int64      `json:"sizeBytes"`
	ChangeType   ChangeType `json:"changeType"`
	IsDir        bool       `json:"isDir"`
}

// ChangeSummary groups entry counts by change type for display.
type ChangeSummary struct {
	Modified int `json:"modified"`
	Added    int `json:"added"`
	Deleted  int `json:"deleted"`
}

// RestorePreview is what the frontend shows before the user confirms a restore.
type RestorePreview struct {
	SnapshotID          string   `json:"snapshotId"`
	SnapshotName        string   `json:"snapshotName"`
	CreatedAt           time.Time `json:"createdAt"`
	SizeBytes           int64    `json:"sizeBytes"`
	FilesToRestore      int      `json:"filesToRestore"`
	FilesToDelete       int      `json:"filesToDelete"`
	PreservedDirs       []string `json:"preservedDirs"`
	ChangeSummary       ChangeSummary `json:"changeSummary"`
}

// AppSettings holds persisted global application settings.
type AppSettings struct {
	VaultRoot string `json:"vaultRoot"`
}
