package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "Snapshot Vault",
		Width:     1280,
		Height:    800,
		MinWidth:  900,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 5, G: 5, B: 5, A: 255},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
		Frameless: true,
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
			DisablePinchZoom:                  true,
			IsZoomControlEnabled:              false,
			Theme:                             windows.Dark,
			CustomTheme:                       nil,
			ResizeDebounceMS:                  0,
			OnSuspend:                         nil,
			OnResume:                          nil,
			WebviewGpuIsDisabled:              false,
			WebviewUserDataPath:               "",
			WebviewBrowserPath:                "",
			BackdropType:                      windows.None,
		},
		EnableDefaultContextMenu: false,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
