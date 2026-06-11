package engine

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"snapshotter/internal/fsutil"
	"snapshotter/internal/logger"
	"snapshotter/internal/models"
	"snapshotter/internal/repository"

	"github.com/google/uuid"
)

// SnapshotEngine handles creating snapshots.
type SnapshotEngine struct {
	vaultRoot   string
	snapshotRepo *repository.SnapshotRepository
	projectRepo  *repository.ProjectRepository
	log          *logger.Logger
}

func NewSnapshotEngine(
	vaultRoot string,
	snapshotRepo *repository.SnapshotRepository,
	projectRepo *repository.ProjectRepository,
	log *logger.Logger,
) *SnapshotEngine {
	return &SnapshotEngine{
		vaultRoot:    vaultRoot,
		snapshotRepo: snapshotRepo,
		projectRepo:  projectRepo,
		log:          log,
	}
}

// SetVaultRoot updates the vault root used for new snapshots.
func (e *SnapshotEngine) SetVaultRoot(vaultRoot string) {
	e.vaultRoot = vaultRoot
}

// CreateRequest holds parameters for creating a new snapshot.
type CreateRequest struct {
	ProjectID string
	Name      string
	Notes     string
}

// Create walks the project directory, copies all non-ignored files into the
// vault, records metadata in the database, and returns the resulting Snapshot.
func (e *SnapshotEngine) Create(req CreateRequest) (*models.Snapshot, error) {
	project, err := e.projectRepo.GetByID(req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("load project: %w", err)
	}
	if project == nil {
		return nil, fmt.Errorf("project %s not found", req.ProjectID)
	}

	snapshotID := uuid.New().String()
	// e.g. SnapshotVault/projects/<projectID>/snap_20260602_181005_<shortID>
	shortID := snapshotID[:8]
	timestamp := time.Now()
	dirName := fmt.Sprintf("snap_%s_%s", timestamp.Format("20060102_150405"), shortID)
	storagePath := filepath.Join(e.vaultRoot, "projects", project.ID, dirName)

	if err := fsutil.EnsureDir(storagePath); err != nil {
		return nil, fmt.Errorf("create snapshot dir: %w", err)
	}

	e.log.Info("Creating snapshot '%s' for project '%s' -> %s", req.Name, project.Name, storagePath)

	// Walk and copy
	entries, sizeBytes, fileCount, folderCount, err := e.copyProjectFiles(project.RootPath, storagePath, project.IgnoreRules, snapshotID)
	if err != nil {
		// Clean up partial snapshot dir on failure
		_ = fsutil.RemoveAll(storagePath)
		return nil, fmt.Errorf("copy files: %w", err)
	}

	snapshot := &models.Snapshot{
		ID:          snapshotID,
		ProjectID:   project.ID,
		Name:        req.Name,
		Notes:       req.Notes,
		SizeBytes:   sizeBytes,
		FileCount:   fileCount,
		FolderCount: folderCount,
		IsPinned:    false,
		StoragePath: storagePath,
		CreatedAt:   timestamp,
	}

	if err := e.snapshotRepo.Create(snapshot); err != nil {
		_ = fsutil.RemoveAll(storagePath)
		return nil, fmt.Errorf("persist snapshot: %w", err)
	}

	if err := e.snapshotRepo.InsertEntries(entries); err != nil {
		// Non-fatal — snapshot is created, entries are best-effort
		e.log.Warn("failed to insert snapshot entries: %v", err)
	}

	e.log.Info("Snapshot created: id=%s files=%d size=%s", snapshotID, fileCount, fsutil.FormatBytes(sizeBytes))
	return snapshot, nil
}

// EstimateSize computes the approximate size of a snapshot without copying anything.
func (e *SnapshotEngine) EstimateSize(projectID string) (int64, error) {
	project, err := e.projectRepo.GetByID(projectID)
	if err != nil || project == nil {
		return 0, fmt.Errorf("load project: %w", err)
	}
	files, err := fsutil.ListFiles(project.RootPath, project.IgnoreRules)
	if err != nil {
		return 0, err
	}
	var total int64
	for _, f := range files {
		info, err := os.Stat(filepath.Join(project.RootPath, f))
		if err == nil {
			total += info.Size()
		}
	}
	return total, nil
}

func (e *SnapshotEngine) copyProjectFiles(
	srcRoot, dstRoot string,
	ignored []string,
	snapshotID string,
) ([]*models.SnapshotEntry, int64, int, int, error) {
	var entries []*models.SnapshotEntry
	var totalSize int64
	fileCount := 0
	folderCount := 0

	err := filepath.Walk(srcRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			e.log.Warn("walk error at %s: %v", path, err)
			return nil
		}

		rel, err := filepath.Rel(srcRoot, path)
		if err != nil || rel == "." {
			return nil
		}

		if fsutil.IsIgnored(rel, ignored) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		dst := filepath.Join(dstRoot, rel)

		if info.IsDir() {
			folderCount++
			if err := fsutil.EnsureDir(dst); err != nil {
				return err
			}
			entries = append(entries, &models.SnapshotEntry{
				ID:           uuid.New().String(),
				SnapshotID:   snapshotID,
				RelativePath: filepath.ToSlash(rel),
				SizeBytes:    0,
				ChangeType:   models.ChangeUnchanged,
				IsDir:        true,
			})
			return nil
		}

		if err := fsutil.CopyFile(path, dst); err != nil {
			return fmt.Errorf("copy %s: %w", rel, err)
		}

		fileCount++
		totalSize += info.Size()

		entries = append(entries, &models.SnapshotEntry{
			ID:           uuid.New().String(),
			SnapshotID:   snapshotID,
			RelativePath: filepath.ToSlash(rel),
			SizeBytes:    info.Size(),
			ChangeType:   models.ChangeUnchanged,
			IsDir:        false,
		})
		return nil
	})

	return entries, totalSize, fileCount, folderCount, err
}
