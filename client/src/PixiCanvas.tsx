import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useParkStore } from "./store";
import { gridToScreen, screenToGrid, TILE_W, TILE_H } from "./iso";
import { send } from "./ws";
import { buildPieceArt, hexToInt } from "./pieceArt";
import type { Piece } from "./types";

const GRID_RADIUS = 24;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const DRAG_THRESHOLD = 5;

function drawTileDiamond(g: Graphics, cx: number, cy: number, fill: number, alpha = 1, stroke = 0x1d1d1d) {
  g.moveTo(cx, cy - TILE_H / 2)
    .lineTo(cx + TILE_W / 2, cy)
    .lineTo(cx, cy + TILE_H / 2)
    .lineTo(cx - TILE_W / 2, cy)
    .closePath()
    .fill({ color: fill, alpha })
    .stroke({ color: stroke, width: 1, alpha: alpha * 0.8 });
}

export default function PixiCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    const app = new Application();

    const world = new Container();
    const gridLayer = new Container();
    const piecesLayer = new Container();
    const cursorLayer = new Container();
    const ghostLayer = new Container();

    let hoverX = 0;
    let hoverY = 0;
    let dragging = false;
    let dragStart = { x: 0, y: 0 };
    let worldStart = { x: 0, y: 0 };
    let moved = false;

    (async () => {
      await app.init({
        resizeTo: host,
        backgroundColor: 0x0f1620,
        antialias: true,
      });
      if (destroyed) {
        app.destroy(true, true);
        return;
      }
      host.appendChild(app.canvas);
      appRef.current = app;

      world.x = app.screen.width / 2;
      world.y = app.screen.height / 3;
      world.addChild(gridLayer, piecesLayer, ghostLayer, cursorLayer);
      app.stage.addChild(world);
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;

      // static grid
      const grid = new Graphics();
      for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
        for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
          const { sx, sy } = gridToScreen(x, y, 0);
          drawTileDiamond(grid, sx, sy, 0x18222f, 1, 0x22303f);
        }
      }
      gridLayer.addChild(grid);

      const ghostFootprint = new Graphics();
      const ghostArt = new Container();
      ghostLayer.addChild(ghostFootprint, ghostArt);

      function redrawGhost() {
        ghostFootprint.clear();
        ghostArt.removeChildren();
        const s = useParkStore.getState();
        const { sx, sy } = gridToScreen(hoverX, hoverY, s.selectedZ);
        drawTileDiamond(ghostFootprint, sx, sy, hexToInt(s.selectedColor), 0.25, 0xffffff);
        ghostArt.x = sx;
        ghostArt.y = sy;
        ghostArt.addChild(buildPieceArt(s.selectedType, s.selectedRotation, s.selectedColor, s.selectedZ, 0.6));
      }

      function redrawPieces() {
        piecesLayer.removeChildren();
        const s = useParkStore.getState();
        const ordered = [...s.pieces.values()].sort(
          (a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z,
        );
        for (const piece of ordered) {
          piecesLayer.addChild(renderPiece(piece));
        }
      }

      function renderPiece(piece: Piece) {
        const c = new Container();
        const { sx, sy } = gridToScreen(piece.x, piece.y, piece.z);
        c.x = sx;
        c.y = sy;
        c.addChild(buildPieceArt(piece.type, piece.rotation, piece.color, piece.z));

        const ownerTag = new Text({
          text: piece.ownerName,
          style: { fill: 0xcbd5e1, fontSize: 9 },
        });
        ownerTag.anchor.set(0.5, 0);
        ownerTag.y = 12;
        c.addChild(ownerTag);

        return c;
      }

      function redrawCursors() {
        cursorLayer.removeChildren();
        const s = useParkStore.getState();
        for (const [, cursor] of s.cursors) {
          const { sx, sy } = gridToScreen(cursor.x, cursor.y, 0);
          const wrap = new Container();
          wrap.x = sx;
          wrap.y = sy - 20;
          const dot = new Graphics();
          dot.circle(0, 0, 5).fill({ color: hexToInt(cursor.color) });
          wrap.addChild(dot);
          const label = new Text({ text: cursor.name, style: { fill: 0xffffff, fontSize: 10 } });
          label.anchor.set(0.5, 1);
          label.y = -8;
          wrap.addChild(label);
          cursorLayer.addChild(wrap);
        }
      }

      redrawPieces();
      redrawGhost();

      const unsubPieces = useParkStore.subscribe((s, prev) => {
        if (s.pieces !== prev.pieces) redrawPieces();
        if (
          s.selectedType !== prev.selectedType ||
          s.selectedRotation !== prev.selectedRotation ||
          s.selectedZ !== prev.selectedZ ||
          s.selectedColor !== prev.selectedColor
        )
          redrawGhost();
        if (s.cursors !== prev.cursors) redrawCursors();
      });

      let lastCursorSend = 0;
      app.stage.on("pointermove", (e) => {
        const local = world.toLocal(e.global);
        const s = useParkStore.getState();
        const { x, y } = screenToGrid(local.x, local.y, s.selectedZ);
        hoverX = x;
        hoverY = y;
        redrawGhost();

        if (dragging) {
          const dx = e.global.x - dragStart.x;
          const dy = e.global.y - dragStart.y;
          if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) moved = true;
          world.x = worldStart.x + dx;
          world.y = worldStart.y + dy;
        }

        const now = performance.now();
        if (now - lastCursorSend > 80) {
          lastCursorSend = now;
          send({ kind: "cursor", x, y, name: s.identity.name, color: s.identity.color });
        }
      });

      app.stage.on("pointerdown", (e) => {
        dragging = true;
        moved = false;
        dragStart = { x: e.global.x, y: e.global.y };
        worldStart = { x: world.x, y: world.y };
      });

      app.stage.on("pointerup", () => {
        dragging = false;
        if (!moved) {
          const s = useParkStore.getState();
          send({
            kind: "place_piece",
            piece: {
              type: s.selectedType,
              x: hoverX,
              y: hoverY,
              z: s.selectedZ,
              rotation: s.selectedRotation,
              color: s.selectedColor,
              ownerName: s.identity.name,
            },
          });
        }
      });

      app.stage.on("pointerupoutside", () => {
        dragging = false;
      });

      app.canvas.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        const s = useParkStore.getState();
        for (const piece of s.pieces.values()) {
          if (piece.x === hoverX && piece.y === hoverY && piece.z === s.selectedZ) {
            if (piece.ownerName === s.identity.name) {
              send({ kind: "remove_piece", id: piece.id });
            }
            break;
          }
        }
      });

      app.canvas.addEventListener(
        "wheel",
        (ev) => {
          ev.preventDefault();
          const factor = ev.deltaY > 0 ? 0.9 : 1.1;
          const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, world.scale.x * factor));
          world.scale.set(next);
        },
        { passive: false },
      );

      const handleResize = () => {
        app.stage.hitArea = app.screen;
      };
      window.addEventListener("resize", handleResize);

      (app as unknown as { __cleanup?: () => void }).__cleanup = () => {
        unsubPieces();
        window.removeEventListener("resize", handleResize);
      };
    })();

    return () => {
      destroyed = true;
      const app = appRef.current;
      if (app) {
        (app as unknown as { __cleanup?: () => void }).__cleanup?.();
        app.destroy(true, { children: true });
      }
      appRef.current = null;
    };
  }, []);

  return <div ref={hostRef} style={{ width: "100%", height: "100%" }} />;
}
