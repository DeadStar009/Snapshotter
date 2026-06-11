package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"snapshotter/internal/database"
	"snapshotter/internal/logger"
	"snapshotter/internal/models"
	"snapshotter/internal/repository"

	"github.com/google/uuid"
)

var defaultIgnoreRules = []string{
	"node_modules",
	".git",
	"venv",
	".venv",
	"dist",
	"build",
	".next",
	".cache",
	"__pycache__",
	"coverage",
}

// ProjectService handles project management business logic.
type ProjectService struct {
	repo *repository.ProjectRepository
	log  *logger.Logger
}

func NewProjectService(db *database.DB, log *logger.Logger) *ProjectService {
	return &ProjectService{
		repo: repository.NewProjectRepository(db.Conn()),
		log:  log,
	}
}

func (s *ProjectService) Repo() *repository.ProjectRepository {
	return s.repo
}

// AddProject validates and creates a new project.
func (s *ProjectService) AddProject(name, rootPath string) (*models.Project, error) {
	name = strings.TrimSpace(name)
	rootPath = filepath.Clean(rootPath)

	if name == "" {
		return nil, fmt.Errorf("project name is required")
	}
	if rootPath == "" {
		return nil, fmt.Errorf("project root path is required")
	}

	// Verify the path exists
	info, err := os.Stat(rootPath)
	if err != nil {
		return nil, fmt.Errorf("path does not exist: %s", rootPath)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory: %s", rootPath)
	}

	// Check for duplicate path
	existing, err := s.repo.GetByPath(rootPath)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("project with path '%s' already exists", rootPath)
	}

	project := &models.Project{
		ID:          uuid.New().String(),
		Name:        name,
		RootPath:    rootPath,
		IgnoreRules: defaultIgnoreRules,
	}

	if err := s.repo.Create(project); err != nil {
		return nil, fmt.Errorf("create project: %w", err)
	}

	s.log.Info("Project added: %s at %s", name, rootPath)
	return project, nil
}

// GetProject returns a project by ID.
func (s *ProjectService) GetProject(id string) (*models.Project, error) {
	p, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, fmt.Errorf("project not found: %s", id)
	}
	return p, nil
}

// ListProjects returns all projects.
func (s *ProjectService) ListProjects() ([]*models.Project, error) {
	return s.repo.ListAll()
}

// UpdateProject updates a project's name and ignore rules.
func (s *ProjectService) UpdateProject(id, name string, ignoreRules []string) (*models.Project, error) {
	p, err := s.repo.GetByID(id)
	if err != nil || p == nil {
		return nil, fmt.Errorf("project not found: %s", id)
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("project name is required")
	}
	p.Name = name
	p.IgnoreRules = ignoreRules
	if err := s.repo.Update(p); err != nil {
		return nil, err
	}
	return p, nil
}

// RemoveProject deletes a project record (does NOT delete snapshot files).
func (s *ProjectService) RemoveProject(id string) error {
	if err := s.repo.Delete(id); err != nil {
		return fmt.Errorf("remove project: %w", err)
	}
	s.log.Info("Project removed: %s", id)
	return nil
}
