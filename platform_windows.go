//go:build windows

package main

import (
	"fmt"
	"os/exec"
)

func openInExplorer(path string) error {
	cmd := exec.Command("explorer.exe", path)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open explorer: %w", err)
	}
	return nil
}
