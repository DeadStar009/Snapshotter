package fsutil

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// CopyFile copies src to dst, creating parent directories as needed.
func CopyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return fmt.Errorf("mkdir for %s: %w", dst, err)
	}

	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open src %s: %w", src, err)
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("create dst %s: %w", dst, err)
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return fmt.Errorf("copy %s -> %s: %w", src, dst, err)
	}
	return out.Sync()
}

// DirSize returns the total size in bytes of all files under dir.
func DirSize(dir string) (int64, error) {
	var total int64
	err := filepath.Walk(dir, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip unreadable entries
		}
		if !info.IsDir() {
			total += info.Size()
		}
		return nil
	})
	return total, err
}

// IsIgnored returns true if the given path (relative to the project root)
// matches any of the ignore patterns. Matching is done on directory name
// components only.
func IsIgnored(relPath string, patterns []string) bool {
	parts := strings.Split(filepath.ToSlash(relPath), "/")
	for _, part := range parts {
		for _, pattern := range patterns {
			if strings.EqualFold(part, pattern) {
				return true
			}
			matched, _ := filepath.Match(pattern, part)
			if matched {
				return true
			}
		}
	}
	return false
}

// EnsureDir creates the directory at path if it doesn't exist.
func EnsureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

// RemoveIfExists removes a file or empty dir, ignoring not-found errors.
func RemoveIfExists(path string) error {
	err := os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// RemoveAll removes a directory tree, ignoring not-found errors.
func RemoveAll(path string) error {
	err := os.RemoveAll(path)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// ListFiles returns all file paths under root (relative to root), skipping
// any path matching the ignored patterns.
func ListFiles(root string, ignored []string) ([]string, error) {
	var files []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		if rel == "." {
			return nil
		}
		if IsIgnored(rel, ignored) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if !info.IsDir() {
			files = append(files, rel)
		}
		return nil
	})
	return files, err
}

// FormatBytes returns a human-readable byte size string.
func FormatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
