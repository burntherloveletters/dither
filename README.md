# Dither

Vector dither tool that converts images and gradients into scalable SVG patterns. Each dither cell becomes a vector shape — circles, squares, or diamonds — grouped by color, ready for Illustrator.

Available as a **[web app](https://dither.neato.fun)** and an **Adobe Illustrator plugin**.

## Features

- Load any image or generate gradients (linear, radial, conic, diagonal, noise)
- 9 dither patterns: Bayer 2×2/4×4/8×8, Halftone, Lines, Crosses, Dots, Grid, Scales
- Threshold or scaled (halftone) styles
- Circle, square, and diamond shapes
- 2–8 color palettes with presets (B/W, GameBoy, CGA, Sepia)
- Export SVG (vector, grouped by color) or PNG
- Drag-and-drop image loading
- `Cmd+S` / `Ctrl+S` to export SVG

## Illustrator Plugin

Requires Adobe Illustrator 28+ (CC 2024+) with UXP support.

Download the latest `.ccx` file from [Releases](../../releases) and double-click to install.

Creates native vector shapes directly on your artboard, grouped by color — fully editable in Illustrator.

## Development

```bash
npm install

# Run the web app locally
npm run dev

# Watch + rebuild the Illustrator plugin on save
npm run watch:illustrator
```

For the Illustrator plugin, use the [UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/installation/) to load `packages/illustrator/manifest.json` into Illustrator. Hit **Reload** after changes.

### Build

```bash
npm run build:web          # → dist/web/
npm run build:plugin       # → dist/dither-illustrator.ccx
npm run build              # both
```

### Structure

```
packages/
  core/           Pure JS dithering engine (shared by both targets)
  web/            Browser app (HTML + ES modules, no build step)
  illustrator/    UXP plugin (bundled with esbuild)
```

The core engine is pure math with zero DOM dependencies — if you want to use the dithering logic in another context, import from `packages/core/`.

## Contributing

PRs welcome. The only dev dependency is esbuild.

## License

MIT
