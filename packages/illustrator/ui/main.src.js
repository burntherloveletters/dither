// Dither — Illustrator Plugin UI
// Runs inside the WKWebView panel. Communicates with the C++ plugin
// via window.webkit.messageHandlers.dither.postMessage().

import { ditherImage, generateGradientGrid, PRESETS } from '../../core/index.js';

// ============================================================
// JS ↔ C++ BRIDGE
// ============================================================
let callId = 0;
const pending = {};

window._ditherResolve = (id, result) => {
  if (pending[id]) {
    pending[id](result);
    delete pending[id];
  }
};

function callPlugin(action, params = {}) {
  return new Promise(resolve => {
    const id = ++callId;
    pending[id] = resolve;
    window.webkit.messageHandlers.dither.postMessage(
      JSON.stringify({ id, action, params })
    );
  });
}

// ============================================================
// STATE
// ============================================================
let currentPalette = ['#000000', '#ffffff'];
let currentPercentages = [50, 50];
let luminanceGrid = null;
let gridCols = 0, gridRows = 0;

const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };

// ============================================================
// GRADIENT GENERATOR
// ============================================================
function getGradientDimensions() {
  const w = parseInt($('gradientWidth').value);
  const ratio = $('aspectRatio').value;
  if (ratio === 'custom') return { w, h: parseInt($('gradientHeight').value) };
  const [rw, rh] = ratio.split(':').map(Number);
  return { w, h: Math.round(w * rh / rw) };
}

function doGenerateGradient() {
  const type = $('gradientType').value;
  const { w, h } = getGradientDimensions();
  const cellSize = parseInt($('cellSize').value);
  const angle = parseInt($('gradAngle').value);
  const result = generateGradientGrid(type, w, cellSize, h, angle);
  luminanceGrid = result.grid;
  gridCols = result.cols;
  gridRows = result.rows;
  status(`Gradient ready: ${gridCols}×${gridRows} cells`);
}

// ============================================================
// APPLY DITHER TO ARTBOARD
// ============================================================
async function applyToArtboard() {
  if (!luminanceGrid) {
    status('Generate a gradient first.');
    return;
  }

  const settings = getSettings();
  const cellSize = settings.cellSize;

  status(`Dithering ${gridCols}x${gridRows} grid...`);
  const dithered = ditherImage(luminanceGrid, gridCols, gridRows, settings);

  // Group cells by color
  const colorGroups = {};
  for (let i = 0; i < settings.palette.length; i++) {
    colorGroups[i] = [];
  }

  let totalCells = 0;
  let bgCells = 0;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      totalCells++;
      const cell = dithered[y][x];
      if (cell.colorIndex === settings.palette.length - 1) { bgCells++; continue; }
      const sizeFactor = settings.style === 'scaled' ? cell.size : 1.0;
      if (sizeFactor < 0.01) continue;
      colorGroups[cell.colorIndex].push({ x, y, sizeFactor });
    }
  }

  let fgCount = 0;
  for (let i = 0; i < settings.palette.length - 1; i++) fgCount += colorGroups[i].length;
  status(`Dithered: ${totalCells} cells, ${bgCells} bg, ${fgCount} fg. Creating...`);

  if (fgCount === 0) {
    status(`Nothing to draw — all ${totalCells} cells are background color.`);
    return;
  }

  if (fgCount > 10000 && !confirm(`This will create ${fgCount.toLocaleString()} shapes, which may be very slow. Continue?`)) {
    status('Cancelled.');
    return;
  }

  try {

    // Background rect
    status('Creating background...');
    const totalW = gridCols * cellSize;
    const totalH = gridRows * cellSize;
    const bg = await callPlugin('createRect', { x: 0, y: 0, w: totalW, h: totalH });
    await callPlugin('setFill', {
      handle: bg.handle,
      color: settings.palette[settings.palette.length - 1]
    });

    let shapeCount = 0;

    for (let i = 0; i < settings.palette.length - 1; i++) {
      const cells = colorGroups[i];
      if (cells.length === 0) continue;

      status(`Color ${i + 1}: ${cells.length} shapes...`);
      const color = settings.palette[i];

      // Build flat array of [cx, cy, half] for batch creation
      const batchCells = cells.map(cell => {
        const cx = cell.x * cellSize + cellSize / 2;
        const cy = (gridRows - cell.y) * cellSize - cellSize / 2;
        const half = (cellSize / 2) * cell.sizeFactor;
        return [cx, cy, half];
      });

      const result = await callPlugin('batchCreate', {
        shape: settings.shape,
        color,
        cells: batchCells
      });

      if (result.count != null) {
        shapeCount += result.count;
      } else {
        status(`Batch failed: ${JSON.stringify(result)}`);
        return;
      }
    }

    status(`Done! ${shapeCount} shapes, grid ${gridCols}x${gridRows}`);
  } catch (e) {
    status('Error: ' + e.message);
  }
}

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
  return {
    pattern: $('patternType').value,
    mode: 'image',
    style: $('ditherStyle').value,
    shape: $('shapeType').value,
    cellSize: parseInt($('cellSize').value),
    angle: 45, scale: 100, offsetX: 0, offsetY: 0,
    palette: [...currentPalette],
    percentages: [...currentPercentages],
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
// CONNECTION CHECK
// ============================================================
async function checkBridge() {
  try {
    const result = await callPlugin('ping');
    if (result.ok) {
      status('Connected to Illustrator');
      $('applyBtn').disabled = false;
    }
  } catch {
    status('Bridge not available');
  }
}

// ============================================================
// INIT
// ============================================================
$('generateBtn').addEventListener('click', doGenerateGradient);
$('applyBtn').addEventListener('click', applyToArtboard);
$('colorCount').addEventListener('change', buildPaletteUI);
$('cellSize').addEventListener('input', () => {
  $('cellSizeVal').textContent = $('cellSize').value;
  doGenerateGradient();
});
for (const id of ['gradientType', 'aspectRatio', 'gradAngle', 'gradientWidth', 'gradientHeight']) {
  $(id).addEventListener('input', () => {
    $('gradientWidthVal').textContent = $('gradientWidth').value;
    $('gradientHeightVal').textContent = $('gradientHeight').value;
    $('gradAngleVal').textContent = $('gradAngle').value + '\u00B0';
    $('heightRow').classList.toggle('hidden', $('aspectRatio').value !== 'custom');
    const gt = $('gradientType').value;
    $('gradAngleRow').classList.toggle('hidden', gt === 'noise' || gt === 'radial');
    doGenerateGradient();
  });
}

document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    currentPalette = [...preset.colors];
    currentPercentages = [...preset.percentages];
    $('colorCount').value = preset.colors.length;
    buildPaletteUI();
  });
});

buildPaletteUI();
doGenerateGradient();
checkBridge();
