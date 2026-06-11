//go:build !windows

package main

import (
	"fmt"
	"os/exec"
	"runtime"
)

func openInExplorer(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open file manager: %w", err)
	}
	return nil
}
