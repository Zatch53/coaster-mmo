import { create } from "zustand";
import type { Piece, PeerInfo, PieceType } from "./types";

function randomColor() {
  const colors = ["#e63946", "#2a9d8f", "#f4a261", "#457b9d", "#e9c46a", "#9d4edd", "#ff6d00"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function loadIdentity() {
  const saved = localStorage.getItem("coaster-identity");
  if (saved) return JSON.parse(saved) as { name: string; color: string };
  const identity = { name: `Builder${Math.floor(Math.random() * 9000 + 1000)}`, color: randomColor() };
  localStorage.setItem("coaster-identity", JSON.stringify(identity));
  return identity;
}

interface RemoteCursor {
  x: number;
  y: number;
  name: string;
  color: string;
}

interface ParkState {
  connected: boolean;
  pieces: Map<string, Piece>;
  peers: Map<string, PeerInfo>;
  cursors: Map<string, RemoteCursor>;
  selectedType: PieceType;
  selectedRotation: number;
  selectedZ: number;
  selectedColor: string;
  identity: { name: string; color: string };

  setConnected: (v: boolean) => void;
  setInit: (pieces: Piece[], peers: PeerInfo[]) => void;
  addPiece: (p: Piece) => void;
  removePiece: (id: string) => void;
  setPeer: (p: PeerInfo) => void;
  removePeer: (id: string) => void;
  setCursor: (peerId: string, c: RemoteCursor) => void;
  setSelectedType: (t: PieceType) => void;
  rotateSelection: () => void;
  setSelectedZ: (z: number) => void;
  setSelectedColor: (c: string) => void;
  setIdentityName: (name: string) => void;
}

export const useParkStore = create<ParkState>((set, get) => ({
  connected: false,
  pieces: new Map(),
  peers: new Map(),
  cursors: new Map(),
  selectedType: "track_straight",
  selectedRotation: 0,
  selectedZ: 0,
  selectedColor: "#e63946",
  identity: loadIdentity(),

  setConnected: (v) => set({ connected: v }),
  setInit: (pieces, peers) =>
    set({
      pieces: new Map(pieces.map((p) => [p.id, p])),
      peers: new Map(peers.map((p) => [p.id, p])),
    }),
  addPiece: (p) => set((s) => ({ pieces: new Map(s.pieces).set(p.id, p) })),
  removePiece: (id) =>
    set((s) => {
      const next = new Map(s.pieces);
      next.delete(id);
      return { pieces: next };
    }),
  setPeer: (p) => set((s) => ({ peers: new Map(s.peers).set(p.id, p) })),
  removePeer: (id) =>
    set((s) => {
      const peers = new Map(s.peers);
      peers.delete(id);
      const cursors = new Map(s.cursors);
      cursors.delete(id);
      return { peers, cursors };
    }),
  setCursor: (peerId, c) => set((s) => ({ cursors: new Map(s.cursors).set(peerId, c) })),
  setSelectedType: (t) => set({ selectedType: t }),
  rotateSelection: () => set((s) => ({ selectedRotation: (s.selectedRotation + 1) % 4 })),
  setSelectedZ: (z) => set({ selectedZ: Math.max(0, Math.min(20, z)) }),
  setSelectedColor: (c) => set({ selectedColor: c }),
  setIdentityName: (name) => {
    const identity = { ...get().identity, name };
    localStorage.setItem("coaster-identity", JSON.stringify(identity));
    set({ identity });
  },
}));
