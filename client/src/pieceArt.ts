import { Container, Graphics } from "pixi.js";
import { TILE_W, TILE_H, LEVEL_H } from "./iso";

interface Pt {
  x: number;
  y: number;
}

const T: Pt = { x: 0, y: -TILE_H / 2 };
const R: Pt = { x: TILE_W / 2, y: 0 };
const B: Pt = { x: 0, y: TILE_H / 2 };
const L: Pt = { x: -TILE_W / 2, y: 0 };

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const NE = mid(T, R);
const SE = mid(R, B);
const SW = mid(B, L);
const NW = mid(L, T);

const RAIL_COLOR_FALLBACK = 0xd9d9d9;
const TIE_COLOR = 0x5b4632;
const SUPPORT_COLOR = 0x50596b;

export function hexToInt(hex: string) {
  return parseInt(hex.replace("#", ""), 16);
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function quadPoint(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function quadTangent(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: 2 * mt * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * mt * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

function drawRailPath(
  g: Graphics,
  sample: (t: number) => Pt,
  tangent: (t: number) => Pt,
  color: number,
  alpha: number,
  segments = 12,
  tieCount = 5,
) {
  const railOffset = 3.2;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = sample(t);
    const tan = tangent(t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const px = -tan.y / len;
    const py = tan.x / len;
    left.push({ x: p.x + px * railOffset, y: p.y + py * railOffset });
    right.push({ x: p.x - px * railOffset, y: p.y - py * railOffset });
  }

  g.moveTo(left[0].x, left[0].y);
  for (const pt of left.slice(1)) g.lineTo(pt.x, pt.y);
  g.stroke({ color, width: 2.2, alpha });

  g.moveTo(right[0].x, right[0].y);
  for (const pt of right.slice(1)) g.lineTo(pt.x, pt.y);
  g.stroke({ color, width: 2.2, alpha });

  for (let i = 1; i < tieCount; i++) {
    const t = i / tieCount;
    const p = sample(t);
    const tan = tangent(t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const px = -tan.y / len;
    const py = tan.x / len;
    const half = 5.5;
    g.moveTo(p.x + px * half, p.y + py * half)
      .lineTo(p.x - px * half, p.y - py * half)
      .stroke({ color: TIE_COLOR, width: 2, alpha: alpha * 0.95 });
  }

  const endP = sample(1);
  const endTan = tangent(1);
  const elen = Math.hypot(endTan.x, endTan.y) || 1;
  const dx = endTan.x / elen;
  const dy = endTan.y / elen;
  const px = -dy;
  const py = dx;
  const arrowLen = 7;
  const arrowWidth = 5;
  const backX = endP.x - dx * arrowLen;
  const backY = endP.y - dy * arrowLen;
  g.moveTo(endP.x, endP.y)
    .lineTo(backX + px * arrowWidth * 0.5, backY + py * arrowWidth * 0.5)
    .lineTo(backX - px * arrowWidth * 0.5, backY - py * arrowWidth * 0.5)
    .closePath()
    .fill({ color: 0xffffff, alpha: alpha * 0.9 });
}

function straightEndpoints(rotation: number): [Pt, Pt] {
  return rotation % 2 === 0 ? [NW, SE] : [NE, SW];
}

function curveEndpoints(rotation: number): [Pt, Pt, Pt] {
  switch (rotation) {
    case 0:
      return [NW, T, NE];
    case 1:
      return [NE, R, SE];
    case 2:
      return [SE, B, SW];
    default:
      return [SW, L, NW];
  }
}

function drawSupportPost(container: Container, z: number, alpha: number) {
  if (z <= 0) return;
  const g = new Graphics();
  const height = z * LEVEL_H;
  g.moveTo(0, 8).lineTo(0, 8 + height).stroke({ color: SUPPORT_COLOR, width: 3, alpha: alpha * 0.9 });
  g.rect(-6, 6 + height, 12, 4).fill({ color: SUPPORT_COLOR, alpha: alpha * 0.9 });
  container.addChild(g);
}

function drawTrack(type: string, rotation: number, color: number, alpha: number): Graphics {
  const g = new Graphics();

  if (type === "track_curve") {
    const [p0, ctrl, p2] = curveEndpoints(rotation);
    drawRailPath(
      g,
      (t) => quadPoint(p0, ctrl, p2, t),
      (t) => quadTangent(p0, ctrl, p2, t),
      color,
      alpha,
    );
    return g;
  }

  const [a, b] = straightEndpoints(rotation);
  let p1 = { ...a };
  let p2 = { ...b };
  if (type === "track_up") p2 = { ...p2, y: p2.y - 14 };
  if (type === "track_down") p2 = { ...p2, y: p2.y + 14 };

  drawRailPath(
    g,
    (t) => lerp(p1, p2, t),
    () => ({ x: p2.x - p1.x, y: p2.y - p1.y }),
    color,
    alpha,
  );
  return g;
}

function drawStation(color: number, alpha: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.moveTo(-20, 4).lineTo(20, 4).stroke({ color: 0xbfc6cf, width: 7, alpha });
  g.moveTo(0, -22).lineTo(-18, -4).lineTo(18, -4).closePath().fill({ color, alpha });
  g.moveTo(0, -22).lineTo(-18, -4).lineTo(18, -4).closePath().stroke({ color: 0x1d1d1d, width: 1.5, alpha });
  g.rect(-13, -4, 2.5, 10).fill({ color: 0x2b2f36, alpha });
  g.rect(10.5, -4, 2.5, 10).fill({ color: 0x2b2f36, alpha });
  c.addChild(g);
  return c;
}

function drawFerrisWheel(color: number, alpha: number): Container {
  const c = new Container();
  const g = new Graphics();
  const cy = -16;
  const radius = 15;
  g.moveTo(-9, 6).lineTo(0, cy).lineTo(9, 6).stroke({ color: SUPPORT_COLOR, width: 2.5, alpha });
  g.circle(0, cy, radius).stroke({ color, width: 3, alpha });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    g.moveTo(0, cy).lineTo(Math.cos(angle) * radius, cy + Math.sin(angle) * radius).stroke({
      color,
      width: 1.4,
      alpha: alpha * 0.8,
    });
  }
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const cx = Math.cos(angle) * radius;
    const cyy = cy + Math.sin(angle) * radius;
    g.rect(cx - 2.5, cyy - 2.5, 5, 5).fill({ color: 0xffffff, alpha });
  }
  c.addChild(g);
  return c;
}

function drawCarousel(color: number, alpha: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.ellipse(0, 5, 15, 6).fill({ color: 0xbfc6cf, alpha });
  g.moveTo(-14, -8).lineTo(14, -8).lineTo(0, -26).closePath().fill({ color, alpha });
  g.moveTo(-14, -8).lineTo(14, -8).lineTo(0, -26).closePath().stroke({ color: 0x1d1d1d, width: 1.2, alpha });
  g.moveTo(0, -8).lineTo(0, 3).stroke({ color: 0x8a8f99, width: 2, alpha });
  g.moveTo(0, -26).lineTo(0, -32).stroke({ color: 0x8a8f99, width: 1.5, alpha });
  g.moveTo(0, -32).lineTo(6, -30).lineTo(0, -28).closePath().fill({ color: 0xffffff, alpha });
  c.addChild(g);
  return c;
}

function drawDropTower(color: number, alpha: number): Container {
  const c = new Container();
  const g = new Graphics();
  g.moveTo(0, 6).lineTo(0, -40).stroke({ color: SUPPORT_COLOR, width: 3.5, alpha });
  g.rect(-8, -14, 16, 7).fill({ color, alpha });
  g.rect(-8, -14, 16, 7).stroke({ color: 0x1d1d1d, width: 1, alpha });
  g.moveTo(0, -40).lineTo(0, -47).stroke({ color: SUPPORT_COLOR, width: 2, alpha });
  g.moveTo(0, -47).lineTo(5, -45.5).lineTo(0, -44).closePath().fill({ color: 0xffffff, alpha });
  c.addChild(g);
  return c;
}

export function buildPieceArt(type: string, rotation: number, colorHex: string, z: number, alpha = 1): Container {
  const container = new Container();
  const color = hexToInt(colorHex) || RAIL_COLOR_FALLBACK;

  drawSupportPost(container, z, alpha);

  if (type.startsWith("track")) {
    container.addChild(drawTrack(type, rotation, color, alpha));
  } else if (type === "station") {
    container.addChild(drawStation(color, alpha));
  } else if (type === "ferris_wheel") {
    container.addChild(drawFerrisWheel(color, alpha));
  } else if (type === "carousel") {
    container.addChild(drawCarousel(color, alpha));
  } else if (type === "drop_tower") {
    container.addChild(drawDropTower(color, alpha));
  } else {
    const g = new Graphics();
    g.circle(0, -8, 10).fill({ color, alpha });
    container.addChild(g);
  }

  return container;
}
