function pseudoNoise(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n & 0x7fffffff) / 0x7fffffff;
}

export function generateGradientGrid(type, size, cellSize, height, angle) {
  const cols = Math.ceil(size / cellSize);
  const rows = Math.ceil((height || size) / cellSize);
  const angleRad = ((angle || 0) * Math.PI) / 180;

  const grid = new Array(rows);
  for (let gy = 0; gy < rows; gy++) {
    grid[gy] = new Array(cols);
    for (let gx = 0; gx < cols; gx++) {
      const nx = gx / (cols - 1 || 1);
      const ny = gy / (rows - 1 || 1);

      let lum;
      switch (type) {
        case 'linear': {
          // Project position onto the angle vector, then normalize to 0–1
          const raw = nx * Math.cos(angleRad) + ny * Math.sin(angleRad);
          // Normalize based on the max possible projection for this angle
          const maxProj = Math.abs(Math.cos(angleRad)) + Math.abs(Math.sin(angleRad));
          lum = maxProj > 0 ? raw / maxProj : 0;
          break;
        }
        case 'radial': {
          const dx = nx - 0.5, dy = ny - 0.5;
          lum = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
          break;
        }
        case 'conic': {
          const a = Math.atan2(ny - 0.5, nx - 0.5) + angleRad;
          lum = ((a + Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
          break;
        }
        case 'noise':
          lum = pseudoNoise(gx, gy);
          break;
        default:
          lum = nx;
      }
      grid[gy][gx] = lum;
    }
  }

  return { grid, cols, rows };
}
