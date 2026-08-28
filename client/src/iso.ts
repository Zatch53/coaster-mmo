export const TILE_W = 64;
export const TILE_H = 32;
export const LEVEL_H = 28;

export function gridToScreen(x: number, y: number, z: number) {
  return {
    sx: (x - y) * (TILE_W / 2),
    sy: (x + y) * (TILE_H / 2) - z * LEVEL_H,
  };
}

export function screenToGrid(sx: number, sy: number, z: number) {
  const a = (2 * sx) / TILE_W; // x - y
  const b = (2 * (sy + z * LEVEL_H)) / TILE_H; // x + y
  const x = Math.round((a + b) / 2);
  const y = Math.round((b - a) / 2);
  return { x, y };
}
