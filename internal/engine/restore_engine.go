package engine

import (
	"fmt"
	"os"
	"path/filepath"

	"snapshotter/internal/fsutil"
	"snapshotter/internal/logger"
	"snapshotter/internal/models"
	"snapshotter/internal/repository"
)

// RestoreEngine handles restoring snapshots to a project directory.
type RestoreEngine struct {
	snapshotRepo *repository.SnapshotRepository
	projectRepo  *repository.ProjectRepository
	log          *logger.Logger
}

func NewRestoreEngine(
	snapshotRepo *repository.SnapshotRepository,
	projectRepo *repository.ProjectRepository,
	log *logger.Logger,
) *RestoreEngine {
	return &RestoreEngine{
		snapshotRepo: snapshotRepo,
		projectRepo:  projectRepo,
		log:          log,
	}
}

// BuildPreview computes what a restore would do without making any changes.
func (e *RestoreEngine) BuildPreview(snapshotID string) (*models.RestorePreview, error) {
	snapshot, err := e.snapshotRepo.GetByID(snapshotID)
	if err != nil || snapshot == nil {
		return nil, fmt.Errorf("load snapshot %s: %w", snapshotID, err)
	}

	project, err := e.projectRepo.GetByID(snapshot.ProjectID)
	if err != nil || project == nil {
		return nil, fmt.Errorf("load project: %w", err)
	}

	summary, err := e.snapshotRepo.GetChangeSummary(snapshotID)
	if err != nil {
		summary = &models.ChangeSummary{}
	}

	// Count files that exist in the project dir but not in the snapshot (will be deleted)
	snapshotFiles, err := fsutil.ListFiles(snapshot.StoragePath, nil)
	if err != nil {
		snapshotFiles = []string{}
	}
	snapshotSet := make(map[string]struct{}, len(snapshotFiles))
	for _, f := range snapshotFiles {
		snapshotSet[f] = struct{}{}
	}

	currentFiles, err := fsutil.ListFiles(project.RootPath, project.IgnoreRules)
	if err != nil {
		currentFiles = []string{}
	}
	filesToDelete := 0
	for _, f := range currentFiles {
		if _, inSnapshot := snapshotSet[f]; !inSnapshot {
			filesToDelete++
		}
	}

	return &models.RestorePreview{
		SnapshotID:     snapshotID,
		SnapshotName:   snapshot.Name,
		CreatedAt:      snapshot.CreatedAt,
		SizeBytes:      snapshot.SizeBytes,
		FilesToRestore: snapshot.FileCount,
		FilesToDelete:  filesToDelete,
		PreservedDirs:  project.IgnoreRules,
		ChangeSummary:  *summary,
	}, nil
}

// Restore replaces the project directory contents with the snapshot's contents.
// Ignored directories (node_modules, .git, etc.) are left untouched.
func (e *RestoreEngine) Restore(snapshotID string) error {
	snapshot, err := e.snapshotRepo.GetByID(snapshotID)
	if err != nil || snapshot == nil {
		return fmt.Errorf("load snapshot %s: %w", snapshotID, err)
	}

	project, err := e.projectRepo.GetByID(snapshot.ProjectID)
	if err != nil || project == nil {
		return fmt.Errorf("load project: %w", err)
	}

	e.log.Info("Restoring snapshot '%s' -> project '%s' at %s", snapshot.Name, project.Name, project.RootPath)

	srcRoot := snapshot.StoragePath
	dstRoot := project.RootPath

	// Phase 1: Remove files/dirs in the project that are NOT ignored and NOT in the snapshot.
	snapshotFiles, err := fsutil.ListFiles(srcRoot, nil)
	if err != nil {
		return fmt.Errorf("list snapshot files: %w", err)
	}
	snapshotSet := make(map[string]struct{}, len(snapshotFiles))
	for _, f := range snapshotFiles {
		snapshotSet[f] = struct{}{}
	}

	if err := e.removeExtraFiles(dstRoot, project.IgnoreRules, snapshotSet); err != nil {
		return fmt.Errorf("remove extra files: %w", err)
	}

	// Phase 2: Copy all snapshot files to the project directory.
	if err := e.copySnapshotFiles(srcRoot, dstRoot); err != nil {
		return fmt.Errorf("copy snapshot files: %w", err)
	}

	e.log.Info("Restore complete for snapshot %s", snapshotID)
	return nil
}

// removeExtraFiles removes files and empty dirs from dstRoot that are not in
// snapshotSet and not covered by ignore rules.
func (e *RestoreEngine) removeExtraFiles(dstRoot string, ignored []string, snapshotSet map[string]struct{}) error {
	// Collect entries bottom-up so we can remove files before empty dirs
	var dirs []string
	err := filepath.Walk(dstRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil || path == dstRoot {
			return nil
		}
		rel, _ := filepath.Rel(dstRoot, path)
		if fsutil.IsIgnored(rel, ignored) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if info.IsDir() {
			dirs = append(dirs, path)
			return nil
		}
		// It's a file — remove if not in snapshot
		relSlash := filepath.ToSlash(rel)
		if _, exists := snapshotSet[relSlash]; !exists {
			e.log.Info("restore: removing extra file %s", rel)
			if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Remove now-empty dirs (reverse order = deepest first)
	for i := len(dirs) - 1; i >= 0; i-- {
		dir := dirs[i]
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		if len(entries) == 0 {
			rel, _ := filepath.Rel(dstRoot, dir)
			if _, inSnapshot := snapshotSet[filepath.ToSlash(rel)+"/"]; !inSnapshot {
				e.log.Info("restore: removing empty dir %s", rel)
				_ = os.Remove(dir)
			}
		}
	}
	return nil
}

// copySnapshotFiles copies all files from srcRoot to dstRoot.
func (e *RestoreEngine) copySnapshotFiles(srcRoot, dstRoot string) error {
	return filepath.Walk(srcRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		rel, _ := filepath.Rel(srcRoot, path)
		if rel == "." {
			return nil
		}
		dst := filepath.Join(dstRoot, rel)
		if info.IsDir() {
			return fsutil.EnsureDir(dst)
		}
		return fsutil.CopyFile(path, dst)
	})
}
