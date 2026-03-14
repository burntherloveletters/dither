import { BAYER_NORM } from './bayer.js';

export function getPatternThreshold(pattern, x, y, cellSize) {
  const n = parseInt(pattern.replace('bayer', ''));
  if (BAYER_NORM[n]) {
    return BAYER_NORM[n][y % n][x % n];
  }

  const nx = (x % cellSize) / cellSize;
  const ny = (y % cellSize) / cellSize;
  const cx = 0.5, cy = 0.5;

  switch (pattern) {
    case 'halftone': {
      const dx = nx - cx, dy = ny - cy;
      return Math.sqrt(dx * dx + dy * dy) * 1.414;
    }
    case 'lines':
      return ny;
    case 'crosses': {
      const distX = Math.abs(nx - cx);
      const distY = Math.abs(ny - cy);
      return Math.min(distX, distY) * 2;
    }
    case 'dots': {
      const dx = nx - cx, dy = ny - cy;
      return Math.sqrt(dx * dx + dy * dy) * 1.414;
    }
    case 'grid': {
      const distX = Math.abs(nx - cx);
      const distY = Math.abs(ny - cy);
      return Math.max(distX, distY) * 2;
    }
    case 'scales': {
      const sx = (nx * 2) % 1;
      const sy = (ny * 2) % 1;
      const dx = sx - 0.5, dy = sy - 0.5;
      return Math.sqrt(dx * dx + dy * dy) * 1.414;
    }
    default:
      return 0.5;
  }
}
