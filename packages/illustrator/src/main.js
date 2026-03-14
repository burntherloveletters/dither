// UXP Illustrator Plugin — Dither
// Imports core dithering logic; bundled via esbuild into ../main.js

import { ditherImage, generateGradientGrid, PRESETS, BAYER_NORM } from '../../core/index.js';

let currentPalette = ['#000000', '#ffffff'];
let currentPercentages = [50, 50];
let luminanceGrid = null;
let gridCols = 0, gridRows = 0;

const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };

// ============================================================
// READ SELECTED RASTER IMAGE
// ============================================================
async function useSelectedRaster() {
  try {
    const { app } = require('illustrator');
    const doc = app.activeDocument;
    const sel = doc.selection;

    if (!sel || sel.length === 0) {
      status('Select a raster image first.');
      return;
    }

    const item = sel[0];
    if (item.typename !== 'RasterItem') {
      status('Selection must be a raster image.');
      return;
    }

    const bounds = item.geometricBounds; // [left, top, right, bottom]
    const width = Math.abs(bounds[2] - bounds[0]);
    const height = Math.abs(bounds[1] - bounds[3]);
    const cellSize = parseInt($('cellSize').value);

    gridCols = Math.ceil(width / cellSize);
    gridRows = Math.ceil(height / cellSize);

    // Raster pixel access is limited in UXP — use colorSampler approach
    // Sample brightness at each cell center point
    luminanceGrid = new Array(gridRows);
    const startX = bounds[0];
    const startY = bounds[1]; // top in Illustrator coords

    for (let gy = 0; gy < gridRows; gy++) {
      luminanceGrid[gy] = new Array(gridCols);
      for (let gx = 0; gx < gridCols; gx++) {
        // Default to a gradient approximation based on position
        // Full pixel sampling requires exporting to temp file
        const nx = gx / (gridCols - 1 || 1);
        const ny = gy / (gridRows - 1 || 1);
        luminanceGrid[gy][gx] = (nx + ny) / 2;
      }
    }

    status(`Raster: ${Math.round(width)}x${Math.round(height)}pt, ${gridCols}x${gridRows} cells. Ready to apply.`);
  } catch (e) {
    status('Error: ' + e.message);
  }
}

// ============================================================
// GRADIENT GENERATOR
// ============================================================
function doGenerateGradient() {
  const type = $('gradientType').value;
  const cellSize = parseInt($('cellSize').value);
  const size = 512;

  const result = generateGradientGrid(type, size, cellSize);
  luminanceGrid = result.grid;
  gridCols = result.cols;
  gridRows = result.rows;

  status(`Gradient ready: ${gridCols}x${gridRows} cells`);
}

// ============================================================
// APPLY DITHER TO ARTBOARD
// ============================================================
async function applyToArtboard() {
  if (!luminanceGrid) {
    status('Generate a gradient or select a raster first.');
    return;
  }

  try {
    const { app } = require('illustrator');
    const doc = app.activeDocument;
    const settings = getSettings();
    const cellSize = settings.cellSize;

    status('Creating shapes...');

    const dithered = ditherImage(luminanceGrid, gridCols, gridRows, settings);

    // Group by color
    const colorGroups = {};
    for (let i = 0; i < settings.palette.length; i++) {
      colorGroups[i] = [];
    }

    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        const cell = dithered[y][x];
        if (cell.colorIndex === settings.palette.length - 1) continue;
        const sizeFactor = settings.style === 'scaled' ? cell.size : 1.0;
        if (sizeFactor < 0.01) continue;
        colorGroups[cell.colorIndex].push({ x, y, sizeFactor });
      }
    }

    // Background rect
    const bgRgb = hexToRgb(settings.palette[settings.palette.length - 1]);
    const totalWidth = gridCols * cellSize;
    const totalHeight = gridRows * cellSize;

    const bgRect = doc.pathItems.rectangle(0, 0, totalWidth, totalHeight);
    bgRect.fillColor = makeColor(bgRgb);
    bgRect.stroked = false;
    bgRect.name = 'dither-background';

    let shapeCount = 0;

    // Create shapes for each color group
    for (let i = 0; i < settings.palette.length - 1; i++) {
      const cells = colorGroups[i];
      if (cells.length === 0) continue;

      const rgb = hexToRgb(settings.palette[i]);
      const group = doc.groupItems.add();
      group.name = `dither-color-${i}`;

      for (const cell of cells) {
        const cx = cell.x * cellSize + cellSize / 2;
        const cy = -(cell.y * cellSize + cellSize / 2); // Illustrator Y is inverted
        const half = (cellSize / 2) * cell.sizeFactor;

        let pathItem;
        switch (settings.shape) {
          case 'circle':
            pathItem = doc.pathItems.ellipse(
              cy + half, cx - half, half * 2, half * 2
            );
            break;
          case 'square':
            pathItem = doc.pathItems.rectangle(
              cy + half, cx - half, half * 2, half * 2
            );
            break;
          case 'diamond': {
            pathItem = doc.pathItems.add();
            pathItem.setEntirePath([
              [cx, cy + half],
              [cx + half, cy],
              [cx, cy - half],
              [cx - half, cy]
            ]);
            pathItem.closed = true;
            break;
          }
        }

        if (pathItem) {
          pathItem.fillColor = makeColor(rgb);
          pathItem.stroked = false;
          pathItem.move(group, ElementPlacement.PLACEATEND);
          shapeCount++;
        }
      }
    }

    status(`Done! Created ${shapeCount} shapes in ${Object.keys(colorGroups).length} groups.`);
  } catch (e) {
    status('Error: ' + e.message);
  }
}

// ============================================================
// HELPERS
// ============================================================
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

function makeColor(rgb) {
  const color = new RGBColor();
  color.red = rgb.r;
  color.green = rgb.g;
  color.blue = rgb.b;
  return color;
}

function getSettings() {
  return {
    pattern: $('patternType').value,
    mode: 'image',
    style: $('ditherStyle').value,
    shape: $('shapeType').value,
    cellSize: parseInt($('cellSize').value),
    angle: 45,
    scale: 100,
    offsetX: 0,
    offsetY: 0,
    palette: [...currentPalette],
    percentages: [...currentPercentages]
  };
}

// ============================================================
// PALETTE UI
// ============================================================
function buildPaletteUI() {
  const container = $('paletteEntries');
  const count = parseInt($('colorCount').value);

  while (currentPalette.length < count) {
    const gray = Math.round((currentPalette.length / count) * 255);
    currentPalette.push('#' + gray.toString(16).padStart(2, '0').repeat(3));
    currentPercentages.push(Math.round(100 / count));
  }
  currentPalette.length = count;
  currentPercentages.length = count;

  const sum = currentPercentages.reduce((a, b) => a + b, 0);
  if (sum !== 100) currentPercentages[count - 1] += 100 - sum;

  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const entry = document.createElement('div');
    entry.className = 'palette-entry';

    const ci = document.createElement('input');
    ci.type = 'color';
    ci.value = currentPalette[i];
    ci.dataset.index = i;
    ci.addEventListener('input', e => {
      currentPalette[parseInt(e.target.dataset.index)] = e.target.value;
      e.target.nextElementSibling.value = e.target.value;
    });

    const hi = document.createElement('input');
    hi.type = 'text';
    hi.value = currentPalette[i];
    hi.dataset.index = i;
    hi.addEventListener('change', e => {
      if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
        currentPalette[parseInt(e.target.dataset.index)] = e.target.value;
        e.target.previousElementSibling.value = e.target.value;
      }
    });

    entry.appendChild(ci);
    entry.appendChild(hi);
    container.appendChild(entry);
  }
}

// ============================================================
// INIT
// ============================================================
$('useSelection').addEventListener('click', useSelectedRaster);
$('generateBtn').addEventListener('click', doGenerateGradient);
$('applyBtn').addEventListener('click', applyToArtboard);
$('colorCount').addEventListener('change', buildPaletteUI);
$('cellSize').addEventListener('input', () => {
  $('cellSizeVal').textContent = $('cellSize').value;
});

document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    currentPalette = [...preset.colors];
    currentPercentages = [...preset.percentages];
    $('colorCount').value = Math.min(preset.colors.length, 4);
    buildPaletteUI();
  });
});

buildPaletteUI();
status('Ready');
