package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"snapshotter/internal/database"
	"snapshotter/internal/logger"
	"snapshotter/internal/services"
	"snapshotter/internal/settings"
)

// App is the main application struct bound to Wails.
type App struct {
	ctx context.Context

	db              *database.DB
	projectService  *services.ProjectService
	snapshotService *services.SnapshotService
	settingsService *settings.Service
	log             *logger.Logger
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved so runtime
// methods like OpenFileDialog can be used.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize logger first
	logDir, err := resolveAppDataDir("logs")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to resolve log dir: %v\n", err)
		os.Exit(1)
	}
	a.log = logger.New(logDir)
	a.log.Info("Snapshot Vault starting up")

	// Resolve data directory
	dataDir, err := resolveAppDataDir("")
	if err != nil {
		a.log.Error("failed to resolve data dir: %v", err)
		os.Exit(1)
	}

	// Initialize database
	dbPath := filepath.Join(dataDir, "metadata.db")
	a.db, err = database.New(dbPath)
	if err != nil {
		a.log.Error("failed to open database: %v", err)
		os.Exit(1)
	}

	if err := a.db.Migrate(); err != nil {
		a.log.Error("failed to run migrations: %v", err)
		os.Exit(1)
	}

	// Initialize settings service
	a.settingsService = settings.NewService(a.db)

	// Initialize vault root from settings or use default
	vaultRoot, err := a.settingsService.GetVaultRoot()
	if err != nil || vaultRoot == "" {
		defaultVault, _ := resolveDefaultVaultDir()
		vaultRoot = defaultVault
		_ = a.settingsService.SetVaultRoot(vaultRoot)
	}

	// Initialize services
	a.projectService = services.NewProjectService(a.db, a.log)
	a.snapshotService = services.NewSnapshotService(a.db, vaultRoot, a.log)

	a.log.Info("Startup complete. Vault root: %s", vaultRoot)
}

// shutdown is called when the app is shutting down.
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.log.Info("Shutting down, closing database")
		_ = a.db.Close()
	}
}

// resolveAppDataDir returns (and creates) the app data directory.
func resolveAppDataDir(subdir string) (string, error) {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("cannot determine user home: %w", err)
		}
		appData = filepath.Join(home, "AppData", "Roaming")
	}
	dir := filepath.Join(appData, "SnapshotVault")
	if subdir != "" {
		dir = filepath.Join(dir, subdir)
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("cannot create app data dir %s: %w", dir, err)
	}
	return dir, nil
}

// resolveDefaultVaultDir returns the default vault storage directory.
func resolveDefaultVaultDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, "SnapshotVault")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}
