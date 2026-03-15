# Dither

Vector dither tool that converts images and gradients into scalable SVG patterns. Each dither cell becomes a vector shape — circles, squares, or diamonds — grouped by color.

Available as a **[web app](https://dither.neato.fun)** and a **native Adobe Illustrator plugin**.

## Features

- Load any image or generate gradients (linear, radial, conic, diagonal, noise)
- 9 dither patterns: Bayer 2×2/4×4/8×8, Halftone, Lines, Crosses, Dots, Grid, Scales
- Threshold or scaled (halftone) styles
- Circle, square, and diamond shapes
- 2–8 color palettes with presets (B/W, GameBoy, CGA, Sepia)
- Export SVG (vector, grouped by color) or PNG
- Drag-and-drop image loading
- `Cmd+S` / `Ctrl+S` to export SVG

---

## Install the Illustrator Plugin

1. Download **Dither.aip.zip** from the [latest release](../../releases/latest)
2. Unzip it
3. Move `Dither.aip` to your Illustrator plugins folder:
   ```
   /Applications/Adobe Illustrator 2026/Plug-ins.localized/
   ```
4. Restart Illustrator
5. Open via **Window → Dither**

### Requirements

- macOS 11+
- Adobe Illustrator 2024+ (v28+)

### Troubleshooting

If the plugin doesn't appear after restarting Illustrator, clear the plugin cache:

```bash
rm -f ~/Library/Preferences/"Adobe Illustrator 30 Settings"/en_US/aggressivePlugincache_v2.bin
rm -f ~/Library/Preferences/"Adobe Illustrator 30 Settings"/en_US/AggressiveDelayLoad-Plug-in\ Cache
```

Then restart Illustrator again.

---

## Web App

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

---

## Development

### Prerequisites

- Node.js 18+
- esbuild (installed via `npm install`)

For the Illustrator plugin, you also need:

- [Adobe Illustrator C++ SDK](https://developer.adobe.com/console/downloads/ai) (not redistributable)
- CMake 3.20+
- Xcode Command Line Tools

### Build Commands

```bash
npm run build:web              # Web app → dist/web/
npm run build:illustrator-ui   # Bundle plugin panel JS
npm run build:illustrator      # Full native plugin build (UI + C++)
npm run build                  # Web + plugin UI
```

### Building the Illustrator Plugin

The plugin must be built with the Xcode generator — Unix Makefiles produces binaries Illustrator silently ignores.

```bash
npm install
npm run build:illustrator
```

This bundles the UI JS via esbuild, then runs CMake + xcodebuild. The SDK path is configured in `package.json` — update it if your SDK is in a different location.

### Installing Locally

```bash
npm run install:illustrator
```

Builds the plugin, copies the `.aip` bundle to Illustrator's Plug-ins folder (requires sudo), and clears the plugin cache. Restart Illustrator to load the new build.

### Releasing

```bash
npm run release:illustrator
```

Builds, zips the `.aip`, and creates a GitHub Release with the artifact attached. Requires the [GitHub CLI](https://cli.github.com/) (`gh`).

### Project Structure

```
packages/
  core/           Pure JS dithering engine (shared by both targets)
  web/            Browser app (HTML + ES modules)
  illustrator/
    src/           C++ plugin (entry point, SDK suites, webview panel, art creator)
    ui/            Plugin panel UI (bundled from core via esbuild)
    tools/         PiPL generator
    CMakeLists.txt
```

The core engine is pure math with zero DOM dependencies — import from `packages/core/` to use the dithering logic anywhere.

### Key Build Notes

- **Must use `xcodebuild`** — CMake's Xcode generator + `xcodebuild` is required. The build runs `RegisterExecutionPolicyException`, without which macOS blocks Illustrator from loading the binary.
- **Linker flag** — `-ld_classic` is required.
- **PiPL** — The plugin needs both `Dither.rsrc` (Rez-compiled) and `plugin.pipl` (Python tool), plus a `PkgInfo` file.
- **AppContext** — SDK calls from the WKWebView panel require wrapping with `PushAppContext`/`PopAppContext`.
- **Plugin cache** — After installing, delete the Illustrator plugin cache files or the old version may persist.

## Contributing

PRs welcome. Web app needs only esbuild. Plugin needs the Illustrator SDK + CMake.

## License

MIT
