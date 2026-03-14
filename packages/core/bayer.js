// Bayer threshold matrices for ordered dithering

export const BAYER = {
  2: [
    [0, 2],
    [3, 1]
  ],
  4: [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ],
  8: (() => {
    const b4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    const m = Array.from({length: 8}, () => new Array(8));
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const bx = x % 4, by = y % 4;
        const quad = (y < 4 ? 0 : 2) + (x < 4 ? 0 : 1);
        const offsets = [0, 2, 3, 1];
        m[y][x] = 4 * b4[by][bx] + offsets[quad];
      }
    }
    return m;
  })()
};

// Normalized to 0–1 range
export const BAYER_NORM = {};
for (const [size, matrix] of Object.entries(BAYER)) {
  const n = parseInt(size);
  const max = n * n;
  BAYER_NORM[size] = matrix.map(row => row.map(v => (v + 0.5) / max));
}
