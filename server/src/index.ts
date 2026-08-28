import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { nanoid } from "nanoid";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db/index.js";
import { pieces } from "./db/schema.js";
import { eq } from "drizzle-orm";
import type { ClientMessage, ServerMessage, PeerInfo, Piece } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "../public");

const PARK_ID = "main";
const PORT = Number(process.env.PORT ?? 8787);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/stats", (_req, res) => {
  const pieceCount = (db.select().from(pieces).where(eq(pieces.parkId, PARK_ID)).all() as Piece[]).length;
  res.json({ pieceCount, peerCount: clients.size });
});
app.post("/api/reset", (_req, res) => {
  db.delete(pieces).where(eq(pieces.parkId, PARK_ID)).run();
  broadcast({ kind: "reset" });
  res.json({ ok: true });
});

app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api|\/ws|\/health).*/, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

interface Client {
  ws: WebSocket;
  peer: PeerInfo;
}
const clients = new Map<string, Client>();

function broadcast(msg: ServerMessage, exceptId?: string) {
  const data = JSON.stringify(msg);
  for (const [id, client] of clients) {
    if (id === exceptId) continue;
    if (client.ws.readyState === client.ws.OPEN) client.ws.send(data);
  }
}

const placePieceSchema = z.object({
  type: z.string().min(1).max(64),
  x: z.number().int().min(-500).max(500),
  y: z.number().int().min(-500).max(500),
  z: z.number().int().min(0).max(50),
  rotation: z.number().int().min(0).max(3),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ownerName: z.string().min(1).max(32),
});

wss.on("connection", (ws) => {
  const peerId = nanoid(8);
  const peer: PeerInfo = { id: peerId, name: "Guest", color: "#888888" };
  clients.set(peerId, { ws, peer });

  const initMsg: ServerMessage = {
    kind: "init",
    pieces: db.select().from(pieces).where(eq(pieces.parkId, PARK_ID)).all() as Piece[],
    peers: [...clients.values()].map((c) => c.peer),
  };
  ws.send(JSON.stringify(initMsg));

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.kind === "place_piece") {
      const parsed = placePieceSchema.safeParse(msg.piece);
      if (!parsed.success) return;
      const piece: Piece = {
        id: nanoid(10),
        parkId: PARK_ID,
        createdAt: Date.now(),
        ...parsed.data,
      };
      db.insert(pieces).values(piece).run();
      broadcast({ kind: "piece_added", piece });
      return;
    }

    if (msg.kind === "remove_piece") {
      const id = String(msg.id);
      db.delete(pieces).where(eq(pieces.id, id)).run();
      broadcast({ kind: "piece_removed", id });
      return;
    }

    if (msg.kind === "cursor") {
      const name = String(msg.name).slice(0, 32) || "Guest";
      const color = /^#[0-9a-fA-F]{6}$/.test(msg.color) ? msg.color : "#888888";
      const client = clients.get(peerId);
      if (client) client.peer = { ...client.peer, name, color };
      broadcast(
        { kind: "cursor", peerId, x: Number(msg.x), y: Number(msg.y), name, color },
        peerId,
      );
    }
  });

  ws.on("close", () => {
    clients.delete(peerId);
    broadcast({ kind: "peer_left", peerId });
  });

  broadcast({ kind: "peer_joined", peer }, peerId);
});

httpServer.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT} (ws at /ws)`);
});
