import { BAYER_NORM } from './bayer.js';
import { getPatternThreshold } from './patterns.js';

export function ditherImage(luminanceGrid, cols, rows, settings) {
  const { pattern, mode, style, cellSize, angle, scale: radialScale, offsetX, offsetY, palette, percentages } = settings;

  const result = new Array(rows);
  const angleRad = (angle * Math.PI) / 180;

  for (let y = 0; y < rows; y++) {
    result[y] = new Array(cols);
    for (let x = 0; x < cols; x++) {
      let brightness = luminanceGrid[y][x];

      const nx = x / cols;
      const ny = y / rows;

      if (mode === 'linear') {
        const gradient = (nx * Math.cos(angleRad) + ny * Math.sin(angleRad));
        brightness = brightness * 0.7 + gradient * 0.3;
        brightness = Math.max(0, Math.min(1, brightness));
      } else if (mode === 'radial') {
        const ox = offsetX / 100;
        const oy = offsetY / 100;
        const dx = nx - (0.5 + ox);
        const dy = ny - (0.5 + oy);
        const dist = Math.sqrt(dx * dx + dy * dy) * (radialScale / 100) * 2;
        brightness = brightness * 0.7 + dist * 0.3;
        brightness = Math.max(0, Math.min(1, brightness));
      }

      if (style === 'scaled') {
        const colorInfo = mapToColor(brightness, palette, percentages);
        result[y][x] = { colorIndex: colorInfo.index, size: 1 - brightness };
      } else {
        let threshold;
        if (pattern.startsWith('bayer')) {
          const n = parseInt(pattern.replace('bayer', ''));
          threshold = BAYER_NORM[n][y % n][x % n];
        } else {
          threshold = getPatternThreshold(pattern, x, y, Math.max(2, Math.floor(cellSize / 2)));
        }
        const adjusted = brightness + (threshold - 0.5) * 0.5;
        const colorInfo = mapToColor(Math.max(0, Math.min(1, adjusted)), palette, percentages);
        result[y][x] = { colorIndex: colorInfo.index, size: 1.0 };
      }
    }
  }

  return result;
}

export function mapToColor(brightness, palette, percentages) {
  const n = palette.length;
  const cumulative = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += percentages[i];
    cumulative.push(sum / 100);
  }

  for (let i = 0; i < n; i++) {
    if (brightness <= cumulative[i]) {
      return { index: i };
    }
  }
  return { index: n - 1 };
}
